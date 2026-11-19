// VICE COVER — make.fun gta6-cover-art-01 entrypoint.
//
// Copies app/ and screenshots/ from beside this file into /output
// (or $MAKEFUN_OUTPUT_DIR when set) and writes /output/dossier.json
// with buildDossier from vendor/makefun-app.ts. Node 22 standard
// library only, no build step, deterministic: two runs write the
// same bytes.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
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
} as const;

function copyTree(source: string, target: string): void {
  if (!existsSync(source)) {
    throw new Error(`missing input directory: ${source}`);
  }
  cpSync(source, target, { recursive: true });
}

function main(): void {
  // Fail fast on a missing page: the gate requires app/index.html.
  if (!existsSync(join(REPO_ROOT, 'app', 'index.html'))) {
    throw new Error('missing app/index.html');
  }
  rmSync(OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });
  copyTree(join(REPO_ROOT, 'app'), join(OUTPUT_DIR, 'app'));
  copyTree(join(REPO_ROOT, 'screenshots'), join(OUTPUT_DIR, 'screenshots'));
  const dossier = buildDossier(OUTPUT_DIR, DOSSIER_CAPS);
  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), dossier);
}

main();
