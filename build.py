"""Inline data.js + map images/markers into template.html -> GONE-Fishing-Field-Guide.html (single self-contained file).
Map assets come from scripts/fetch_maps.py (source/maps/)."""
import base64, json
from pathlib import Path
here = Path(__file__).parent
html = (here / "template.html").read_text(encoding="utf8")
data = (here / "data.js").read_text(encoding="utf8")
mdir = here / "source" / "maps"
uri = (lambda p, t: f"data:{t};base64," + base64.b64encode(p.read_bytes()).decode())
maps = json.loads((mdir / "maps.json").read_text(encoding="utf8"))
img = {k: uri(mdir / f"{k}.webp", "image/webp") for k in maps}
dep = {k: uri(mdir / f"{k}-depth.webp", "image/webp") for k in maps}
mapjs = f"const MAPDATA = {json.dumps(maps, separators=(',', ':'))};\nconst MAPIMG = {json.dumps(img)};\nconst MAPDEPTH = {json.dumps(dep)};\n"
pdir = here / "source" / "player"
# a player snapshot is only embedded on request (python build.py --with-player): the hosted guide reads live data
import sys
snaps = sorted(pdir.glob("*.json"), key=lambda p: p.stat().st_mtime) if pdir.exists() and "--with-player" in sys.argv else []
mapjs += "const PLAYER_SNAPSHOT = " + (snaps[-1].read_text(encoding="utf8") if snaps else "null") + ";\n"
for ph in ("/*__DATA__*/", "/*__MAPS__*/"):
    assert ph in html, ph
html = html.replace("/*__DATA__*/", data).replace("/*__MAPS__*/", mapjs)
out = here / "GONE-Fishing-Field-Guide.html"
out.write_text(html, encoding="utf8")
print(f"built {out.name} ({out.stat().st_size // 1024} KB)")
