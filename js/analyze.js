// Pure functions: raw GitHub data in, the split and the verdict out.
// Every rule here is written up in the README ("How it counts" and "Badge rules").

const DAY = 864e5;

const BOT_NAMES = /^(dependabot|renovate|github-actions|greenkeeper|snyk-bot|imgbot|allcontributors|all-contributors|pre-commit-ci|codecov|deepsource-autofix|mergify|semantic-release-bot|copilot|github-merge-queue|web-flow|actions-user)\b/i;

export function isBot(c) {
  const login = c.author?.login || '';
  const name = c.commit?.author?.name || '';
  const email = c.commit?.author?.email || '';
  return c.author?.type === 'Bot'
    || /\[bot\]$/i.test(login) || /\[bot\]/i.test(name) || /\[bot\]@/i.test(email)
    || BOT_NAMES.test(login) || BOT_NAMES.test(name);
}

const GENERIC = /^(update|updated|updates|changes|changed|change|fix|fixed|fixes|final|final changes|done|commit|minor changes|minor|wip|asdf|test|.|\.\.|\.\.\.|edit|edited|save|new|stuff|misc|code|upload|added|add)$/i;
const README = /readme/i;
const UPLOAD = /^add files via upload/i;

const normName = (n) => String(n || '').trim().toLowerCase().replace(/\s+/g, ' ');

function firstLine(msg) {
  return String(msg || '').split('\n')[0].trim();
}

/** Normalise REST commit objects. Bots are split off; merges are kept but flagged. */
export function normalise(raw) {
  const people = [];
  const bots = new Map();
  for (const c of raw) {
    const a = c.commit?.author || {};
    const item = {
      sha: c.sha,
      date: Date.parse(a.date || c.commit?.committer?.date),
      name: (a.name || '').trim(),
      email: (a.email || '').trim().toLowerCase(),
      login: c.author?.login || null,
      id: c.author?.id || null,
      avatar: c.author?.avatar_url || null,
      linked: !!c.author?.login,
      merge: (c.parents?.length || 0) > 1,
      msg: firstLine(c.commit?.message),
    };
    if (isBot(c)) {
      const key = item.login || item.name || item.email;
      bots.set(key, (bots.get(key) || 0) + 1);
    } else people.push(item);
  }
  return { commits: people, bots: [...bots].map(([name, count]) => ({ name, count })).sort((x, y) => y.count - x.count) };
}

/**
 * Group commits into people.
 * 1. A commit belongs to the GitHub account GitHub links its email to (so two linked emails = one person).
 * 2. A commit from an email GitHub can't link goes to the account that used the same author name on a linked commit.
 * 3. Otherwise commits are grouped by author name (case-insensitive), or by email if there's no name.
 */
export function identities(commits) {
  const nameToLogin = new Map();
  for (const c of commits) {
    if (!c.login || !c.name) continue;
    const k = normName(c.name);
    const m = nameToLogin.get(k) || new Map();
    m.set(c.login, (m.get(c.login) || 0) + 1);
    nameToLogin.set(k, m);
  }
  const loginFor = (name) => {
    const m = nameToLogin.get(normName(name));
    if (!m) return null;
    return [...m].sort((a, b) => b[1] - a[1])[0][0];
  };
  const people = new Map();
  for (const c of commits) {
    let key;
    let login = c.login;
    if (login) key = `u:${login.toLowerCase()}`;
    else if (c.name && (login = loginFor(c.name))) key = `u:${login.toLowerCase()}`;
    else if (c.name) key = `n:${normName(c.name)}`;
    else key = `e:${c.email}`;
    let p = people.get(key);
    if (!p) {
      p = { key, login: login || null, id: null, avatar: null, names: new Map(), emails: new Set(), commits: [], merges: [] };
      people.set(key, p);
    }
    if (c.login && !p.id) { p.id = c.id; p.avatar = c.avatar; }
    if (c.name) p.names.set(c.name, (p.names.get(c.name) || 0) + 1);
    if (c.email) p.emails.add(c.email);
    (c.merge ? p.merges : p.commits).push(c);
  }
  const list = [...people.values()];
  for (const p of list) {
    p.fullName = [...p.names].sort((a, b) => b[1] - a[1])[0]?.[0] || p.login || p.emails.values().next().value || 'Someone';
    p.display = displayName(p);
  }
  dedupeDisplay(list);
  return list;
}

