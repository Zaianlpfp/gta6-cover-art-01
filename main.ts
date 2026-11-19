// VICE COVER — make.fun gta6-cover-art-01 entrypoint.
//
// Copies app/ and screenshots/ from beside this file into /output
// (or $MAKEFUN_OUTPUT_DIR when set) and writes /output/dossier.json
// with buildDossier from vendor/makefun-app.ts. Node 22 standard
// library only, no build step, deterministic: two runs write the
// same bytes.
//
// NOTE: never delete OUTPUT_DIR itself. The grader runs as uid 65534
// with /output writable but its parent / not writable by that uid, so
// removing the directory itself throws EACCES and fails the run
// (round 1 was rejected exactly this way). Only clear the directory's
// contents, then recreate what we need inside it.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function copyTree(source, target) {
  if (!existsSync(source)) {
    throw new Error(`missing input directory: ${source}`);
  }
  cpSync(source, target, { recursive: true });
}

function clearContents(dir) {
  for (const entry of readdirSync(dir)) {
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
}

function main() {
  // Fail fast on a missing page: the gate requires app/index.html.
  if (!existsSync(join(REPO_ROOT, 'app', 'index.html'))) {
    throw new Error('missing app/index.html');
  }
  mkdirSync(OUTPUT_DIR, { recursive: true });
  clearContents(OUTPUT_DIR);
  copyTree(join(REPO_ROOT, 'app'), join(OUTPUT_DIR, 'app'));
  copyTree(join(REPO_ROOT, 'screenshots'), join(OUTPUT_DIR, 'screenshots'));
  const dossier = buildDossier(OUTPUT_DIR, DOSSIER_CAPS);
  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), dossier);
}

main();
