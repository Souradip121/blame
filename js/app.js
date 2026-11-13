import { parseRepo, createClient, GitHubError, PAGE_CAP } from './github.js';
import { analyse, BADGES } from './analyze.js';
import * as H from './halftone.js';
import { drawCard } from './card.js';
import { demoPortrait, DEMO_REPO } from './demo.js';

const $ = (s, root = document) => root.querySelector(s);
const fmt = (n) => Number(n).toLocaleString('en-IN');
const plural = (n, one, many = `${one}s`) => `${fmt(n)} ${n === 1 ? one : many}`;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const DPR = () => Math.min(3, Math.max(1, window.devicePixelRatio || 1));
const TOKEN_KEY = 'blame-token';
const SITE = 'souradip121.github.io/blame';

const state = {
  token: readToken(),
  gh: null,
  data: null, // { repo, raw, stats, lineMap, total, truncated }
  linesStatus: 'idle', // idle | loading | ready | computing | big | failed
  measure: 'commits',
  deadline: null,
  forkMode: null,
  result: null,
  busy: false,
  screen: 'home',
  printed: false,
};

// ---------------------------------------------------------------- token
function readToken() { try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } }
function writeToken(t) {
  state.token = t;
  try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* private mode: keep it in memory */ }
  renderToken();
}
function renderToken() {
  const on = !!state.token;
  $('#token-state').dataset.on = on;
  $('#token-state').textContent = on
    ? 'Token on for this tab. It’s sent to api.github.com and nowhere else, and it’s gone when you close the tab.'
    : 'It stays in this tab only (sessionStorage) and is sent to api.github.com and nowhere else.';
  $('#token-forget').hidden = !on;
  $('#token').value = '';
  $('#token').placeholder = on ? '•••••••• (saved for this tab)' : 'github_pat_…';
}

// ---------------------------------------------------------------- screens
const SCREENS = ['home', 'split', 'verdict'];
function show(name, { push = true } = {}) {
  if (name !== 'home' && !state.result) name = 'home';
  const go = () => {
    for (const s of SCREENS) $(`#${s}`).hidden = s !== name;
    state.screen = name;
    window.scrollTo(0, 0);
    if (name === 'split') { printSplit(); $('#split-h').focus({ preventScroll: true }); }
    if (name === 'verdict') { printVerdict(); $('#verdict-h').focus({ preventScroll: true }); }
  };
  if (document.startViewTransition && !reduced() && state.screen !== name) document.startViewTransition(go);
  else go();
  if (push) {
    const url = new URL(location.href);
    if (state.data && name !== 'home') url.searchParams.set('repo', state.data.repo.full_name);
    else url.searchParams.delete('repo');
    url.hash = name === 'home' ? '' : name;
    history.pushState({ screen: name }, '', url);
  }
}
window.addEventListener('popstate', (e) => show(e.state?.screen || location.hash.slice(1) || 'home', { push: false }));
document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => {
  if (history.state?.screen && history.length > 1) history.back();
  else show(state.screen === 'verdict' ? 'split' : 'home');
}));

// ---------------------------------------------------------------- home
const status = (text, tone = '') => { const s = $('#find-status'); s.textContent = text; s.dataset.tone = tone; };
function progress(done, of) {
  const p = $('#progress');
  p.hidden = !of;
  if (of) p.firstElementChild.style.transform = `scaleX(${Math.min(1, done / of)})`;
}
function setBusy(on, label) {
  state.busy = on;
  const b = $('#go');
  b.setAttribute('aria-busy', on);
  b.querySelector('.btn-label').textContent = on ? (label || 'Reading…') : 'Find out';
  if (!on) progress(0, 0);
}

$('#find').addEventListener('submit', (e) => { e.preventDefault(); run($('#repo').value); });
$('#repo').addEventListener('input', () => { $('.field').dataset.invalid = 'false'; if ($('#find-status').dataset.tone === 'error') status(''); });
$('#try-demo').addEventListener('click', () => { $('#repo').value = `github.com/${DEMO_REPO}`; run($('#repo').value); });
$('#token-save').addEventListener('click', () => {
  const t = $('#token').value.trim();
  if (!t) return;
  if (!/^(gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|[a-f0-9]{40})$/.test(t)) {
    $('#token-state').textContent = 'That doesn’t look like a GitHub token. They start with github_pat_ or ghp_.';
    return;
  }
  writeToken(t);
});
$('#token').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#token-save').click(); } });
$('#token-forget').addEventListener('click', () => writeToken(''));

