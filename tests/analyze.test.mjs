import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyse, identities, normalise, isBot, roundPercents } from '../js/analyze.js';
import { parseRepo, lastPage, createClient } from '../js/github.js';

const demo = JSON.parse(readFileSync(new URL('./fixtures/hostel-mess-app.json', import.meta.url)));

// ---- a tiny commit factory ----------------------------------------------------
let n = 0;
function c({ name, email = `${name.toLowerCase().replace(/\W/g, '')}@x.example`, login = null, type = 'User', date, msg = 'work', merge = false }) {
  n++;
  return {
    sha: `sha${n}`,
    commit: { author: { name, email, date }, message: msg },
    author: login ? { login, id: n, avatar_url: `https://avatars.githubusercontent.com/u/${n}?v=4`, type } : null,
    parents: merge ? [{ sha: 'a' }, { sha: 'b' }] : [{ sha: 'a' }],
  };
}
const day = (d, h = 12) => `2026-10-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:00:00Z`;

// ---- parsing links --------------------------------------------------------------
test('parseRepo accepts every shape people paste', () => {
  const want = { owner: 'team-7', repo: 'hostel-mess-app' };
  for (const s of [
    'github.com/team-7/hostel-mess-app', 'https://github.com/team-7/hostel-mess-app', 'http://www.github.com/team-7/hostel-mess-app/',
    'https://github.com/team-7/hostel-mess-app.git', 'https://github.com/team-7/hostel-mess-app/tree/main/src', 'team-7/hostel-mess-app',
    '  github.com/team-7/hostel-mess-app?tab=readme  ', 'git@github.com:team-7/hostel-mess-app.git', 'https://github.com/team-7/hostel-mess-app#readme',
  ]) assert.deepEqual(parseRepo(s), want, s);
});

test('parseRepo explains what is wrong', () => {
  assert.throws(() => parseRepo(''), /Paste a GitHub repo link/);
  assert.throws(() => parseRepo('github.com/just-owner'), /owner and a repo/);
  assert.throws(() => parseRepo('https://gitlab.com/a/b'), /isn’t a GitHub link/);
  assert.throws(() => parseRepo('github.com/-bad-/x'), /doesn’t look like a GitHub repo/);
});

test('lastPage reads the Link header', () => {
  assert.equal(lastPage('<https://api.github.com/x?per_page=100&page=2>; rel="next", <https://api.github.com/x?per_page=100&page=15067>; rel="last"'), 15067);
  assert.equal(lastPage(null), 1);
});

// ---- the demo repo ------------------------------------------------------------
test('demo repo: Riya carried, Tisha 3 commits, 2 of them README', () => {
  const r = analyse(demo);
  assert.equal(r.totalCommits, 95);
  assert.equal(r.mergeCount, 2);
  assert.deepEqual(r.ranked.map((p) => [p.display, p.count, p.badge]), [
    ['Riya', 58, 'carried'], ['Arjun', 25, 'solid'], ['Soham', 9, 'night'], ['Tisha', 3, 'moral'],
  ]);
  assert.equal(r.ranked.reduce((s, p) => s + p.pct, 0), 100);
  assert.equal(r.headline.text, 'Riya carried.');
  assert.equal(r.jab, 'Tisha: 3 commits, 2 of them README.');
  assert.equal(r.deadline.count, 26); // 12 + 6 + 7 + 1 in the last 24 hours
  assert.equal(r.linesState, 'none'); // no emails linked, no stats, no per-commit lines
  assert.equal(r.measure, 'commits');
});

test('demo repo: Arjun’s two emails are one person (same name, no account)', () => {
  const r = analyse(demo);
  const arjun = r.people.find((p) => p.display === 'Arjun');
  assert.equal(arjun.emails.size, 2);
});

test('a deadline moves the window and counts what came after it', () => {
  const deadline = Date.parse('2026-11-03T18:00:00+05:30');
  const r = analyse(demo, { deadline });
  assert.equal(r.deadline.set, true);
  assert.ok(r.deadline.after > 0);
  const latest = analyse(demo);
  assert.notEqual(r.deadline.count, latest.deadline.count);
});