function displayName(p) {
  let n = p.fullName;
  if (!n || n.includes('@')) n = p.login || (n || '').split('@')[0] || 'Someone';
  const first = n.split(/\s+/)[0];
  let d = first.length >= 2 && !/^[^\p{L}]/u.test(first) ? first : n;
  if (/^\p{Ll}/u.test(d)) d = d.charAt(0).toUpperCase() + d.slice(1);
  return d.length > 24 ? `${d.slice(0, 23)}…` : d;
}

function dedupeDisplay(list) {
  const count = (k) => list.filter((p) => p.display === k).length;
  const clashing = list.filter((p) => count(p.display) > 1);
  for (const p of clashing) {
    // "Sebastian S." and "Sebastian M.": first name plus the initial of the last word of the name in git
    const words = p.fullName.replace(/["“”'(].*?["“”')]/g, ' ').trim().split(/\s+/);
    const last = words.length > 1 ? words[words.length - 1] : '';
    p.alt = last && /^\p{L}/u.test(last) ? `${p.display} ${last[0].toUpperCase()}.` : null;
  }
  const next = clashing.map((p) => {
    const taken = clashing.some((q) => q !== p && q.alt && q.alt === p.alt);
    return p.alt && !taken ? p.alt : p.login ? p.login : `${p.display} (${[...p.emails][0]?.split('@')[0] || '?'})`;
  });
  clashing.forEach((p, i) => { p.display = next[i]; delete p.alt; });
}

/** Should a fork count only what was committed after it was forked? Yes, if anything was. */
export function defaultForkMode(repo, commits) {
  if (!repo?.fork) return 'all';
  const since = Date.parse(repo.created_at);
  return commits.some((c) => !c.merge && c.date >= since) ? 'after' : 'all';
}

const weekStart = (ms) => {
  // GitHub's stats weeks start on Sunday 00:00 UTC
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - d.getUTCDay()) / 1000;
};

/**
 * The whole analysis.
 * input: { repo, raw (REST commits), stats (stats/contributors array or null), lineMap (Map sha -> {a,d}) }
 * opts:  { measure: 'commits' | 'lines', deadline: ms | null, forkMode: 'all' | 'after' }
 */
export function analyse({ repo, raw, stats = null, lineMap = null }, opts = {}) {
  const { commits: all, bots } = normalise(raw);
  const forkMode = opts.forkMode || defaultForkMode(repo, all);
  const forkSince = repo?.fork && forkMode === 'after' ? Date.parse(repo.created_at) : null;
  const commits = forkSince ? all.filter((c) => c.date >= forkSince) : all;
  const people = identities(commits);
  const counted = commits.filter((c) => !c.merge);
  const mergeCount = commits.length - counted.length;

  // deadline window
  const latest = counted.reduce((m, c) => Math.max(m, c.date), 0);
  const earliest = counted.reduce((m, c) => Math.min(m, c.date), Infinity);
  const end = opts.deadline || latest;
  const start = end - DAY;
  const inWindow = (c) => c.date > start && c.date <= end;
  const spanDays = counted.length ? (Math.min(end, latest) - earliest) / DAY : 0;
  const crunchMeaningful = spanDays > 3;

  // lines
  const statsBy = new Map();
  for (const s of stats || []) if (s.author?.login) statsBy.set(s.author.login.toLowerCase(), s);
  const forkWeek = forkSince ? weekStart(forkSince) : null;

  for (const p of people) {
    const cs = p.commits;
    p.count = cs.length;
    p.mergeCount = p.merges.length;
    p.window = cs.filter(inWindow).length;
    p.after = opts.deadline ? cs.filter((c) => c.date > end).length : 0;
    p.readme = cs.filter((c) => README.test(c.msg)).length;
    p.uploads = cs.filter((c) => UPLOAD.test(c.msg)).length;
    const generic = new Map();
    for (const c of cs) if (GENERIC.test(c.msg)) generic.set(c.msg.toLowerCase(), (generic.get(c.msg.toLowerCase()) || 0) + 1);
    p.genericCount = [...generic.values()].reduce((a, b) => a + b, 0);
    p.topGeneric = [...generic].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    p.first = cs.reduce((m, c) => Math.min(m, c.date), Infinity);
    p.last = cs.reduce((m, c) => Math.max(m, c.date), 0);
    p.onlyMsg = cs.length === 1 ? cs[0].msg : null;
    p.lines = linesFor(p, { lineMap, statsBy, forkWeek });
  }

  const totalCommits = counted.length;
  const linesKnown = people.filter((p) => p.lines !== null);
  const totalLines = linesKnown.reduce((s, p) => s + p.lines.a + p.lines.d, 0);
  const linesMissing = people.filter((p) => p.lines === null && p.count > 0);
  const linesState = !people.length ? 'none'
    : (lineMap || stats) ? (linesMissing.length === people.filter((p) => p.count > 0).length ? 'none' : linesMissing.length ? 'partial' : 'full')
      : 'none';

  // lines only when every person's lines are known: a split over some of the team would mislead
  const measure = opts.measure === 'lines' && linesState === 'full' && totalLines > 0 ? 'lines' : 'commits';
  for (const p of people) {
    p.value = measure === 'lines' ? (p.lines ? p.lines.a + p.lines.d : null) : p.count;
    const total = measure === 'lines' ? totalLines : totalCommits;
    p.share = p.value === null ? null : total ? p.value / total : 0;
  }
  roundPercents(people);
  people.sort((a, b) => (b.share ?? -1) - (a.share ?? -1) || b.count - a.count || a.first - b.first);

  const ranked = people.filter((p) => p.share !== null && (p.count > 0 || p.mergeCount > 0));
  assignBadges(ranked, { crunchMeaningful });
  const headline = makeHeadline(ranked);
  const lowest = pickLowest(ranked);
  const jab = lowest ? makeJab(lowest, { ranked, end, deadlineSet: !!opts.deadline, crunchMeaningful, measure }) : null;

  const windowTotal = counted.filter(inWindow).length;
  const afterTotal = opts.deadline ? counted.filter((c) => c.date > end).length : 0;

  return {
    measure,
    people,
    ranked,
    totalCommits,
    totalLines,
    mergeCount,
    bots,
    botCommits: bots.reduce((s, b) => s + b.count, 0),
    linesState,
    linesMissing: linesMissing.map((p) => p.display),
    linesMissingCommits: linesMissing.flatMap((p) => p.commits.map((c) => c.sha)),
    forkMode,
    forkSince,
    deadline: { end, start, set: !!opts.deadline, count: windowTotal, after: afterTotal, share: totalCommits ? windowTotal / totalCommits : 0, latest, meaningful: crunchMeaningful },
    headline,
    jab,
  };
}

function linesFor(p, { lineMap, statsBy, forkWeek }) {
  if (!p.commits.length) return { a: 0, d: 0 };
  // per-commit numbers cover everything they can; GitHub's weekly stats fill in for a linked account
  if (lineMap && p.commits.every((c) => lineMap.has(c.sha))) {
    return p.commits.reduce((s, c) => ({ a: s.a + lineMap.get(c.sha).a, d: s.d + lineMap.get(c.sha).d }), { a: 0, d: 0 });
  }
  const linked = p.commits.filter((c) => c.linked);
  const unlinked = p.commits.filter((c) => !c.linked);
  let a = 0; let d = 0;
  if (linked.length) {
    const s = p.login && statsBy.get(p.login.toLowerCase());
    if (s) {
      for (const w of s.weeks) if (forkWeek === null || w.w >= forkWeek) { a += w.a; d += w.d; }
    } else if (lineMap && linked.every((c) => lineMap.has(c.sha))) {
      for (const c of linked) { a += lineMap.get(c.sha).a; d += lineMap.get(c.sha).d; }
    } else return null;
  }
  if (unlinked.length) {
    if (!lineMap || !unlinked.every((c) => lineMap.has(c.sha))) return null;
    for (const c of unlinked) { a += lineMap.get(c.sha).a; d += lineMap.get(c.sha).d; }
  }
  return { a, d };
}

/** Whole percentages that add up to 100 (largest remainder). A share above 0 never shows as 0%. */
export function roundPercents(people) {
  const withShare = people.filter((p) => p.share !== null);
  const raw = withShare.map((p) => p.share * 100);
  const floors = raw.map(Math.floor);
  let left = Math.round(raw.reduce((a, b) => a + b, 0)) - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - floors[i], i]).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) { if (left <= 0) break; floors[i]++; left--; }
  withShare.forEach((p, i) => { p.pct = floors[i]; p.pctLabel = floors[i] === 0 && p.share > 0 ? '<1%' : `${floors[i]}%`; });
  people.filter((p) => p.share === null).forEach((p) => { p.pct = null; p.pctLabel = '–'; });
}