async function run(input, { to = 'split', push = true } = {}) {
  if (state.busy) return;
  let ref;
  try { ref = parseRepo(input); } catch (e) {
    $('.field').dataset.invalid = 'true';
    status(e.message, 'error');
    $('#repo').focus();
    return;
  }
  setBusy(true, 'Reading…');
  status(`Opening ${ref.owner}/${ref.repo}…`);
  const gh = createClient({ token: state.token });
  try {
    const repo = await gh.getRepo(ref.owner, ref.repo);
    status(`Reading the commits on ${repo.default_branch}…`);
    const { commits, total, truncated } = await gh.getCommits(repo.owner.login, repo.name, {
      onProgress: (n, of) => { progress(n, of); status(`Reading commits: ${fmt(n)}…`); },
    });
    state.gh = gh;
    state.data = { repo, raw: commits, stats: null, lineMap: null, total, truncated };
    state.measure = 'commits';
    state.deadline = null;
    state.forkMode = null;
    state.linesStatus = 'idle';
    state.printed = false;
    state.showAll = false;
    compute();
    if (!state.result.ranked.length) {
      status(state.result.botCommits ? 'Only bots have committed here. Nothing to blame.' : 'No commits by people here yet. Nothing to blame.', 'error');
      state.result = null;
      return;
    }
    status('');
    render();
    show(to, { push });
    loadLines();
  } catch (e) {
    const err = e instanceof GitHubError ? e : new GitHubError('http', 'Something went wrong reading that repo. Try again.');
    status(err.message, 'error');
    if (err.kind === 'ratelimit' || err.kind === 'badtoken' || (err.kind === 'notfound' && !state.token)) $('#token-box').open = err.kind !== 'notfound';
    if (err.kind === 'notfound' || err.kind === 'input') $('.field').dataset.invalid = 'true';
    if (!['ratelimit', 'network', 'http', 'badtoken'].includes(err.kind) && err.kind !== 'empty') console.warn(e);
  } finally {
    setBusy(false);
  }
}

// ---------------------------------------------------------------- lines (in the background)
async function loadLines() {
  const { data, gh } = state;
  if (!data) return;
  const { owner: { login: owner }, name } = data.repo;
  state.linesStatus = 'loading';
  try {
    if (gh.hasToken) {
      data.lineMap = await gh.getLinesGraphQL(owner, name, { maxCommits: data.raw.length });
      state.linesStatus = 'ready';
    } else if (data.truncated) {
      state.linesStatus = 'big';
    } else {
      const s = await gh.getStats(owner, name);
      data.stats = s.status === 'ok' ? s.data : null;
      state.linesStatus = s.status === 'computing' ? 'computing' : 'ready';
    }
  } catch (e) {
    state.linesStatus = 'failed';
    state.linesError = e;
  }
  if (state.data !== data) return;
  compute();
  render({ quiet: true });
  if (state.wantLines) { state.wantLines = false; chooseMeasure('lines'); }
}

