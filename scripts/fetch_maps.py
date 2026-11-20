"""Download map images, markers and depth heatmaps from the gonefishing.gg interactive map and build:
  source/maps/<id>.webp        2500px top-down map (stitched from zoom-1 tiles)
  source/maps/<id>-depth.webp  smoothed depth chart overlay (2000px, transparent)
  source/maps/maps.json        markers in % of the image
Raw downloads are cached in source/maps/raw/; pass --refresh to download again.

World->image transform is the site's own calibration (pixel space 0..10000, inverse of an affine)."""
import io, json, sys, urllib.request
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import zoom, gaussian_filter, binary_erosion, binary_dilation, binary_fill_holes

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "source" / "maps"
RAW = OUT / "raw"
RAW.mkdir(parents=True, exist_ok=True)
REFRESH = "--refresh" in sys.argv
UA = {"User-Agent": "Mozilla/5.0 (fan guide map fetch)"}
BASE = "https://gonefishing.gg"
MAPS = {  # guide id: (site id, tile folder)
    "lake": ("the-lake", "TheLake"), "jungle": ("the-jungle", "TheJungle"), "swamp": ("the-swamp", "TheSwamp"),
    "canyon": ("the-canyons", "TheCanyons"), "arctic": ("the-arctic", "TheArctic")}
# pixel -> world affine, copied from the site's map explorer
CAL = {
 "the-lake": dict(ax=6.2149, ay=-.00769, bx=.02219, by=6.1889, cx=-24103.6, cy=-19346),
 "the-canyons": dict(ax=11.533540935366318, ay=-.02805048689798828, bx=-.018813078867083277, by=11.50680765193157, cx=-12273.818390804343, cy=-27057.73353155004),
 "the-swamp": dict(ax=11.215095490489983, ay=-.014471909312340436, bx=-.05988141986953632, by=11.177185726997578, cx=-53897.81263221703, cy=-42024.39086278273),
 "the-jungle": dict(ax=9.362363624897519, ay=.10933551953921523, bx=.022387589077381666, by=9.398099682579723, cx=-47391.29816064407, cy=-10112.34241449624),
 "the-arctic": dict(ax=10.174784193159674, ay=-.0022103329658857973, bx=-.016958097946627504, by=10.18410772364518, cx=-67517.22582287056, cy=-75290.5121408237)}
N = 1000  # overlay resolution
# depth bands -> colour + opacity (kept in sync with DBANDS in template.html). Shallow stays faint so the map shows through.
BANDS = [(500, (186, 230, 253), .22), (1000, (125, 211, 252), .34), (2000, (56, 189, 248), .46), (2500, (37, 99, 235), .56),
         (3500, (250, 204, 21), .62), (4500, (245, 158, 11), .68), (6000, (239, 68, 68), .74), (10**9, (190, 24, 93), .80)]
BOLD = {2500, 4500}


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return r.read()


def cached(name, url):
    p = RAW / name
    if REFRESH or not p.exists():
        p.write_bytes(get(url))
    return p.read_bytes()


def w2p(site, x, y):
    c = CAL[site]; det = c["ax"] * c["by"] - c["ay"] * c["bx"]
    u, v = x - c["cx"], y - c["cy"]
    return ((c["by"] * u - c["ay"] * v) / det, (-c["bx"] * u + c["ax"] * v) / det)  # 0..10000