/**
 * Badge rules (one badge each, checked in this order):
 * - Carried: the biggest share, if it is at least 1.5x an even split and bigger than anyone else's. A solo project is carried too.
 * - Night-before: 2+ commits and at least half of them in the 24 hours before the deadline (only when the project spans more than 3 days).
 * - Moral support: a share under half of an even split.
 * - Solid: everyone else.
 */
export function assignBadges(ranked, { crunchMeaningful }) {
  const n = ranked.length;
  if (!n) return;
  const even = 1 / n;
  const [top, second] = ranked;
  for (const p of ranked) {
    if (n === 1 || (p === top && p.share >= 1.5 * even && (!second || p.share > second.share))) p.badge = 'carried';
    else if (crunchMeaningful && p.count >= 2 && p.window / p.count >= 0.5) p.badge = 'night';
    else if (p.share < 0.5 * even) p.badge = 'moral';
    else p.badge = 'solid';
  }
}

export const BADGES = {
  carried: { label: 'Carried', rule: 'The biggest share: at least 1.5× an even split, and more than anyone else.' },
  solid: { label: 'Solid', rule: 'Pulled their weight: everyone the other badges don’t describe.' },
  night: { label: 'Night-before', rule: '2 or more commits, at least half of them in the last 24 hours before the deadline.' },
  moral: { label: 'Moral support', rule: 'Less than half of an even split.' },
};

