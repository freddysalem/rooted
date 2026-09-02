// Renders the Rooted app mark (assets/source/rooted-mark.mjs) into every PNG the
// app manifest asks for. Run with `npm run icons` after editing the mark.
//
// Chrome does the rasterising because it is already on this machine for the
// screenshot harness - no image library to install.

import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mark, CREAM } from '../assets/source/rooted-mark.mjs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const here = dirname(fileURLToPath(import.meta.url));
const assets = resolve(here, '../assets');
const work = resolve(here, '../.icon-build');

const TARGETS = [
  { file: 'icon.png', size: 1024, opts: { background: true } },
  { file: 'splash-icon.png', size: 1024, opts: { background: false, scale: 0.86 } },
  // Android's adaptive icon: foreground art well inside the 66% safe circle, cream behind.
  { file: 'android-icon-foreground.png', size: 512, opts: { background: false, scale: 0.62 } },
  { file: 'android-icon-background.png', size: 512, opts: { flat: true } },
  { file: 'android-icon-monochrome.png', size: 432, opts: { background: false, mono: true, scale: 0.62 } },
  { file: 'favicon.png', size: 48, opts: { background: true } },
];

mkdirSync(work, { recursive: true });
for (const target of TARGETS) {
  const svg = target.opts.flat
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024"><rect width="1024" height="1024" fill="${CREAM}"/></svg>`
    : mark(target.opts);
  const page = `${work}/${target.file}.html`;
  writeFileSync(page, `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:transparent}
svg{display:block;width:${target.size}px;height:${target.size}px}</style>${svg}`);
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--default-background-color=00000000',
    `--window-size=${target.size},${target.size}`,
    `--screenshot=${assets}/${target.file}`,
    `file://${page}`,
  ], { stdio: 'ignore' });
  console.log(`${target.file}  ${target.size}x${target.size}`);
}
rmSync(work, { recursive: true, force: true });
