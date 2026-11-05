"""Build data/game.json from the saved source snapshots in tools/.
Sources: Fandom 'List of heroes' (roles, lanes, specialties), Liquipedia hero pages (damage-type keyword counts
in ability text), mlbbhub.com /counter/<slug> pages (counter edges from Moonton GMS ranked data), mlbbhub item catalog."""
import json, re, os, glob
HERE = os.path.dirname(os.path.abspath(__file__))
fd = json.load(open(os.path.join(HERE, "src_fandom_heroes.json")))
lq = json.load(open(os.path.join(HERE, "src_liquipedia_damage.json")))
ctr_dir = os.path.join(HERE, "src_counters")
LANE = {"Gold Lane": "Gold", "EXP Lane": "EXP", "Mid Lane": "Mid", "Jungle": "Jungle", "Roaming": "Roam"}

def slug(n):
    s = n.lower().replace("'", "").replace(".", "-").replace(" ", "-")
    return re.sub(r"-+", "-", s)

def dmg(info):
    if not info: return "Tidak diketahui"
    p, m = info["phys"], info["mag"]
    if p == 0 and m == 0: return "Tidak diketahui"
    if p and m and min(p, m) / max(p, m) >= 0.5: return "Campuran"
    return "Physical" if p > m else "Magic"

names = {h["name"] for h in fd}
def parse_counters(name):
    f = os.path.join(ctr_dir, slug(name) + ".md")
    if not os.path.exists(f): return None, None, None
    t = open(f, encoding="utf-8").read()
    if not t.startswith("# "): return None, None, None
    def section(head):
        m = re.search(r"^## " + head + r".*?$(.*?)(?=^## |\Z)", t, re.M | re.S)
        out = []
        if not m: return out
        for line in m.group(1).splitlines():
            mm = re.match(r"- (.+?) \([^)]*\): \+([\d.]+) percentage points", line)
            if mm and mm.group(1) in names: out.append({"hero": mm.group(1), "edge": float(mm.group(2))})
        return out
    prov = re.search(r"patch ([\d.]+[a-z]?)", t)
    return section("Best picks against"), section("Heroes .* counters"), (prov.group(1) if prov else None)

heroes, patches = [], set()
for h in sorted(fd, key=lambda x: x["name"]):
    by, beats, patch = parse_counters(h["name"])
    if patch: patches.add(patch)
    heroes.append({
        "name": h["name"], "title": h["title"], "roles": h["roles"],
        "lanes": [LANE.get(l, l) for l in h["lanes"]], "specialties": h["specialties"],
        "region": h["region"], "release": h["release"],
        "dmg": dmg(lq.get(h["name"])),
        "counteredBy": by, "counters": beats,
        "src": "https://mlbbhub.com/counter/" + slug(h["name"]),
        "wiki": "https://liquipedia.net/mobilelegends/" + h["name"].replace(" ", "_"),
    })
data = json.load(open(os.path.join(HERE, "static_content.json"), encoding="utf-8"))
data["heroes"] = heroes
data["counterPatches"] = sorted(patches)
os.makedirs(os.path.join(HERE, "..", "data"), exist_ok=True)
json.dump(data, open(os.path.join(HERE, "..", "data", "game.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
withc = sum(1 for h in heroes if h["counteredBy"])
print(len(heroes), "heroes;", withc, "with counter data; patches", patches)
