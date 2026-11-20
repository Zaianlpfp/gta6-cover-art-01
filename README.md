[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Zaianlpfp/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Zaianlpfp/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# VICE COVER v3 — GTA-style Cover Art Maker

Turn your own photos into a multi-panel, sunset-and-neon poster in the style of GTA 6 cover art: pick a layout, drop in one photo per panel (or one photo across all of them), crop and position each panel, pick a Vice City colour grade, and export a PNG in 1080×1080, 1080×1350 or 1920×1080. Everything runs offline in the browser — photos never leave your machine — and the design is fully original, with SIL-OFL fonts and AI-generated sample photos.

## What's in v3

- **Striped retro-chrome 3D titles** — a giant title (default "VICE HEAT") with a sunset/gold/pink/mint chrome gradient, horizontal stripe bands, a dark outline and stacked 3D depth, plus a glowing neon subtitle. Four chrome styles, three title positions (top / centre / bottom), adjustable size and letter spacing.
- **Role tags** — an editable archetype label on every panel (THE DRIVER, THE INSIDER, THE GETAWAY, THE RIDER, THE COURIER, THE FIXER), drawn as a slanted pill in the panel corner, with a show/hide toggle.
- **Full poster furniture** — a five-star quote bar ("EVERY FRAME FEELS LIKE THE LAST DAY OF SUMMER" — THE COASTLINE REVIEW), a VOL. 01 badge, a gold "ORIGINAL COVER ART" starburst seal, a drawn barcode, a billing block ("A GOLDEN HOUR PICTURES PRODUCTION · STARRING YOUR CREW · SHOT ON YOUR OWN PHONE · GRADED BY HAND"), a tagline strip ("THREE CARS · ONE SUNSET · NO TURNING BACK") and a COMING SOON pill. Every line is editable and every piece can be toggled off.
- **6 layouts, 6 grades** — Hero + Side, 2 × 2 Grid, Strip + Hero, Poster Mix, the new **Location Grid** (big hero left, four small panels right, each captioned with its own place · time · note) and Band + Trio; grades Sunset, Neon Night, Pastel Vice, Golden Hour, Magenta Dusk and Teal Noir. A **slanted cuts** toggle gives every layout diagonal panel edges.
- **3-size PNG export** — 1080×1080, 1080×1350 and 1920×1080, with the title, role tags and all furniture rendered into the exported file, exactly as previewed.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

## How it works

- `app/index.html` + `app/style.css` + `app/app.js` — the editor (layouts, grades, photo panels, caption controls, live canvas preview, PNG export).
- `app/samples/` — three AI-generated sample photos (boulevard sunset, golden-hour convertible, neon street couple) for one-click try-outs.
- `app/fonts/` — Bebas Neue + Anton, both SIL Open Font License 1.1 (see `app/fonts/NOTICE.txt`).
- `main.ts` — copies `app/` + `screenshots/` to `/output` and writes `dossier.json` via `vendor/makefun-app.ts`.
