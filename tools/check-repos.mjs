// Runs the same reading + counting as the page on real repos and prints the split and the verdict.
//   node tools/check-repos.mjs owner/repo [owner/repo ...]
// Optional: GITHUB_TOKEN in the environment (e.g. GITHUB_TOKEN=$(gh auth token)) for the 5,000-an-hour limit.
// Nothing is written to disk.
import { parseRepo, createClient } from '../js/github.js';
import { analyse } from '../js/analyze.js';

const token = process.env.GITHUB_TOKEN || '';
const repos = process.argv.slice(2);
if (!repos.length) { console.error('usage: node tools/check-repos.mjs owner/repo ...'); process.exit(1); }

for (const input of repos) {
  const gh = createClient({ token });
  const t0 = Date.now();
  try {
    const { owner, repo } = parseRepo(input);
    const meta = await gh.getRepo(owner, repo);
    const { commits, total, truncated } = await gh.getCommits(meta.owner.login, meta.name);
    let stats = null; let statsStatus = 'skipped (big repo)';
    if (!truncated) { const s = await gh.getStats(meta.owner.login, meta.name); stats = s.status === 'ok' ? s.data : null; statsStatus = s.status; }
    const r = analyse({ repo: meta, raw: commits, stats });
    const rl = analyse({ repo: meta, raw: commits, stats }, { measure: 'lines' });
    console.log(`\n=== ${meta.full_name}${meta.fork ? ` (fork of ${meta.parent?.full_name}, counting: ${r.forkMode})` : ''}`);
    console.log(`read ${commits.length} of ${total} commits${truncated ? ' (big repo: latest only)' : ''}; counted ${r.totalCommits}, merges ${r.mergeCount}, bots ${r.botCommits}; stats: ${statsStatus}; lines: ${r.linesState}; requests: ${gh.state.requests}; ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    for (const p of r.ranked.slice(0, 8)) {
      const l = rl.people.find((q) => q.key === p.key);
      console.log(`  ${p.display.padEnd(22)} ${p.pctLabel.padStart(4)}  ${String(p.count).padStart(4)} commits  ${(p.badge || '').padEnd(8)} ${rl.measure === 'lines' && l?.pctLabel ? `lines ${l.pctLabel}` : ''}`);
    }
    if (r.ranked.length > 8) console.log(`  … and ${r.ranked.length - 8} more`);
    console.log(`  headline: ${r.headline.text}`);
    console.log(`  jab:      ${r.jab}`);
    console.log(`  deadline: ${r.deadline.count} commits in the last 24 h before the final commit (${Math.round(r.deadline.share * 100)}%)`);
  } catch (e) {
    console.log(`\n=== ${input}\n  ${e.kind || 'error'}: ${e.message}`);
  }
}