async function chooseMeasure(m) {
  const note = $('#measure-note');
  note.hidden = true;
  if (m === 'commits') { state.measure = 'commits'; compute(); render({ animate: true }); return; }
  const r = state.result;
  const { data, gh } = state;
  const say = (t) => { note.textContent = t; note.hidden = false; };
  if (r.linesState === 'full') { state.measure = 'lines'; compute(); render({ animate: true }); return; }
  if (state.linesStatus === 'loading') { state.wantLines = true; say('Getting line counts from GitHub…'); return; }
  if (state.linesStatus === 'big') { say(`Big repo: lines changed need a token here (with one, the page reads up to ${fmt(PAGE_CAP.token * 100)} commits with their line counts).`); openToken(); return; }
  if (state.linesStatus === 'computing') {
    say('GitHub is still counting lines for this repo. Checking again…');
    const { owner: { login: owner }, name } = data.repo;
    try {
      const s = await gh.getStats(owner, name, { delays: [3000, 5000] });
      if (s.status === 'ok') { data.stats = s.data; state.linesStatus = 'ready'; compute(); return chooseMeasure('lines'); }
      say('GitHub is still counting lines for this repo. Try Lines changed again in a minute.');
    } catch (e) { say(e.message); }
    return;
  }
  if (state.linesStatus === 'failed') { say(state.linesError?.message || 'Couldn’t get line counts from GitHub.'); return; }
  // some people's commits come from emails GitHub can't link to an account: their lines need one lookup per commit
  const need = r.linesMissingCommits.filter((sha) => !data.lineMap?.has(sha));
  const left = gh.state.remaining ?? 0;
  const who = listNames(r.linesMissing);
  const limit = gh.hasToken ? 600 : 45;
  if (need.length && need.length <= limit && need.length <= left - 4) {
    try {
      say(`Counting lines for ${who}: 0 of ${need.length} commits…`);
      const { owner: { login: owner }, name } = data.repo;
      const got = await gh.getCommitLines(owner, name, need, { onProgress: (d, n) => say(`Counting lines for ${who}: ${d} of ${n} commits…`) });
      data.lineMap = new Map([...(data.lineMap || []), ...got]);
      compute();
      if (state.result.linesState === 'full') { note.hidden = true; state.measure = 'lines'; compute(); render({ animate: true }); return; }
    } catch (e) { say(e.message); return; }
  }
  say(`${who} committed from ${r.linesMissing.length === 1 ? 'an email' : 'emails'} GitHub can’t link to an account, so GitHub’s line stats skip them. Counting them takes one lookup per commit (${fmt(need.length)}), and ${gh.hasToken ? 'that’s too many to do here' : `you have ${fmt(left)} left this hour. Add a token to count them`}. Commits still work.`);
  if (!gh.hasToken) openToken();
}
function openToken() { $('#token-box').open = true; }
function listNames(names) {
  if (names.length <= 2) return names.join(' and ');
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
}

document.querySelectorAll('[data-measure]').forEach((b) => b.addEventListener('click', () => chooseMeasure(b.dataset.measure)));
$('.measure').addEventListener('keydown', (e) => {
  if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  const other = document.querySelector(`[data-measure="${state.measure === 'commits' ? 'lines' : 'commits'}"]`);
  other.focus(); other.click();
});