test('lines mode uses per-commit numbers when it has them', () => {
  const lineMap = new Map(demo.raw.map((x, i) => [x.sha, { a: i % 7 + 1, d: i % 3 }]));
  const r = analyse({ ...demo, lineMap }, { measure: 'lines' });
  assert.equal(r.linesState, 'full');
  assert.equal(r.measure, 'lines');
  assert.ok(r.totalLines > 0);
  assert.equal(r.ranked.reduce((s, p) => s + p.pct, 0), 100);
});

// ---- people and bots ------------------------------------------------------------
test('two emails linked to one login are one person; bots are left out', () => {
  const raw = [
    c({ name: 'Riya S', email: 'riya@college.example', login: 'riya-s', date: day(1) }),
    c({ name: 'Riya Sharma', email: 'riya@gmail.example', login: 'riya-s', date: day(2) }),
    c({ name: 'dependabot[bot]', email: '49699333+dependabot[bot]@users.noreply.github.com', login: 'dependabot[bot]', type: 'Bot', date: day(3) }),
    c({ name: 'github-actions', email: 'actions@github.com', date: day(4) }),
    c({ name: 'Arjun', login: 'arjun', date: day(5) }),
  ];
  const { commits, bots } = normalise(raw);
  assert.equal(commits.length, 3);
  assert.equal(bots.length, 2);
  const people = identities(commits);
  assert.equal(people.length, 2);
  assert.equal(people.find((p) => p.login === 'riya-s').commits.length, 2);
});

test('an unlinked email joins the account that used the same name', () => {
  const raw = [
    c({ name: 'Soham Das', login: 'sohamd', date: day(1) }),
    c({ name: 'soham das', email: 'soham@lab-pc.local', date: day(2) }),
    c({ name: 'Tisha', date: day(3) }),
  ];
  const people = identities(normalise(raw).commits);
  assert.equal(people.length, 2);
  assert.equal(people.find((p) => p.login === 'sohamd').commits.length, 2);
});

test('isBot catches the usual suspects and spares people', () => {
  assert.ok(isBot(c({ name: 'renovate[bot]', login: 'renovate[bot]', type: 'Bot', date: day(1) })));
  assert.ok(isBot(c({ name: 'Copilot', login: 'Copilot', type: 'Bot', date: day(1) })));
  assert.ok(!isBot(c({ name: 'Bottu Ramesh', login: 'bottu', date: day(1) })));
});

test('same first name twice: first name and last initial, else the login', () => {
  const raw = [
    c({ name: 'Rahul Verma', login: 'rv', date: day(1) }),
    c({ name: 'Rahul Gupta', login: 'rg', date: day(2) }),
    c({ name: 'Sebastian "Sebbie" Silbermann', login: 'eps', date: day(3) }),
    c({ name: 'Sebastian Markbage', login: 'seb', date: day(4) }),
    c({ name: 'Neha Shah', login: 'neha1', date: day(5) }),
    c({ name: 'Neha Singh', login: 'neha2', date: day(6) }),
  ];
  const r = analyse({ repo: {}, raw });
  assert.deepEqual(r.people.map((p) => p.display).sort(), ['Rahul G.', 'Rahul V.', 'Sebastian M.', 'Sebastian S.', 'neha1', 'neha2']);
});

// ---- merges, forks, verdicts -----------------------------------------------------
test('merge commits are not counted, and a merge-only person gets called out', () => {
  const raw = [
    ...Array.from({ length: 6 }, (_, i) => c({ name: 'Riya', login: 'riya', date: day(1 + i) })),
    ...Array.from({ length: 5 }, (_, i) => c({ name: 'Arjun', login: 'arjun', date: day(2 + i) })),
    c({ name: 'Kabir', login: 'kabir', date: day(8), merge: true, msg: "Merge pull request #2 from riya/ui" }),
    c({ name: 'Kabir', login: 'kabir', date: day(9), merge: true, msg: "Merge pull request #3 from arjun/api" }),
  ];
  const r = analyse({ repo: {}, raw });
  assert.equal(r.totalCommits, 11);
  assert.equal(r.mergeCount, 2);
  assert.equal(r.jab, 'Kabir: clicked merge 2 times, wrote 0 commits.');
});

