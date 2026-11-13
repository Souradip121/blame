// Builds the demo repo used for Blame's screenshots and reel: "Hostel 7 Mess",
// a small working web app whose git history is MADE UP. Four invented
// teammates (Riya, Arjun, Soham, Tisha) "write" the files in tools/demo-src
// over three weeks, with a deadline crunch on 3 Nov 2026.
//
// Every commit reveals more lines of the final files, so the last commit is
// the finished app. Emails use the reserved .example domain, so GitHub can
// never link them to a real account.
//
//   node tools/make-demo-repo.mjs <empty-folder>
//   then: cd <folder> && git push <remote> work:main

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), 'demo-src');
const OUT = process.argv[2];
if (!OUT) { console.error('usage: node tools/make-demo-repo.mjs <empty-folder>'); process.exit(1); }
if (existsSync(OUT) && readdirSync(OUT).length) { console.error(`${OUT} is not empty`); process.exit(1); }
mkdirSync(OUT, { recursive: true });

const FILES = ['README.md', 'index.html', 'style.css', 'js/app.js', 'js/ratings.js', 'js/complaints.js', 'data/menu.json'];
const final = Object.fromEntries(FILES.map((f) => [f, readFileSync(join(SRC, f), 'utf8').replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n')]));

const PEOPLE = {
  riya: { name: 'Riya Sharma', email: 'riya.sharma@team7.example' },
  arjun: { name: 'Arjun Mehta', email: 'arjun.m@team7.example' },
  arjun2: { name: 'Arjun Mehta', email: 'arjun.mehta@college.example' }, // same person, second laptop
  soham: { name: 'Soham Das', email: 'soham@team7.example' },
  tisha: { name: 'Tisha Nair', email: 'tisha.nair@team7.example' },
};

// seeded random, so the demo is the same every time
let seed = 1421;
const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const at = (day, hm) => `2026-${day}T${hm}:00+05:30`;
// n random times between two days (inclusive), 10:00 to 23:59, optionally before a cut-off on the last day
function times(fromDay, toDay, n, lastBefore = '23:59') {
  const start = new Date(`2026-${fromDay}T00:00:00+05:30`).getTime();
  const days = Math.round((new Date(`2026-${toDay}T00:00:00+05:30`).getTime() - start) / 864e5) + 1;
  const [lh, lm] = lastBefore.split(':').map(Number);
  const out = [];
  while (out.length < n) {
    const d = Math.floor(rnd() * days);
    const mins = 600 + Math.floor(rnd() * (d === days - 1 ? lh * 60 + lm - 600 : 839));
    const t = start + d * 864e5 + mins * 6e4;
    if (!out.includes(t)) out.push(t);
  }
  return out.sort((a, b) => a - b).map((t) => new Date(t).toISOString());
}
const fixed = (day, list) => list.map((hm) => at(day, hm));

// Split line ranges into n pieces of uneven size (at least 1 line each).
function pieces(ranges, n) {
  const lines = ranges.flatMap(([f, a, b, ...extra]) => [...Array.from({ length: b - a + 1 }, (_, i) => [f, a + i]), ...extra.map((x) => [f, x])]);
  if (lines.length < n) throw new Error('not enough lines');
  const w = Array.from({ length: n }, () => 0.3 + rnd() * rnd() * 4);
  const sum = w.reduce((a, b) => a + b, 0);
  let cuts = []; let acc = 0;
  for (let i = 0; i < n - 1; i++) { acc += w[i]; cuts.push(Math.round((acc / sum) * lines.length)); }
  // strictly increasing, so no piece is empty
  for (let i = 0; i < cuts.length; i++) cuts[i] = Math.max(cuts[i], (i ? cuts[i - 1] : 0) + 1);
  for (let i = cuts.length - 1; i >= 0; i--) cuts[i] = Math.min(cuts[i], (i < cuts.length - 1 ? cuts[i + 1] : lines.length) - 1);
  const bounds = [0, ...cuts, lines.length];
  return Array.from({ length: n }, (_, i) => lines.slice(bounds[i], bounds[i + 1]));
}

const plan = [];
function phase(who, branch, whens, msgs, ranges) {
  if (whens.length !== msgs.length) throw new Error(`${who}: ${whens.length} times, ${msgs.length} messages`);
  const ps = pieces(ranges, whens.length);
  whens.forEach((when, i) => plan.push({ when, who, branch, msg: msgs[i], lines: ps[i] }));
}

// ---- Riya: 58 commits -------------------------------------------------------
phase('riya', 'work', [at('10-13', '19:05')], ['Initial commit'], [['README.md', 1, 6]]);
phase('riya', 'work', times('10-13', '10-19', 11), [
  'add page skeleton', 'header and tabs', 'menu data for monday and tuesday', 'basic styles', 'today section',
  'tab buttons', 'fix header padding', 'script tags', 'colors', 'today title', 'small fixes',
], [['index.html', 1, 25], ['index.html', 56, 61], ['data/menu.json', 1, 11, 44], ['style.css', 1, 20]]);
phase('riya', 'work', times('10-20', '10-24', 10, '20:40'), [
  'load menu from json', 'meal cards', 'show timings', 'today view working', 'card styles',
  'fix card border', 'title case meal names', 'error message if menu fails', 'spacing', 'cleanup',
], [['js/app.js', 1, 40], ['style.css', 21, 40]]);
phase('riya', 'work', times('10-25', '10-30', 10, '21:40'), [
  'week section', 'complaints section markup', 'day picker', 'week view', 'highlight picked day',
  'fix day picker scroll', 'tabs switch views', 'hide inactive views', 'form markup', 'labels',
], [['index.html', 26, 50], ['js/app.js', 41, 60]]);
phase('riya', 'work', times('10-31', '11-02', 14, '22:30'), [
  'meal card spacing', 'stars row', 'README features', 'refactor render functions', 'fix today showing wrong day',
  'week renders ratings', 'avg text', 'mobile tweaks', 'fix', 'more fixes', 'fix tab active state',
  'remove console logs', 'README', 'menu fallback text',
], [['style.css', 41, 59], ['js/app.js', 61, 80], ['README.md', 7, 13]]);
phase('riya', 'work', fixed('11-03', ['08:10', '10:25', '12:40', '13:15', '15:50', '17:05', '19:30', '20:45', '21:55', '22:40', '23:12', '23:41']), [
  'final changes', 'fix menu loading', 'desktop grid', 'fix', 'final fixes', 'fixed bug',
  'last changes', 'done', 'final', 'final final', 'submission ready', 'final commit',
], [['js/app.js', 81, 94], ['style.css', 75, 86]]);

// ---- Arjun: 25 commits (two branches merged by Riya) -------------------------
phase('arjun', 'work', times('10-14', '10-19', 5), [
  'menu: wednesday', 'menu: thursday friday', 'menu: weekend', 'fix json comma', 'sunday biryani',
], [['data/menu.json', 12, 43]]);
phase('arjun', 'ratings', times('10-20', '10-24', 7, '20:30'), [
  'ratings: stars component', 'save ratings in localStorage', 'load ratings safely', 'average rating text',
  'aria labels for stars', 'fix stars not updating', 'ratings cleanup',
], [['js/ratings.js', 1, 61]]);
phase('arjun', 'complaints', times('10-26', '10-30', 7, '21:30'), [
  'complaints box: storage', 'complaints form submit', 'render complaints list', 'empty state',
  'show meal and time', 'escape complaint text', 'complaints cleanup',
], [['js/complaints.js', 1, 52]]);
phase('arjun2', 'work', fixed('11-03', ['11:00', '16:20', '18:10', '20:05', '22:15', '23:30']), [
  'star colors', 'fix star size', 'star hover', 'match stars to theme', 'avg text style', 'final ratings fix',
], [['style.css', 60, 74]]);

// ---- Soham: 9 commits, 7 of them on the last night ---------------------------
phase('soham', 'work', [at('10-16', '22:10')], ['form css'], [['style.css', 87, 97]]);
phase('soham', 'work', [at('10-22', '23:05')], ['fixed button'], [['style.css', 98, 106]]);
phase('soham', 'work', fixed('11-03', ['01:12', '01:40', '02:05', '14:30', '18:45', '22:58', '23:20']), [
  'complaints css', 'footer css', 'responsive', 'fix mobile', 'colors', 'final css changes', 'final css changes 2',
], [['style.css', 107, 123]]);

// ---- Tisha: 3 commits, 2 of them README ----------------------------------------
phase('tisha', 'work', [at('10-19', '16:20')], ['Update README.md'], [['README.md', 14, 23]]);
phase('tisha', 'work', [at('11-01', '12:05')], ['Update README.md'], [['README.md', 24, 29]]);
phase('tisha', 'work', [at('11-03', '21:10')], ['add our names in footer'], [['index.html', 51, 55]]);

const merges = [
  { when: at('10-24', '21:00'), into: 'work', from: 'ratings', who: 'riya' },
  { when: at('10-30', '22:00'), into: 'work', from: 'complaints', who: 'riya' },
];
// branches start from 'work' just before their first commit
const branchFrom = { ratings: at('10-19', '23:59'), complaints: at('10-25', '00:01') };

// ---- replay ---------------------------------------------------------------------
const git = (args, env = {}) => execFileSync('git', args, { cwd: OUT, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
const envFor = (who, when) => ({
  GIT_AUTHOR_NAME: PEOPLE[who].name, GIT_AUTHOR_EMAIL: PEOPLE[who].email, GIT_AUTHOR_DATE: when,
  GIT_COMMITTER_NAME: PEOPLE[who].name, GIT_COMMITTER_EMAIL: PEOPLE[who].email, GIT_COMMITTER_DATE: when,
});

git(['init', '-q', '-b', 'work']);
git(['config', 'core.autocrlf', 'false']);
const revealed = { work: new Set() };
let current = 'work';

function writeTree(set) {
  for (const f of FILES) {
    const lines = final[f].filter((_, i) => set.has(`${f}:${i + 1}`));
    if (!lines.length) continue;
    mkdirSync(join(OUT, dirname(f)), { recursive: true });
    writeFileSync(join(OUT, f), lines.join('\n') + '\n');
  }
}
function checkout(branch) {
  if (branch === current) return;
  if (!revealed[branch]) { revealed[branch] = new Set(revealed.work); git(['checkout', '-q', '-b', branch]); }
  else git(['checkout', '-q', branch]);
  current = branch;
}

const events = [
  ...plan.map((p) => ({ t: Date.parse(p.when), kind: 'commit', ...p })),
  ...merges.map((m) => ({ t: Date.parse(m.when), kind: 'merge', ...m })),
  ...Object.entries(branchFrom).map(([b, when]) => ({ t: Date.parse(when), kind: 'branch', branch: b })),
].sort((a, b) => a.t - b.t);

let count = 0;
for (const e of events) {
  if (e.kind === 'branch') { checkout('work'); checkout(e.branch); continue; }
  if (e.kind === 'merge') {
    checkout('work');
    git(['merge', '-q', '--no-ff', e.from, '-m', `Merge branch '${e.from}'`], envFor(e.who, e.when));
    for (const k of revealed[e.from]) revealed.work.add(k);
    continue;
  }
  checkout(e.branch);
  for (const [f, n] of e.lines) revealed[e.branch].add(`${f}:${n}`);
  writeTree(revealed[e.branch]);
  git(['add', '-A']);
  git(['commit', '-q', '-m', e.msg], envFor(e.who, e.when));
  count++;
}
checkout('work');

// the finished tree must be exactly the demo source
for (const f of FILES) {
  const got = readFileSync(join(OUT, f), 'utf8').replace(/\n$/, '');
  if (got !== final[f].join('\n')) throw new Error(`final ${f} does not match demo-src`);
}
console.log(`${count} commits + ${merges.length} merges in ${OUT} (branch "work")`);
console.log(git(['shortlog', '-sne', 'work']));