// ---------------------------------------------------------------- deadline
$('#dl-input').addEventListener('change', (e) => {
  const v = e.target.value;
  state.deadline = v ? new Date(v).getTime() : null;
  compute(); render({ animate: false });
});
$('#dl-clear').addEventListener('click', () => { state.deadline = null; $('#dl-input').value = ''; compute(); render(); });
function toLocalInput(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ---------------------------------------------------------------- compute + render
function compute() {
  const d = state.data;
  state.result = analyse({ repo: d.repo, raw: d.raw, stats: d.truncated ? null : d.stats, lineMap: d.lineMap }, { measure: state.measure, deadline: state.deadline, forkMode: state.forkMode });
  state.forkMode = state.result.forkMode;
  state.measure = state.result.measure;
}

function render(opts = {}) {
  renderSplit(opts);
  renderVerdict();
}

const BADGE_ICON = { carried: 'i-crown', solid: 'i-star', night: 'i-moon', moral: 'i-heart' };

function renderSplit({ animate = false } = {}) {
  const r = state.result; const d = state.data;
  $('#repo-name').textContent = d.repo.name;
  $('#repo-name').title = d.repo.full_name;
  $('#repo-count').textContent = d.truncated ? `latest ${plural(r.totalCommits, 'commit')}` : plural(r.totalCommits, 'commit');
  document.querySelectorAll('[data-measure]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.measure === r.measure)));

  const rows = $('#rows');
  const old = new Map([...rows.children].map((li) => [li.dataset.key, li]));
  rows.textContent = '';
  const everyone = [...r.ranked, ...r.people.filter((p) => !r.ranked.includes(p) && p.count > 0)];
  const people = state.showAll || everyone.length <= 12 ? everyone : everyone.slice(0, 10);
  people.forEach((p, i) => {
    let li = old.get(p.key);
    if (!li) {
      li = document.createElement('li');
      li.className = 'row';
      li.dataset.key = p.key;
      li.innerHTML = `<canvas class="avatar" width="70" height="70" aria-hidden="true"></canvas><div class="row-main"><div class="row-top"><span class="row-name"></span><span class="row-pct"></span></div><div class="bar" aria-hidden="true"><span></span></div><p class="row-meta"></p></div>`;
      paintAvatar(li.querySelector('canvas'), p, 70);
    }
    li.querySelector('.row-name').textContent = p.display;
    li.querySelector('.row-pct').textContent = p.pctLabel;
    li.dataset.nolines = String(p.share === null);
    const bar = li.querySelector('.bar span');
    const w = p.share === null ? 0 : Math.max(p.share > 0 ? 2 : 0, p.share * 100);
    bar.style.setProperty('--w', `${w}%`);
    li.querySelector('.row-meta').textContent = metaLine(p, r);
    li.querySelector('.burst')?.remove();
    if (i === 0 && p.badge === 'carried') li.insertAdjacentHTML('beforeend', '<svg class="ink burst" aria-hidden="true"><use href="#d-burst"/></svg>');
    rows.appendChild(li);
  });
  if (people.length < everyone.length) {
    const li = document.createElement('li');
    li.className = 'row-more';
    li.innerHTML = `<button class="link" type="button">Show all ${fmt(everyone.length)} people</button>`;
    li.firstChild.addEventListener('click', () => { state.showAll = true; renderSplit(); });
    rows.appendChild(li);
  }
  if (animate) animateBars(false);

  // deadline
  const dl = r.deadline;
  $('#dl-count').textContent = fmt(dl.count);
  $('#dl-unit').textContent = dl.count === 1 ? 'commit' : 'commits';
  $('#dl-before').textContent = `before the ${dl.set ? 'deadline' : 'final commit'}`;
  const extra = [];
  if (r.totalCommits) extra.push(`That’s ${Math.round(dl.share * 100)}% of all ${plural(r.totalCommits, 'commit')}.`);
  if (dl.set && dl.after) extra.push(`${plural(dl.after, 'commit')} came in after the deadline.`);
  if (!dl.set) extra.push(`Final commit: ${new Date(dl.latest).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}. Set the real deadline if you know it.`);
  if (!dl.meaningful) extra.push('The whole project took under 3 days, so nobody gets Night-before.');
  $('#dl-extra').textContent = extra.join(' ');
  $('#dl-clear').hidden = !dl.set;
  if (!dl.set && !$('#dl-input').value) $('#dl-input').value = '';

  renderNotes();
}

function metaLine(p, r) {
  const bits = [];
  if (r.measure === 'lines' && p.lines) bits.push(`+${fmt(p.lines.a)} −${fmt(p.lines.d)} lines`, plural(p.count, 'commit'));
  else bits.push(plural(p.count, 'commit'));
  if (p.mergeCount) bits.push(plural(p.mergeCount, 'merge'));
  if (r.measure === 'lines' && p.share === null) bits.push('no line count');
  if (p.login) bits.push(`@${p.login}`);
  return bits.join(' · ');
}

function renderNotes() {
  const r = state.result; const d = state.data;
  const ul = $('#notes');
  ul.textContent = '';
  const add = (html) => { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); return li; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  add(`Only the <strong>${esc(d.repo.default_branch)}</strong> branch counts. Work still sitting in other branches doesn’t show up.`);
  if (d.truncated) add(`Big repo: only the latest ${fmt(d.raw.length)} of ${fmt(d.total)} commits are counted${state.token ? '' : `. A token reads up to ${fmt(PAGE_CAP.token * 100)}`}.`);
  if (d.repo.fork) {
    const parent = d.repo.parent?.full_name || d.repo.source?.full_name || 'another repo';
    const since = new Date(Date.parse(d.repo.created_at)).toLocaleDateString('en-IN', { dateStyle: 'medium' });
    const li = add(r.forkMode === 'after'
      ? `This is a fork of ${esc(parent)}. Only commits made since it was forked (${since}) count. `
      : `This is a fork of ${esc(parent)}, so its history includes ${esc(parent)}’s commits. `);
    const b = document.createElement('button');
    b.className = 'link'; b.type = 'button';
    b.textContent = r.forkMode === 'after' ? 'Count everything' : 'Only since the fork';
    b.addEventListener('click', () => { state.forkMode = r.forkMode === 'after' ? 'all' : 'after'; state.printed = false; compute(); render(); printSplit(); });
    li.appendChild(b);
  }
  if (r.mergeCount) add(`${plural(r.mergeCount, 'merge commit')} not counted: clicking merge isn’t writing the code.`);
  if (r.bots.length) add(`Bots left out: ${r.bots.slice(0, 4).map((b) => `${esc(b.name)} (${fmt(b.count)})`).join(', ')}${r.bots.length > 4 ? ` and ${r.bots.length - 4} more` : ''}.`);
  for (const p of r.people) if (p.emails.size > 1) add(`${esc(p.display)} committed from ${p.emails.size} emails, counted as one person.`);
  const unlinked = r.people.filter((p) => !p.login);
  if (unlinked.length) add(`${esc(listNames(unlinked.map((p) => p.display)))} ${unlinked.length === 1 ? 'uses an email' : 'use emails'} GitHub can’t link to an account, so ${unlinked.length === 1 ? 'they’re' : 'they’re'} grouped by the name in git.`);
  add('Lines changed = lines added + lines deleted, so lockfiles and folders committed by accident count too.');
  const left = state.gh?.state.remaining;
  if (!state.token && left !== null && left !== undefined && left < 20) add(`GitHub lookups left this hour on this network: ${fmt(left)}.`);
}

function animateBars(fromZero = true) {
  const rows = [...$('#rows').querySelectorAll('.row')];
  rows.forEach((li, i) => {
    const bar = li.querySelector('.bar span');
    const pct = li.querySelector('.row-pct');
    const target = bar.style.getPropertyValue('--w');
    if (reduced()) return;
    const t = parseFloat(target) || 0;
    const last = parseFloat(bar.dataset.last) || 0;
    const from = fromZero || !t ? 0 : Math.min(4, last / t);
    if (t) bar.animate([{ transform: `scaleX(${from})` }, { transform: 'scaleX(1)' }], { duration: 1100, delay: fromZero ? 160 + i * 110 : 0, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
    bar.dataset.last = target;
    const final = pct.textContent;
    const n = parseInt(final, 10);
    if (fromZero && Number.isFinite(n) && /^\d+%$/.test(final)) {
      const t0 = performance.now() + 160 + i * 110;
      const step = (t) => {
        const k = Math.min(1, Math.max(0, (t - t0) / 1100));
        const e = 1 - Math.pow(1 - k, 4);
        pct.textContent = `${Math.round(n * e)}%`;
        if (k < 1) requestAnimationFrame(step); else pct.textContent = final;
      };
      requestAnimationFrame(step);
    }
  });
  rows.forEach((li) => { li.querySelector('.bar span').dataset.last = li.querySelector('.bar span').style.getPropertyValue('--w'); });
}

function printSplit() {
  if (state.printed) return;
  state.printed = true;
  animateBars(true);
  if (!reduced()) {
    $('#split .headline .tape').animate([{ transform: 'rotate(-6deg) scale(1.18)', opacity: 0 }, { transform: 'rotate(-1.6deg) scale(1)', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,1.2,.3,1)', fill: 'backwards' });
  }
}

function renderVerdict() {
  const r = state.result;
  const head = $('#headline');
  head.textContent = r.headline.text;
  fitHeadline();
  $('#jab').textContent = (r.jab || '').replace(/\.$/, '');
  $('#jab').hidden = !r.jab;
  fitJab();
  const ul = $('#badges');
  ul.textContent = '';
  for (const p of r.ranked) {
    if (!p.badge) continue;
    const li = document.createElement('li');
    li.className = 'badge';
    li.innerHTML = `<svg aria-hidden="true"><use href="#${BADGE_ICON[p.badge]}"/></svg><span class="badge-label"></span><span class="badge-who"></span>`;
    li.querySelector('.badge-label').textContent = BADGES[p.badge].label;
    li.querySelector('.badge-who').textContent = p.display;
    li.setAttribute('aria-label', `${p.display}: ${BADGES[p.badge].label}`);
    ul.appendChild(li);
  }
  const rules = $('#rules');
  rules.textContent = '';
  for (const k of ['carried', 'night', 'moral', 'solid']) {
    const li = document.createElement('li');
    li.innerHTML = `<strong></strong> `;
    li.firstChild.textContent = `${BADGES[k].label}:`;
    li.append(BADGES[k].rule);
    rules.appendChild(li);
  }
  heroKey = null;
  if (state.screen === 'verdict') paintHero();
}

const measureCtx = document.createElement('canvas').getContext('2d');
function textWidth(text, font) { measureCtx.font = font; return measureCtx.measureText(text).width; }
const escHtml = (t) => t.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

/** The verdict headline: one line if it can be big, otherwise two balanced lines, like a front page. */
function fitHeadline() {
  const tape = $('#headline');
  const box = $('#verdict .front-inner');
  const text = state.result?.headline.text || tape.textContent;
  const avail = (box.clientWidth || Math.min(460, innerWidth) - 32) - 8;
  const PAD = 0.34; // the tape's side padding, in em
  const one = textWidth(text, '100px Anton') / 100;
  let size = avail / (one + PAD);
  let lines = [text];
  const words = text.split(' ');
  if (size < 66 && words.length > 1) {
    let best = null;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '); const b = words.slice(i).join(' ');
      const w = Math.max(textWidth(a, '100px Anton'), textWidth(b, '100px Anton')) / 100;
      if (!best || w < best.w) best = { w, lines: [a, b] };
    }
    const two = avail / (best.w + PAD);
    if (two > size * 1.25) { size = two; lines = best.lines; }
  }
  size = Math.max(30, Math.min(lines.length > 1 ? 96 : 104, Math.floor(size)));
  tape.innerHTML = lines.map(escHtml).join('<br>');
  tape.style.setProperty('--fit', `${size}px`);
  tape.dataset.lines = lines.length;
}

/** The jab strip: one line if it fits at a readable size. */
function fitJab() {
  const el = $('#jab');
  const avail = ($('#verdict').clientWidth || Math.min(460, innerWidth)) - 32 + 8 - 36;
  const w = textWidth(el.textContent, '700 26px "Barlow Condensed"');
  const size = Math.floor(26 * Math.min(1, avail / w));
  el.style.fontSize = `${size >= 19 ? size : 22}px`;
  el.style.whiteSpace = size >= 19 ? 'nowrap' : 'normal';
}

function printVerdict() {
  fitHeadline();
  fitJab();
  paintHero();
  if (reduced()) return;
  $('#verdict .headline .tape').animate([{ transform: 'rotate(-9deg) scale(1.3)', opacity: 0 }, { transform: 'rotate(-1.6deg) scale(1)', opacity: 1 }], { duration: 460, easing: 'cubic-bezier(.2,1.25,.3,1)', fill: 'backwards' });
  $('#hero .hero-print').animate([{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 900, delay: 200, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
  $('#jab').animate([{ transform: 'rotate(-1.4deg) translateY(16px)', opacity: 0 }, { transform: 'rotate(-1.4deg)', opacity: 1 }], { duration: 500, delay: 700, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
}

// ---------------------------------------------------------------- pictures
async function source(p, px = 200) {
  const demo = demoPortrait(state.data.repo.full_name, p);
  if (demo) return { kind: 'cutout', img: await H.loadImage(demo) };
  if (p.avatar) {
    try {
      const u = new URL(p.avatar);
      u.searchParams.set('s', String(Math.min(460, Math.ceil(px))));
      return { kind: 'photo', img: await H.loadImage(u.href) };
    } catch { /* fall through to the silhouette */ }
  }
  await document.fonts.load('100px Anton').catch(() => {});
  return { kind: 'cutout', img: H.silhouette(512) };
}

async function paintAvatar(cv, p, size) {
  const dpr = DPR();
  try {
    const s = await source(p, size * dpr);
    const art = s.kind === 'photo' ? H.disc(s.img, { size, dpr, cell: 2.4 }) : H.discCutout(s.img, { size, dpr, cell: 2.4 });
    cv.width = art.width; cv.height = art.height;
    cv.getContext('2d').drawImage(art, 0, 0);
  } catch { /* the yellow disc stays */ }
}

let heroKey = null;
async function paintHero() {
  const who = state.result.headline.who;
  const fig = $('#hero');
  const cv = fig.querySelector('.hero-print');
  const key = `${who?.key}|${fig.clientWidth}|${fig.clientHeight}`;
  if (!who || key === heroKey) return;
  heroKey = key;
  const h = fig.clientHeight; const w = Math.min(fig.clientWidth, h * 1.15);
  const dpr = DPR();
  const s = await source(who, h * dpr);
  if (heroKey !== key) return;
  fig.dataset.kind = s.kind === 'photo' ? 'disc' : 'cutout';
  const art = s.kind === 'photo'
    ? H.disc(s.img, { size: h * 0.86, dpr, cell: 3.6 })
    : H.cutout(s.img, { w, h, dpr, cell: 3.4, halo: 8 });
  cv.width = art.width; cv.height = art.height;
  cv.style.height = `${art.height / dpr}px`;
  cv.style.width = `${art.width / dpr}px`;
  cv.getContext('2d').drawImage(art, 0, 0);
  fig.querySelector('.hero-crown').hidden = !['carried', 'solo', 'pair'].includes(state.result.headline.kind);
}

async function paintLineup() {
  const fig = $('.lineup');
  const cv = fig.querySelector('.lineup-print');
  const h = fig.clientHeight; const w = Math.min(fig.clientWidth, h * (1400 / 708));
  if (!h || !w) return;
  try {
    const img = await H.loadImage('assets/suspects/lineup.webp');
    const dpr = DPR();
    const art = H.cutout(img, { w, h, dpr, cell: 2.5, halo: 5, fy: 1 });
    cv.width = art.width; cv.height = art.height;
    cv.style.width = `${w}px`; cv.style.height = `${h}px`;
    cv.getContext('2d').drawImage(art, 0, 0);
    fig.dataset.printed = 'true';
  } catch { /* the plain photo stays */ }
}

// ---------------------------------------------------------------- share
$('#to-verdict').addEventListener('click', () => show('verdict'));
$('#another').addEventListener('click', () => { show('home'); $('#repo').select(); });

function shareUrl() {
  const u = new URL(location.href);
  u.hash = '';
  u.search = '';
  u.searchParams.set('repo', state.data.repo.full_name);
  return u.href;
}

$('#share').addEventListener('click', async () => {
  const btn = $('#share');
  const st = $('#share-status');
  btn.setAttribute('aria-busy', 'true');
  st.textContent = 'Printing your front page…';
  try {
    const r = state.result;
    const blob = await drawCard(r, {
      repoName: state.data.repo.name,
      countLabel: `${state.data.truncated ? 'latest ' : ''}${plural(r.totalCommits, 'commit')}${r.measure === 'lines' ? ` · ${plural(r.totalLines, 'line')} changed` : ''}`,
      url: SITE,
      source: (p) => source(p, 600),
    });
    const file = new File([blob], `blame-${state.data.repo.name}.png`, { type: 'image/png' });
    const text = `${r.headline.text} Who actually did ${state.data.repo.name}? ${shareUrl()}`;
    st.textContent = '';
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], text, title: 'Blame' }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    openSheet(blob, text);
  } catch (e) {
    st.textContent = 'Couldn’t make the image. Try again.';
    console.warn(e);
  } finally {
    btn.removeAttribute('aria-busy');
  }
});

let sheetUrl = null;
function openSheet(blob, text) {
  if (sheetUrl) URL.revokeObjectURL(sheetUrl);
  sheetUrl = URL.createObjectURL(blob);
  $('#sheet-img').src = sheetUrl;
  $('#sheet-save').href = sheetUrl;
  $('#sheet-save').download = `blame-${state.data.repo.name}.png`;
  $('#sheet-copy').onclick = async () => {
    try { await navigator.clipboard.writeText(text); $('#sheet-note').textContent = 'Link copied. Paste it with the image.'; } catch { $('#sheet-note').textContent = shareUrl(); }
  };
  $('#sheet').showModal();
}
$('#sheet-close').addEventListener('click', () => $('#sheet').close());
$('#sheet').addEventListener('click', (e) => { if (e.target === $('#sheet')) $('#sheet').close(); });

// ---------------------------------------------------------------- start
renderToken();
document.fonts.ready.then(() => { paintLineup(); if (state.result) { fitHeadline(); fitJab(); } });
let rz;
window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { paintLineup(); if (state.screen === 'verdict') { fitHeadline(); fitJab(); paintHero(); } }, 150); });

const start = new URL(location.href);
const startRepo = start.searchParams.get('repo');
if (startRepo) {
  $('#repo').value = `github.com/${startRepo}`;
  const to = location.hash.slice(1) === 'verdict' ? 'verdict' : 'split';
  history.replaceState({ screen: 'home' }, '', location.pathname + location.search);
  run(startRepo, { to });
} else {
  history.replaceState({ screen: 'home' }, '', location.pathname);
}
