# MLBB Companion — iPhone web app (PWA)

Static, installable companion for Mobile Legends: Bang Bang. No server, no API keys, no AI.
Live: https://elchto.github.io/mlbb-companion/ · Install: open in Safari → Share → **Add to Home Screen**.

## Features (tabs)
- **Hero**: 133 heroes with roles, lane(s), specialties, damage type, searchable; filter by lane and role. Per-hero counters with source link.
- **Draft**: pick up to 5 enemies + 4 allies → enemy damage balance (Physical/Magic/Mixed), sourced counter suggestions
  (aggregated "best picks against" lists), rule-based item advice, ally lane/role gaps.
- **Item**: adaptive item groups (anti-heal, Magic/Physical Defense, anti-crit, anti-burst, penetration vs tanks, anti-CC), clearly labelled general guidance.
- **Timer**: tap-to-start countdowns for Turtle, Lord (with the 18:00 variants) and both teams' Purple/Red buffs. Alerts at 30s/10s/spawn
  (sound + flashing card; vibration only where the browser supports it, which iPhone Safari does not). Timers survive app switching (stored as end timestamps).
- **Jungle**: clearing priorities, buff priority, first rotations, Turtle/Lord checklist, 6-question rotation checklist.
- **Keputusan**: BEST DECISION / WHY / RISK / ALTERNATIVE / NEXT MOVE card (saved locally, copyable), 8 quick commands, golden rule.

## Data sources (snapshot 5 Nov 2026, patch 2.2.16a, Season 42)
| Data | Source | How |
|---|---|---|
| Hero list (133), roles, lanes, specialties, region, release | [MLBB Fandom: List of heroes](https://mobile-legends.fandom.com/wiki/List_of_heroes) | MediaWiki API, `tools/src_fandom_heroes.json` |
| Hero list + lane cross-check (133, every Liquipedia lane matches a Fandom lane) | [Liquipedia: Portal:Heroes](https://liquipedia.net/mobilelegends/Portal:Heroes) | MediaWiki API |
| Damage type (Physical/Magic/Campuran) | Liquipedia hero pages: count of "Physical Damage" vs "Magic Damage" in ability text | Heuristic, `tools/src_liquipedia_damage.json`. Mixed = both types with ratio ≥ 0.5 |
| Counters ("Kuat melawan X" / "X kuat melawan") | [MLBBHub /counter/&lt;hero&gt;](https://mlbbhub.com/counter) — edges in win-rate percentage points from Moonton's official GMS ranked data, patch 2.2.16a | `tools/src_counters/*.md` (top ~5-6 per direction per hero) |
| Item names, costs, effects | [MLBBHub item catalog](https://mlbbhub.com/items) (read from game files, 2026-11-05) | `tools/src_mlbbhub_items.md` |
| Objective timers | [Fandom Turtle](https://mobile-legends.fandom.com/wiki/Turtle), [Fandom Lord](https://mobile-legends.fandom.com/wiki/Lord), [MLBBDex timer](https://mlbbdex.com/en/tools/timer), [METAMMO jungle guide](https://metammo.com/mobile-legends-guide/guides/jungle-routes-and-objective-timers), [MLBBHub map](https://mlbbhub.com/map) | Manually in `tools/static_content.json` |
| Jungle guide | METAMMO + MLBBDex (general guidance) | Text in `app.js` |

Known uncertainties: Lord respawn after 18:00 (120s vs 150s; the app lets you pick), first buff spawn (0:20/0:25/0:30 across sources),
damage type is a text heuristic, counters only cover each hero's top listed matchups, and item advice is rule-based general guidance.
The golden rule text was written for this app (`goldenRule` in `tools/static_content.json`).

## Update the data
```
python3 tools/build_data.py        # rebuilds data/game.json from tools/src_* + tools/static_content.json
python3 -m json.tool data/game.json >/dev/null && node --check app.js && node --check sw.js
git pull --rebase && git add -A && git commit -m "data: update" && git push
```
To refresh sources: re-download Fandom `List_of_heroes`, Liquipedia hero pages, `https://mlbbhub.com/counter/<slug>` (send `Accept: text/markdown`,
1 request/second) and `https://mlbbhub.com/md/items`, then rebuild. Edit `asOf`/`patch` in `tools/static_content.json`.
If you change `index.html`, `app.js`, `app.css` or icons, bump `VERSION` in `sw.js`.

Fan-made, not affiliated with Moonton. Untuk analisis screenshot, tanya MLBB Ultimate Pro Coach di Grok Bot.
