#!/usr/bin/env node
// Screenshot harness for the web build.
//
// Drives the app in headless Chrome over the DevTools protocol, seeds a garden straight
// into storage, taps through a list of steps and writes PNGs. Nothing is installed: it
// uses Chrome from /Applications and two packages Expo already pulls in.
//
//   npm run shots                       full walkthrough, mobile + desktop, into shots/<timestamp>
//   npm run shots -- --out shots/before full walkthrough into a named folder
//   node scripts/screenshots.mjs --device mobile --garden small tap:Discover shot:discover
//
// Steps:  shot:name | tap:Text | tapfuzzy:Text | tapxy:x,y | type:Placeholder=text
//         scroll:px | wait:ms | text   (dumps the page text, handy when a tap misses)
// Devices: mobile (375x812, touch) | desktop (1280x900) | both
// Gardens: empty | small | big
//
// Start the web server first:  npx expo start --web --port 8110

import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, '..', 'package.json'));
const chromeLauncher = require('chrome-launcher');
const WebSocket = require('ws');

// --- arguments ---------------------------------------------------------------

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const value = args[i + 1];
  args.splice(i, 2);
  return value;
};
const baseUrl = option('url', 'http://localhost:8110');
const deviceArg = option('device', 'both');
const gardenArg = option('garden', null);
const outDir = resolve(option('out', join('shots', new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-'))));
const steps = args;
mkdirSync(outDir, { recursive: true });

// --- Chrome over CDP ---------------------------------------------------------

const chrome = await chromeLauncher.launch({
  chromeFlags: ['--headless=new', '--hide-scrollbars', '--no-first-run', '--disable-gpu'],
});
const page = (await (await fetch(`http://localhost:${chrome.port}/json`)).json()).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false });
await new Promise((r) => ws.once('open', r));

let id = 0;
const pending = new Map();
const problems = [];
ws.on('message', (raw) => {
  const msg = JSON.parse(raw);
  if (msg.id && pending.has(msg.id)) {
    const { resolve: ok, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : ok(msg.result);
  } else if (msg.method === 'Runtime.consoleAPICalled' && (msg.params.type === 'error' || msg.params.type === 'warning')) {
    problems.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300));
  } else if (msg.method === 'Runtime.exceptionThrown') {
    problems.push('EXCEPTION ' + (msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text).slice(0, 400));
  }
});
const send = (method, params = {}) =>
  new Promise((ok, reject) => {
    const msgId = ++id;
    pending.set(msgId, { resolve: ok, reject });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const evaluate = async (expression) => {
  const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails));
  return res.result.value;
};
await send('Runtime.enable');
await send('Page.enable');

// --- device, input, capture --------------------------------------------------

let device = 'mobile';
async function setDevice(kind) {
  device = kind;
  const mobile = kind === 'mobile';
  await send('Emulation.setDeviceMetricsOverride', {
    width: mobile ? 375 : 1280, height: mobile ? 812 : 900, deviceScaleFactor: 2, mobile,
  });
  await send('Emulation.setTouchEmulationEnabled', { enabled: mobile });
}

async function tapAt(x, y) {
  if (device === 'mobile') {
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  }
  await sleep(500);
}

// Centre of the innermost visible element whose text matches.
const centreOf = (text, fuzzy = false) => evaluate(`(() => {
  const els = [...document.querySelectorAll('div,span,button,a,p')].filter((e) => {
    const t = (e.innerText || '').trim();
    const hit = ${fuzzy} ? t.includes(${JSON.stringify(text)}) : t === ${JSON.stringify(text)};
    return hit && e.getClientRects().length && e.getBoundingClientRect().height > 0;
  });
  els.sort((a, b) => a.querySelectorAll('*').length - b.querySelectorAll('*').length);
  const r = els[0]?.getBoundingClientRect();
  return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
})()`);

async function tap(text, fuzzy = false) {
  const c = await centreOf(text, fuzzy);
  if (!c) throw new Error(`nothing on screen reads "${text}"`);
  await tapAt(c.x, c.y);
}

