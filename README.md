[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Zaianlpfp/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Zaianlpfp/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# VICE COVER — GTA-style Cover Art Maker

Turn your own photos into a multi-panel, sunset-and-neon poster in the style of GTA 6 cover art: pick a layout, drop in one photo per panel (or one photo across all of them), crop and position each panel, pick a Vice City colour grade, write a big bold caption, and export a PNG in 1080×1080, 1080×1350 or 1920×1080. Everything runs offline in the browser — photos never leave your machine — and the design is fully original, with SIL-OFL fonts and AI-generated sample photos.

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
