// Talks to the GitHub REST API (and GraphQL, only with a token) from the browser.
// Every request goes to api.github.com and nowhere else.

const API = 'https://api.github.com';
const PER_PAGE = 100;
export const PAGE_CAP = { anon: 10, token: 30 }; // pages of 100 commits read before calling it a big repo

export class GitHubError extends Error {
  constructor(kind, message, extra = {}) {
    super(message);
    this.kind = kind; // 'input' | 'notfound' | 'empty' | 'ratelimit' | 'badtoken' | 'blocked' | 'network' | 'http'
    Object.assign(this, extra);
  }
}

/** Accepts github.com/owner/repo, full URLs (with .git, /tree/..., ?tab=...), git@github.com:owner/repo and owner/repo. */
export function parseRepo(input) {
  let s = String(input || '').trim();
  if (!s) throw new GitHubError('input', 'Paste a GitHub repo link first.');
  s = s.replace(/^git\+/, '').replace(/^git@github\.com:/i, 'github.com/');
  s = s.replace(/^[a-z]+:\/\//i, '').replace(/^www\./i, '');
  s = s.split(/[?#]/)[0];
  if (/^github\.com\//i.test(s)) s = s.slice('github.com/'.length);
  else if (/^[^/]*\.[a-z]{2,}\//i.test(s)) throw new GitHubError('input', 'That isn’t a GitHub link. Paste something like github.com/owner/repo.');
  const parts = s.split('/').filter(Boolean);
  if (parts.length < 2) throw new GitHubError('input', 'That needs an owner and a repo, like github.com/owner/repo.');
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/i, '');
  const ok = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(owner) && /^[\w.-]{1,100}$/.test(repo) && repo !== '.' && repo !== '..';
  if (!ok) throw new GitHubError('input', 'That doesn’t look like a GitHub repo. Paste something like github.com/owner/repo.');
  return { owner, repo };
}

export function createClient({ token = '', fetchImpl = globalThis.fetch.bind(globalThis), sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  const state = { remaining: null, limit: null, reset: null, requests: 0 };

  function note(res) {
    const rem = res.headers.get('x-ratelimit-remaining');
    if (rem !== null && res.headers.get('x-ratelimit-resource') !== 'graphql') {
      state.remaining = Number(rem);
      state.limit = Number(res.headers.get('x-ratelimit-limit'));
      state.reset = Number(res.headers.get('x-ratelimit-reset')) * 1000;
    }
  }

  async function request(path, { allow = [], method = 'GET', body } = {}) {
    const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body) headers['Content-Type'] = 'application/json';
    let res;
    try {
      state.requests++;
      res = await fetchImpl(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
    } catch {
      throw new GitHubError('network', 'Couldn’t reach GitHub. Check your connection and try again.');
    }
    note(res);
    if (res.ok || allow.includes(res.status)) return res;
    let msg = '';
    try { msg = (await res.json()).message || ''; } catch { /* not json */ }
    const remaining = res.headers.get('x-ratelimit-remaining');
    if ((res.status === 403 || res.status === 429) && (remaining === '0' || /rate limit/i.test(msg))) {
      const reset = Number(res.headers.get('x-ratelimit-reset')) * 1000 || null;
      const retryAfter = Number(res.headers.get('retry-after')) || null;
      throw new GitHubError('ratelimit', rateLimitMessage(!!token, reset, retryAfter, /secondary/i.test(msg)), { reset, retryAfter });
    }
    if (res.status === 401) throw new GitHubError('badtoken', 'GitHub didn’t accept that token. Check it, or remove it to look at public repos.');
    if (res.status === 404) throw new GitHubError('notfound', 'notfound');
    if (res.status === 409 && /empty/i.test(msg)) throw new GitHubError('empty', 'This repo has no commits yet. Nothing to blame.');
    if (res.status === 451 || res.status === 403) throw new GitHubError('blocked', msg ? `GitHub won’t show this repo: ${msg}` : 'GitHub won’t show this repo.');
    throw new GitHubError('http', `GitHub answered ${res.status}${msg ? `: ${msg}` : ''}. Try again in a bit.`);
  }

  async function getRepo(owner, repo) {
    try {
      const res = await request(`/repos/${owner}/${repo}`);
      return await res.json();
    } catch (e) {
      if (e.kind === 'notfound') {
        throw new GitHubError('notfound', token
          ? `Can’t find ${owner}/${repo}. Check the link, and that your token can see this repo.`
          : `Can’t find ${owner}/${repo}. It’s private, renamed, or doesn’t exist. If it’s private, add a token below.`);
      }
      throw e;
    }
  }

  /** Reads the default branch's commits, newest first. Stops at the page cap and says how many there are in all. */
  async function getCommits(owner, repo, { onProgress = () => {} } = {}) {
    const cap = token ? PAGE_CAP.token : PAGE_CAP.anon;
    const first = await request(`/repos/${owner}/${repo}/commits?per_page=${PER_PAGE}&page=1`);
    const page1 = await first.json();
    let last = lastPage(first.headers.get('link'));
    // GitHub sometimes sends rel="last" smaller than rel="next" on tiny repos: trust the item count instead
    if (page1.length < PER_PAGE) last = 1;
    const pages = Math.min(last, cap);
    const all = [page1];
    onProgress(page1.length, Math.min(last, cap) * PER_PAGE);
    const queue = [];
    for (let p = 2; p <= pages; p++) queue.push(p);
    let loaded = page1.length;
    const results = new Map();
    async function worker() {
      while (queue.length) {
        const p = queue.shift();
        const res = await request(`/repos/${owner}/${repo}/commits?per_page=${PER_PAGE}&page=${p}`);
        const items = await res.json();
        results.set(p, items);
        loaded += items.length;
        onProgress(loaded, pages * PER_PAGE);
      }
    }
    await Promise.all([worker(), worker(), worker(), worker()]);
    for (let p = 2; p <= pages; p++) all.push(results.get(p) || []);
    const commits = all.flat();
    let total = commits.length;
    const truncated = last > cap;
    if (truncated) {
      // one more request for the exact total: with one commit per page, the last page number is the count
      const r = await request(`/repos/${owner}/${repo}/commits?per_page=1`);
      total = lastPage(r.headers.get('link')) || commits.length;
    }
    return { commits, total, truncated };
  }

  /**
   * Contributor stats (commits and lines per week, per linked GitHub account).
   * GitHub answers 202 while it computes them; retry a few times, then give up quietly.
   * Returns { status: 'ok', data } | { status: 'computing' } | { status: 'none' }.
   */
  async function getStats(owner, repo, { delays = [1500, 2500, 4000, 6000] } = {}) {
    for (let i = 0; ; i++) {
      const res = await request(`/repos/${owner}/${repo}/stats/contributors`, { allow: [202, 204] });
      if (res.status === 200) {
        const data = await res.json();
        return Array.isArray(data) ? { status: 'ok', data } : { status: 'none' };
      }
      if (res.status === 204) return { status: 'none' };
      if (i >= delays.length) return { status: 'computing' };
      await sleep(delays[i]);
    }
  }

  /** Lines for single commits over REST: one request each. Used for commits GitHub's stats can't attribute. */
  async function getCommitLines(owner, repo, shas, { onProgress = () => {} } = {}) {
    const out = new Map();
    const queue = [...shas];
    let done = 0;
    async function worker() {
      while (queue.length) {
        const sha = queue.shift();
        const res = await request(`/repos/${owner}/${repo}/commits/${sha}`);
        const c = await res.json();
        out.set(sha, { a: c.stats?.additions || 0, d: c.stats?.deletions || 0 });
        onProgress(++done, shas.length);
      }
    }
    await Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);
    return out;
  }

  /** With a token: lines for every commit on the default branch over GraphQL, 100 commits per request. */
  async function getLinesGraphQL(owner, repo, { maxCommits = PAGE_CAP.token * PER_PAGE, onProgress = () => {} } = {}) {
    if (!token) throw new Error('GraphQL needs a token');
    const query = `query($o:String!,$r:String!,$c:String){repository(owner:$o,name:$r){defaultBranchRef{target{...on Commit{history(first:100,after:$c){pageInfo{hasNextPage endCursor}nodes{oid additions deletions}}}}}}}`;
    const out = new Map();
    let cursor = null;
    while (out.size < maxCommits) {
      const res = await request('/graphql', { method: 'POST', body: { query, variables: { o: owner, r: repo, c: cursor } } });
      const json = await res.json();
      if (json.errors?.length) throw new GitHubError('http', json.errors[0].message || 'GraphQL error');
      const h = json.data?.repository?.defaultBranchRef?.target?.history;
      if (!h) break;
      for (const n of h.nodes) out.set(n.oid, { a: n.additions, d: n.deletions });
      onProgress(out.size);
      if (!h.pageInfo.hasNextPage) break;
      cursor = h.pageInfo.endCursor;
    }
    return out;
  }

  return { state, request, getRepo, getCommits, getStats, getCommitLines, getLinesGraphQL, hasToken: !!token };
}

export function lastPage(link) {
  if (!link) return 1;
  const m = /[?&]page=(\d+)[^>]*>;\s*rel="last"/.exec(link);
  return m ? Number(m[1]) : 1;
}

function clock(ms) {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function rateLimitMessage(hasToken, reset, retryAfter, secondary) {
  if (secondary || (retryAfter && !reset)) {
    return `GitHub asked us to slow down. Wait ${retryAfter ? `${Math.ceil(retryAfter / 60)} minute${retryAfter > 60 ? 's' : ''}` : 'a minute'} and try again.`;
  }
  const when = reset ? ` It resets at ${clock(reset)}.` : '';
  return hasToken
    ? `This token has used up its GitHub lookups for the hour.${when}`
    : `GitHub allows 60 lookups an hour without a token, and this network has used them.${when} Add a token below to keep going.`;
}