async function typeInto(placeholder, text) {
  const ok = await evaluate(`(() => {
    const el = [...document.querySelectorAll('input,textarea')].find((i) => i.placeholder === ${JSON.stringify(placeholder)});
    if (!el) return false;
    el.focus();
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(text)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
  if (!ok) throw new Error(`no field with placeholder "${placeholder}"`);
  await sleep(300);
}

async function scrollTo(y) {
  await evaluate(`(() => {
    [...document.querySelectorAll('*')].filter((el) => {
      const s = getComputedStyle(el);
      return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
    }).forEach((el) => { el.scrollTop = ${Number(y)}; });
  })()`);
  await sleep(300);
}

let counter = 0;
async function shot(name) {
  await sleep(400);
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  const file = join(outDir, `${String(++counter).padStart(2, '0')}-${device}-${name}.png`);
  writeFileSync(file, Buffer.from(data, 'base64'));
  console.log('wrote', file);
}

// --- gardens -----------------------------------------------------------------

const day = 86400000;
const iso = (daysAgo) => new Date(Date.now() - daysAgo * day).toISOString();
const plant = (id, speciesID, nickname, plot, plantedDaysAgo, wateredDaysAgo, heights = [], notes = '') => ({
  id, speciesID, nickname, plantedOn: iso(plantedDaysAgo),
  lastWatered: wateredDaysAgo === null ? null : iso(wateredDaysAgo),
  wateringCount: 3, plot, heights, notes,
});
const GARDENS = {
  empty: null,
  small: {
    plantings: [
      plant('a1', 'radish', 'Speedy', 0, 10, 0),
      plant('a2', 'tomato', 'Big Red', 1, 40, 5, [
        { id: 'h1', date: iso(30), centimetres: 12 },
        { id: 'h2', date: iso(15), centimetres: 31 },
        { id: 'h3', date: iso(2), centimetres: 58 },
      ], 'Fed with comfrey tea on Tuesday. Two trusses set.'),
      plant('a3', 'mint', 'Minty', 2, 20, 1),
    ],
    earnedBadgeIDs: ['first_sprout', 'pollinator'],
    hasSurveyedSun: false,
    streak: { days: 3, best: 5, lastQualified: null },
    plantsEverGrown: 3,
    homeColour: 'red',
  },
  big: {
    plantings: [
      plant('b1', 'radish', 'Radish', 0, 26, 0), plant('b2', 'tomato', 'Tomato', 1, 70, 4),
      plant('b3', 'mint', 'Mint', 2, 50, 0), plant('b4', 'sunflower', 'Sunny', 3, 60, 0),
      plant('b5', 'carrot', 'Carrots', 4, 30, 3), plant('b6', 'courgette', 'Courgette', 5, 45, 0),
      plant('b7', 'runnerbean', 'Beans', 6, 40, 0), plant('b8', 'lettuce', 'Lettuce', 7, 15, 2),
      plant('b9', 'garlic', 'Garlic', 8, 90, 0), plant('b10', 'cabbage', 'Cabbage', 9, 55, 0),
      plant('b11', 'strawberry', 'Strawbs', 10, 100, 0), plant('b12', 'apple', 'Apple', 11, 200, 0),
    ],
    earnedBadgeIDs: ['first_sprout', 'five_plants', 'full_plot', 'faithful', 'measured', 'sun_seeker', 'variety', 'pollinator'],
    hasSurveyedSun: true,
    streak: { days: 30, best: 30, lastQualified: null },
    plantsEverGrown: 12,
    homeColour: 'sage',
  },
};

async function load(garden) {
  await send('Page.navigate', { url: baseUrl });
  await sleep(3500);
  if (GARDENS[garden]) {
    await evaluate(`localStorage.setItem('plantpartner.garden.v1', ${JSON.stringify(JSON.stringify(GARDENS[garden]))})`);
  } else {
    await evaluate('localStorage.clear()');
  }
  await send('Page.navigate', { url: baseUrl });
  await sleep(3500);
}

// --- the scripted walkthrough ------------------------------------------------

const WALKTHROUGH = {
  empty: [
    'shot:allotment-empty', 'tap:Plant something', 'shot:add-plant-list',
    'type:Search plants=rad', 'shot:add-plant-search', 'tap:Radish', 'shot:add-plant-selected',
    'tapfuzzy:Plant Radish', 'wait:400', 'shot:add-plant-planted', 'wait:1400', 'shot:allotment-first-plant',
    'tap:Discover', 'shot:discover', 'scroll:600', 'shot:discover-scrolled',
    'tap:Sun spot', 'wait:1200', 'shot:sunspot', 'scroll:500', 'shot:sunspot-scrolled', 'scroll:1200', 'shot:sunspot-bottom',
    'tap:Badges', 'shot:badges-one',
  ],
  small: [
    'shot:allotment-small', 'tap:Big Red', 'wait:600', 'shot:detail-top', 'scroll:420', 'shot:detail-middle',
    'scroll:900', 'shot:detail-bottom', 'scroll:420', 'tap:Record a height', 'shot:measure', 'tap:Other', 'shot:measure-other',
    'tap:Cancel', 'tap:Done', 'tap:Discover', 'shot:discover-populated', 'tap:Badges', 'shot:badges-populated',
  ],
  big: ['shot:allotment-big'],
};

async function run(step) {
  const [cmd, ...rest] = step.split(':');
  const arg = rest.join(':');
  if (cmd === 'shot') return shot(arg);
  if (cmd === 'tap') return tap(arg);
  if (cmd === 'tapfuzzy') return tap(arg, true);
  if (cmd === 'tapxy') { const [x, y] = arg.split(',').map(Number); return tapAt(x, y); }
  if (cmd === 'type') { const [ph, ...t] = arg.split('='); return typeInto(ph, t.join('=')); }
  if (cmd === 'scroll') return scrollTo(arg);
  if (cmd === 'wait') return sleep(Number(arg));
  if (cmd === 'text') { console.log(await evaluate('document.body.innerText.slice(0, 3000)')); return; }
  throw new Error(`unknown step "${step}"`);
}

const devices = deviceArg === 'both' ? ['mobile', 'desktop'] : [deviceArg];
let failures = 0;
try {
  for (const kind of devices) {
    await setDevice(kind);
    if (steps.length) {
      await load(gardenArg ?? 'small');
      for (const step of steps) {
        try { await run(step); } catch (e) { failures += 1; console.error(`step "${step}" on ${kind}: ${e.message}`); }
      }
    } else {
      for (const [garden, script] of Object.entries(WALKTHROUGH)) {
        if (gardenArg && garden !== gardenArg) continue;
        await load(garden);
        for (const step of script) {
          try { await run(step); } catch (e) { failures += 1; console.error(`step "${step}" (${garden}, ${kind}): ${e.message}`); await shot(`FAILED-${garden}`); }
        }
      }
    }
  }
} finally {
  ws.close();
  await chrome.kill();
}

const noise = /shadow\*|textShadow\*|pointerEvents is deprecated|React DevTools|useNativeDriver|setUpdateInterval/;
const notable = [...new Set(problems)].filter((p) => !noise.test(p));
if (notable.length) {
  console.log('\nConsole errors and warnings:');
  notable.slice(0, 15).forEach((p) => console.log('  ' + p));
}
console.log(`\n${counter} screenshots in ${outDir}${failures ? `, ${failures} step(s) failed` : ''}`);
process.exit(failures ? 1 : 0);