export function makeHeadline(ranked) {
  const n = ranked.length;
  if (!n) return { kind: 'none', text: 'Nothing to blame.' };
  const [a, b] = ranked;
  if (n === 1) return { kind: 'solo', text: `${a.display} did it all.`, who: a };
  if (a.badge === 'carried') return { kind: 'carried', text: `${a.display} carried.`, who: a };
  const even = 1 / n;
  if (n >= 3 && b.share >= 1.25 * even && b.share >= 0.8 * a.share) return { kind: 'pair', text: `${a.display} and ${b.display} carried.`, who: a, also: b };
  const min = ranked[n - 1].share;
  if (min > 0 && a.share / min <= 1.5) return { kind: 'fair', text: 'Shock: a fair split.', who: a };
  return { kind: 'most', text: `${a.display} did the most.`, who: a };
}

function pickLowest(ranked) {
  if (ranked.length < 2) return ranked[0] || null;
  return [...ranked].sort((x, y) => x.share - y.share || x.count - y.count || y.first - x.first)[0];
}

const plural = (n, word, words = `${word}s`) => `${n.toLocaleString('en-IN')} ${n === 1 ? word : words}`;
const quote = (s) => `‘${s.length > 30 ? `${s.slice(0, 29)}…` : s}’`;

/** The cheeky line about the smallest share. The first rule that fits wins; every number is from the repo. */
export function makeJab(p, { ranked, end, deadlineSet, crunchMeaningful, measure }) {
  const C = p.count;
  const who = p.display;
  if (ranked.length === 1) return `${who}: ${plural(C, 'commit')}, and nobody else to blame.`;
  if (C === 0 && p.mergeCount > 0) return `${who}: clicked merge ${plural(p.mergeCount, 'time')}, wrote 0 commits.`;
  if (p.readme && p.readme / C >= 0.5) {
    if (C === 1) return `${who}: 1 commit. It was the README.`;
    return p.readme === C ? `${who}: ${C} commits, all of them README.` : `${who}: ${C} commits, ${p.readme} of them README.`;
  }
  if (p.uploads && p.uploads / C >= 0.5) {
    return p.uploads === C && C > 1 ? `${who}: ${C} commits, all of them ‘Add files via upload’.`
      : C === 1 ? `${who}: 1 commit: ‘Add files via upload’.` : `${who}: ${C} commits, ${p.uploads} of them ‘Add files via upload’.`;
  }
  if (crunchMeaningful && C >= 2 && p.window === C) return `${who}: all ${C} commits in the last 24 hours.`;
  if (C === 1 && p.onlyMsg) return `${who}: 1 commit: ${quote(p.onlyMsg)}.`;
  if (C >= 2 && p.genericCount / C >= 0.5) return `${who}: ${C} commits, ${p.genericCount === C ? 'all' : p.genericCount} of them just ${quote(p.topGeneric)}.`;
  const daysBefore = Math.floor((end - p.last) / DAY);
  if (C && daysBefore >= 7) return `${who}: last commit ${daysBefore} days before the ${deadlineSet ? 'deadline' : 'final one'}.`;
  if (measure === 'lines' && p.lines) return `${who}: ${plural(C, 'commit')}, ${plural(p.lines.a + p.lines.d, 'line')} changed.`;
  return `${who}: ${plural(C, 'commit')}. ${p.pctLabel} of the work.`;
}
