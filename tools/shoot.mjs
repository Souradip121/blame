// Takes the reel stills (390 x 844 CSS px at 3x = 1170 x 2532) with headless Chrome over the DevTools protocol.
// Uses the demo repo Souradip121/hostel-mess-app (a made-up team). Its GitHub API answers are fetched
// live with the gh CLI and handed to the page, so repeated shots don't use up the page's 60-an-hour limit.
//
//   node tools/shoot.mjs [url] [outDir]
//   default url: http://127.0.0.1:8811/   default outDir: screenshots/

import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_ = process.argv[2] || 'http://127.0.0.1:8811/';
const OUT = process.argv[3] || 'screenshots';
const REPO = process.env.REPO || 'Souradip121/hostel-mess-app';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

// live GitHub answers for the demo repo, through the gh CLI
const gh = (path) => execFileSync('gh', ['api', '-i', path], { maxBuffer: 64 << 20 }).toString();
function split(raw) {
  const i = raw.indexOf('\r\n\r\n') >= 0 ? raw.indexOf('\r\n\r\n') : raw.indexOf('\n\n');
  const head = raw.slice(0, i); const body = raw.slice(i).trim();
  const status = Number(head.match(/HTTP\/[\d.]+ (\d+)/)[1]);
  const link = head.match(/^link: (.*)$/im)?.[1]?.trim();
  return { status, body, link };
}
const answers = new Map();
answers.set(`/repos/${REPO}`, split(gh(`repos/${REPO}`)));
for (let p = 1; p <= 10; p++) {
  const a = split(gh(`repos/${REPO}/commits?per_page=100&page=${p}`));
  answers.set(`/repos/${REPO}/commits?per_page=100&page=${p}`, a);
  if (!a.link || !/rel="next"/.test(a.link) || JSON.parse(a.body).length < 100) break;
}
answers.set(`/repos/${REPO}/stats/contributors`, split(gh(`repos/${REPO}/stats/contributors`)));

mkdirSync(OUT, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), 'blame-shoot-'));
const port = 9300 + Math.floor(Math.random() * 400);
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--force-color-profile=srgb', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function json(path) {
  for (let i = 0; i < 50; i++) {
    try { return await (await fetch(`http://127.0.0.1:${port}${path}`)).json(); } catch { await sleep(200); }
  }
  throw new Error('chrome did not start');
}

const targets = await json('/json/list');
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
const handlers = new Map();
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  else if (msg.method && handlers.has(msg.method)) handlers.get(msg.method)(msg.params);
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const n = ++id;
  pending.set(n, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
  ws.send(JSON.stringify({ id: n, method, params }));
});
const run = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval failed');
  return r.result.value;
};
async function shot(file, { full = false } = {}) {
  const params = { format: 'png', captureBeyondViewport: full };
  if (full) {
    const { cssContentSize } = await send('Page.getLayoutMetrics');
    params.clip = { x: 0, y: 0, width: cssContentSize.width, height: cssContentSize.height, scale: 1 };
  }
  const { data } = await send('Page.captureScreenshot', params);
  writeFileSync(file, Buffer.from(data, 'base64'));
  console.log('saved', file);
}

// hand the page GitHub's real answers (CORS headers included)
const cors = [
  { name: 'access-control-allow-origin', value: '*' },
  { name: 'access-control-allow-headers', value: 'Accept, X-GitHub-Api-Version, Authorization, Content-Type' },
  { name: 'access-control-expose-headers', value: 'Link, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-RateLimit-Resource' },
];
handlers.set('Fetch.requestPaused', async ({ requestId, request }) => {
  const u = new URL(request.url);
  if (request.method === 'OPTIONS') {
    await send('Fetch.fulfillRequest', { requestId, responseCode: 204, responseHeaders: cors });
    return;
  }
  const a = answers.get(u.pathname + u.search) || answers.get(u.pathname);
  if (!a) { console.warn('no answer for', u.pathname + u.search); await send('Fetch.fulfillRequest', { requestId, responseCode: 404, responseHeaders: cors, body: Buffer.from('{"message":"Not Found"}').toString('base64') }); return; }
  const headers = [...cors, { name: 'content-type', value: 'application/json' }, { name: 'x-ratelimit-remaining', value: '57' }, { name: 'x-ratelimit-limit', value: '60' }, { name: 'x-ratelimit-reset', value: String(Math.floor(Date.now() / 1000) + 3600) }];
  if (a.link) headers.push({ name: 'link', value: a.link });
  await send('Fetch.fulfillRequest', { requestId, responseCode: a.status, responseHeaders: headers, body: a.status === 204 ? undefined : Buffer.from(a.body).toString('base64') });
});

await send('Page.enable');
await send('Runtime.enable');
await send('Page.setBypassCSP', { enabled: true }); // only so this script can read the card's blob: URL back
await send('Fetch.enable', { patterns: [{ urlPattern: 'https://api.github.com/*', requestStage: 'Request' }] });
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });

async function phone() {
  await send('Emulation.setDeviceMetricsOverride', { width: Number(process.env.VW || 390), height: Number(process.env.VH || 844), deviceScaleFactor: Number(process.env.DSF || 3), mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true });
}
async function desktop() {
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setTouchEmulationEnabled', { enabled: false });
}
async function load(u = URL_) {
  await send('Page.navigate', { url: u });
  await sleep(1200);
  await run('document.fonts.ready.then(() => new Promise(r => setTimeout(r, 400)))');
}
const waitFor = (expr, ms = 15000) => run(`(async () => { const t = Date.now(); while (!(${expr})) { if (Date.now() - t > ${ms}) throw new Error('timeout: ${expr.replace(/'/g, '')}'); await new Promise(r => setTimeout(r, 100)); } return true; })()`);

try {
  await phone();
  await load();
  await run(`(() => { const i = document.querySelector('#repo'); i.value = 'github.com/${REPO}'; i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  await sleep(300);
  await shot(join(OUT, '1-paste-your-repo.png'));
  await shot(join(OUT, '1-paste-your-repo-full.png'), { full: true });

  await run(`document.querySelector('#go').click()`);
  await waitFor(`!document.querySelector('#split').hidden`);
  // the demo team's real deadline: 3 Nov 2026, 11:59 pm IST
  if (process.env.DEADLINE !== '0') await run(`(() => { const i = document.querySelector('#dl-input'); i.value = '2026-11-03T23:59'; i.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  await sleep(1800);
  await run('window.scrollTo(0, 0)');
  await shot(join(OUT, '2-the-split.png'));
  await shot(join(OUT, '2-the-split-full.png'), { full: true });

  await run(`document.querySelector('#to-verdict').click()`);
  await waitFor(`!document.querySelector('#verdict').hidden`);
  await sleep(1800);
  await run('window.scrollTo(0, 0)');
  await shot(join(OUT, '3-the-verdict.png'));
  await shot(join(OUT, '3-the-verdict-full.png'), { full: true });

  // the share card PNG itself, exactly as the page draws it (the headless browser has no share sheet)
  await run(`document.querySelector('#share').click()`);
  await waitFor(`document.querySelector('#sheet').open`, 20000);
  await sleep(500);
  const dataUrl = await run(`(async () => { const b = await (await fetch(document.querySelector('#sheet-img').src)).blob(); return await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); }); })()`);
  writeFileSync(join(OUT, '4-share-card.png'), Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('saved', join(OUT, '4-share-card.png'));

  if (process.env.DESKTOP !== '0') {
    await desktop();
    await load();
    await shot(join(OUT, 'desktop.png'));
  }
} finally {
  ws.close();
  chrome.kill();
}