out = {}
for gid, (site, folder) in MAPS.items():
    # --- base image
    img = Image.new("RGB", (2500, 2500))
    for x in (0, 1):
        for y in (0, 1):
            t = Image.open(io.BytesIO(cached(f"{folder}-1-{x}-{y}.webp", f"{BASE}/images/Maps/pyramid/{folder}/1/{x}-{y}.webp"))).convert("RGB")
            img.paste(t, (x * 1250, y * 1250))
    img.save(OUT / f"{gid}.webp", quality=78, method=6)
    # land/water mask: anything that isn't the black void around the map
    small = np.asarray(img.resize((N, N), Image.Resampling.BILINEAR)).astype(float)
    onmap = binary_erosion(binary_fill_holes(gaussian_filter(small.max(-1), 2) > 7), iterations=2)

    # --- markers
    pts = json.loads(cached(f"{site}-points.json", f"{BASE}/api/map-points?map_id={site}"))["points"]
    markers = []
    for p in pts:
        px, py = w2p(site, p["world"]["x"], p["world"]["y"])
        markers.append({"l": p["label"].strip(), "c": p["category"], "x": round(px / 100, 2), "y": round(py / 100, 2)})

    # --- depth: weighted, smoothed field of the deepest catch per cell
    dh = json.loads(cached(f"{site}-depth.json", f"{BASE}/api/depth-heatmap?map_id={site}"))
    g = dh["gridSize"]
    W = np.zeros((N, N)); WV = np.zeros((N, N)); cellpx = []
    for c in dh["cells"]:
        x0, y0 = w2p(site, c["gridX"] * g, c["gridY"] * g)
        x1, y1 = w2p(site, (c["gridX"] + 1) * g, (c["gridY"] + 1) * g)
        a, b = sorted((x0 / 10, x1 / 10)); cc, d = sorted((y0 / 10, y1 / 10))
        cellpx.append(b - a)
        ia, ib, ic, id_ = int(max(0, a)), int(min(N, np.ceil(b))), int(max(0, cc)), int(min(N, np.ceil(d)))
        if ia >= ib or ic >= id_:
            continue
        w = min(c["catchCount"], 8) ** .5  # trust busier cells more, but don't let one hotspot dominate
        v = .65 * c["maxDepth"] + .35 * c["avgDepth"]  # deepest you can expect, damped against single outliers
        W[ic:id_, ia:ib] += w; WV[ic:id_, ia:ib] += w * v
    sig = max(2.0, float(np.median(cellpx)) * .9)
    # adaptive smoothing: local detail where there's lots of data, wide average where it's sparse
    bw, bwv = gaussian_filter(W, sig), gaussian_filter(WV, sig)
    bwL, bwvL = gaussian_filter(W, sig * 3), gaussian_filter(WV, sig * 3)
    field = (bwv + .35 * bwvL) / np.maximum(bw + .35 * bwL, 1e-9)
    cover = gaussian_filter((W > 0).astype(float), sig * 1.6)
    alpha = np.clip((cover - .12) / .3, 0, 1) * onmap
    alpha = gaussian_filter(alpha, 1.2)
    # band + draw contours at 2x so edges stay crisp when zoomed in
    field, alpha = zoom(field, 2, order=1), np.clip(zoom(alpha, 2, order=1), 0, 1)
    band = np.digitize(field, [lim for lim, _, _ in BANDS[:-1]])
    rgb = np.array([c for _, c, _ in BANDS], float)[band]
    a = np.array([o for _, _, o in BANDS])[band] * alpha
    # contour lines on every band edge, bold at the 2,500 / 4,500 thresholds
    for i, (lim, _, _) in enumerate(BANDS[:-1]):
        m = band > i
        edge = (m & ~binary_erosion(m)) & (alpha > .3)
        bold = lim in BOLD
        if bold:
            edge = binary_dilation(edge) & (alpha > .3)
        rgb[edge] = (255, 255, 255) if bold else rgb[edge] * .55 + 255 * .45
        a[edge] = np.maximum(a[edge], .9 if bold else .5) * np.clip(alpha[edge] * 1.4, 0, 1)
    over = np.dstack([rgb.astype(np.uint8), (np.clip(a, 0, 1) * 255).astype(np.uint8)])
    Image.fromarray(over, "RGBA").save(OUT / f"{gid}-depth.webp", quality=85, alpha_quality=90, method=6)

    # --- deepest spot: deepest point of a broader smoothing, only where well sampled and on the map
    bw2, bwv2 = gaussian_filter(W, sig * 2.2), gaussian_filter(WV, sig * 2.2)
    f2 = np.where(bw2 > 1e-6, bwv2 / np.maximum(bw2, 1e-6), 0)
    dense = (bw2 >= np.percentile(bw2[bw2 > 1e-6], 60)) & onmap
    if dense.any():
        iy, ix = np.unravel_index(np.argmax(np.where(dense, f2, -1)), f2.shape)
        markers.append({"l": f"Deepest water (~{int(round(f2[iy, ix], -2)):,} depth)", "c": "depth", "x": round(ix / 10, 2), "y": round(iy / 10, 2)})
    out[gid] = {"markers": markers}
    print(f"{gid}: {len(markers)} markers, deepest ~{int(f2[iy, ix])} at {ix/10:.1f}%,{iy/10:.1f}%, overlay {(OUT / f'{gid}-depth.webp').stat().st_size // 1024} KB")

(OUT / "maps.json").write_text(json.dumps(out, separators=(",", ":")), encoding="utf8")
print("maps.json", (OUT / "maps.json").stat().st_size // 1024, "KB")
