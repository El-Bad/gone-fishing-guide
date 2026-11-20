"""Snapshot a player's public gonefishing.gg profile into source/player/<id>.json.
build.py embeds it so the guide shows the profile even without the live proxy (serve.py).

    python scripts/fetch_player.py            # default player 98602
    python scripts/fetch_player.py 12345
"""
import json, sys, time, urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "source" / "player"
OUT.mkdir(parents=True, exist_ok=True)
PID = sys.argv[1] if len(sys.argv) > 1 else "98602"
API = "https://gonefishing.gg/api/"
UA = {"User-Agent": "Mozilla/5.0 (GONE Fishing field guide snapshot)"}


def get(path):
    with urllib.request.urlopen(urllib.request.Request(API + path, headers=UA), timeout=60) as r:
        return json.loads(r.read())


snap = {"profileId": PID, "fetchedAt": datetime.now(timezone.utc).isoformat(timespec="seconds")}
main = get(f"player/{PID}?include=recent,stats")
snap["player"], snap["recentCatches"], snap["fishStats"] = main["player"], main.get("recentCatches", []), main.get("fishStats", [])
snap["speciesAnalysis"] = get(f"player/{PID}?include=species-analysis").get("speciesAnalysis", [])
snap["gambles"] = get(f"player/{PID}?include=gambles").get("gambles", {})
catches, page = [], 1
while True:
    c = get(f"player/{PID}/catches?page={page}")
    catches += c.get("catches", [])
    if page >= (c.get("totalPages") or 1) or page >= 80:
        break
    page += 1; time.sleep(.3)
snap["catches"] = catches
snap["challenges"] = get("challenges").get("challenges", [])
(OUT / f"{PID}.json").write_text(json.dumps(snap, separators=(",", ":")), encoding="utf8")
print(f"{snap['player']['playername']}: {len(catches)} catches, {sum(1 for s in snap['speciesAnalysis'] if s['count'])} species -> source/player/{PID}.json")