test('a fork counts only what came after the fork, if anything did', () => {
  const raw = [
    ...Array.from({ length: 30 }, (_, i) => c({ name: 'Prof Rao', login: 'prof', date: day(1, 9 + (i % 10)) })),
    c({ name: 'Meera', login: 'meera', date: day(20) }),
    c({ name: 'Meera', login: 'meera', date: day(21) }),
    c({ name: 'Dev', login: 'dev', date: day(22) }),
  ];
  const repo = { fork: true, created_at: day(15) };
  const r = analyse({ repo, raw });
  assert.equal(r.forkMode, 'after');
  assert.deepEqual(r.ranked.map((p) => p.display), ['Meera', 'Dev']);
  const all = analyse({ repo, raw }, { forkMode: 'all' });
  assert.equal(all.ranked[0].display, 'Prof');
});

test('a fork with nothing new counts everything', () => {
  const raw = [c({ name: 'A', login: 'a', date: day(1) }), c({ name: 'B', login: 'b', date: day(2) })];
  assert.equal(analyse({ repo: { fork: true, created_at: day(20) }, raw }).forkMode, 'all');
});

test('even split headline, solo headline, empty', () => {
  const even = [
    ...Array.from({ length: 5 }, (_, i) => c({ name: 'Asha', login: 'asha', date: day(1 + i) })),
    ...Array.from({ length: 4 }, (_, i) => c({ name: 'Bilal', login: 'bilal', date: day(1 + i, 15) })),
    ...Array.from({ length: 4 }, (_, i) => c({ name: 'Chitra', login: 'chitra', date: day(1 + i, 18) })),
  ];
  assert.equal(analyse({ repo: {}, raw: even }).headline.text, 'Shock: a fair split.');
  const solo = Array.from({ length: 3 }, (_, i) => c({ name: 'Zoya', login: 'zoya', date: day(1 + i) }));
  const s = analyse({ repo: {}, raw: solo });
  assert.equal(s.headline.text, 'Zoya did it all.');
  assert.equal(s.ranked[0].badge, 'carried');
  assert.equal(analyse({ repo: {}, raw: [] }).headline.text, 'Nothing to blame.');
});

test('night-before needs a project longer than 3 days', () => {
  const hackathon = [
    ...Array.from({ length: 6 }, (_, i) => c({ name: 'Ira', login: 'ira', date: `2026-10-10T${String(8 + i).padStart(2, '0')}:00:00Z` })),
    ...Array.from({ length: 4 }, (_, i) => c({ name: 'Om', login: 'om', date: `2026-10-10T${String(9 + i).padStart(2, '0')}:30:00Z` })),
  ];
  const r = analyse({ repo: {}, raw: hackathon });
  assert.ok(r.ranked.every((p) => p.badge !== 'night'));
});

test('jab rules: uploads, single commit, generic messages, gone quiet', () => {
  const base = Array.from({ length: 20 }, (_, i) => c({ name: 'Lead', login: 'lead', date: day(1 + i) }));
  const up = analyse({ repo: {}, raw: [...base, c({ name: 'Up', login: 'up', date: day(5), msg: 'Add files via upload' }), c({ name: 'Up', login: 'up', date: day(6), msg: 'Add files via upload' })] });
  assert.equal(up.jab, 'Up: 2 commits, all of them ‘Add files via upload’.');
  const one = analyse({ repo: {}, raw: [...base, c({ name: 'Solo', login: 'solo', date: day(20), msg: 'Initial commit' })] });
  assert.equal(one.jab, 'Solo: 1 commit: ‘Initial commit’.');
  const gen = analyse({ repo: {}, raw: [...base, c({ name: 'Gen', login: 'gen', date: day(18), msg: 'update' }), c({ name: 'Gen', login: 'gen', date: day(19), msg: 'update' }), c({ name: 'Gen', login: 'gen', date: day(17), msg: 'navbar' })] });
  assert.equal(gen.jab, 'Gen: 3 commits, 2 of them just ‘update’.');
  const quiet = analyse({ repo: {}, raw: [...base, c({ name: 'Q', login: 'q', date: day(2), msg: 'login page' }), c({ name: 'Q', login: 'q', date: day(3), msg: 'signup page' })] });
  assert.equal(quiet.jab, 'Q: last commit 17 days before the final one.');
});

test('percentages add up to 100 and tiny shares show as <1%', () => {
  const people = [{ share: 0.995 }, { share: 0.004 }, { share: 0.001 }];
  roundPercents(people);
  assert.equal(people.reduce((s, p) => s + p.pct, 0), 100);
  assert.equal(people[2].pctLabel, '<1%');
});

// ---- the API client, with a fake fetch -------------------------------------------
function fakeFetch(routes) {
  const calls = [];
  const f = async (url) => {
    calls.push(url);
    const path = url.replace('https://api.github.com', '');
    const hit = routes.find(([re]) => re.test(path));
    if (!hit) return new Response('{"message":"Not Found"}', { status: 404, headers: { 'x-ratelimit-remaining': '50' } });
    const [, make] = hit;
    const { status = 200, body = [], headers = {} } = typeof make === 'function' ? make(path) : make;
    return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'x-ratelimit-remaining': '50', 'x-ratelimit-limit': '60', 'x-ratelimit-reset': '1794564772', ...headers } });
  };
  f.calls = calls;
  return f;
}

test('stats: retries while GitHub answers 202, then returns the data', async () => {
  let tries = 0;
  const fetchImpl = fakeFetch([[/stats\/contributors/, () => (++tries < 3 ? { status: 202, body: {} } : { body: [{ author: { login: 'a' }, total: 1, weeks: [] }] })]]);
  const gh = createClient({ fetchImpl, sleep: async () => {} });
  const s = await gh.getStats('o', 'r');
  assert.equal(s.status, 'ok');
  assert.equal(tries, 3);
});

test('stats: gives up quietly if GitHub is still computing', async () => {
  const gh = createClient({ fetchImpl: fakeFetch([[/stats/, { status: 202, body: {} }]]), sleep: async () => {} });
  assert.equal((await gh.getStats('o', 'r')).status, 'computing');
});

test('rate limit, missing repo, empty repo and a bad token each get a plain message', async () => {
  const limited = createClient({ fetchImpl: fakeFetch([[/./, { status: 403, body: { message: 'API rate limit exceeded for 1.2.3.4.' }, headers: { 'x-ratelimit-remaining': '0' } }]]) });
  await assert.rejects(limited.getRepo('o', 'r'), (e) => e.kind === 'ratelimit' && /60 lookups an hour/.test(e.message));
  const missing = createClient({ fetchImpl: fakeFetch([]) });
  await assert.rejects(missing.getRepo('o', 'r'), (e) => e.kind === 'notfound' && /private, renamed/.test(e.message));
  const empty = createClient({ fetchImpl: fakeFetch([[/commits/, { status: 409, body: { message: 'Git Repository is empty.' } }]]) });
  await assert.rejects(empty.getCommits('o', 'r'), (e) => e.kind === 'empty');
  const bad = createClient({ token: 'x', fetchImpl: fakeFetch([[/./, { status: 401, body: { message: 'Bad credentials' } }]]) });
  await assert.rejects(bad.getRepo('o', 'r'), (e) => e.kind === 'badtoken');
});

test('commits: reads every page up to the cap, then asks for the exact total', async () => {
  const page = (p) => Array.from({ length: 100 }, (_, i) => ({ sha: `p${p}-${i}` }));
  const fetchImpl = fakeFetch([
    [/commits\?per_page=1$/, { body: [{}], headers: { link: '<https://api.github.com/x?per_page=1&page=2>; rel="next", <https://api.github.com/x?per_page=1&page=21791>; rel="last"' } }],
    [/commits\?per_page=100&page=(\d+)/, (path) => ({ body: page(path.match(/page=(\d+)/)[1]), headers: { link: '<https://api.github.com/x?per_page=100&page=218>; rel="last"' } })],
  ]);
  const gh = createClient({ fetchImpl });
  const r = await gh.getCommits('o', 'r');
  assert.equal(r.commits.length, 1000);
  assert.equal(r.truncated, true);
  assert.equal(r.total, 21791);
});

test('commits: a token is never sent anywhere but api.github.com', async () => {
  const seen = [];
  const fetchImpl = async (url, opts) => { seen.push([url, opts.headers.Authorization]); return new Response('[]', { status: 200 }); };
  const gh = createClient({ token: 'github_pat_TEST', fetchImpl });
  await gh.getCommits('o', 'r');
  assert.ok(seen.every(([u]) => u.startsWith('https://api.github.com/')));
  assert.equal(seen[0][1], 'Bearer github_pat_TEST');
});
