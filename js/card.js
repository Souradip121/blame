// The share card: the verdict as a 1080 x 1920 tabloid front page, drawn on the phone.
import { cutout, disc, discCutout, loadImage, INK, YELLOW, PAPER } from './halftone.js';

const W = 1080;
const H = 1920;
const RED = '#E0251F';
const BG = '#EEEBE5';
const HEAD = 'Anton, "Arial Narrow", sans-serif';
const COND = '"Barlow Condensed", "Arial Narrow", sans-serif';

let seed = 1;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

/** A torn-paper rectangle path: jagged on every edge, `amp` px deep. */
function torn(g, x, y, w, h, amp = 7, step = 26) {
  g.beginPath();
  g.moveTo(x + rnd() * amp, y + rnd() * amp);
  for (let px = step; px < w; px += step * (0.6 + rnd() * 0.8)) g.lineTo(x + px, y + rnd() * amp);
  g.lineTo(x + w - rnd() * amp, y + rnd() * amp);
  for (let py = step; py < h; py += step * (0.8 + rnd())) g.lineTo(x + w - rnd() * amp * 0.6, y + py);
  g.lineTo(x + w - rnd() * amp, y + h - rnd() * amp);
  for (let px = w - step; px > 0; px -= step * (0.6 + rnd() * 0.8)) g.lineTo(x + px, y + h - rnd() * amp);
  g.lineTo(x + rnd() * amp, y + h - rnd() * amp);
  for (let py = h - step; py > 0; py -= step * (0.8 + rnd())) g.lineTo(x + rnd() * amp * 0.6, y + py);
  g.closePath();
}

function tape(g, x, y, w, h, color, { angle = 0, amp = 7, fiber = true } = {}) {
  g.save();
  g.translate(x + w / 2, y + h / 2);
  g.rotate(angle);
  if (fiber) { g.fillStyle = '#FAF8F3'; torn(g, -w / 2 - 9, -h / 2 - 8, w + 18, h + 16, amp + 4, 20); g.fill(); }
  g.fillStyle = color;
  torn(g, -w / 2, -h / 2, w, h, amp);
  g.fill();
  g.restore();
}

function grain(g) {
  const n = document.createElement('canvas');
  n.width = n.height = 256;
  const ng = n.getContext('2d');
  const img = ng.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random();
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v > 0.5 ? 255 : 0;
    img.data[i + 3] = Math.round(Math.random() * 16);
  }
  ng.putImageData(img, 0, 0);
  g.fillStyle = g.createPattern(n, 'repeat');
  g.fillRect(0, 0, W, H);
}

function fit(g, text, font, maxW, maxSize, minSize = 20, weight = '') {
  let size = maxSize;
  g.font = `${weight} ${size}px ${font}`;
  const w = g.measureText(text).width;
  if (w > maxW) size = Math.max(minSize, Math.floor(maxSize * (maxW / w)));
  return size;
}

function crown(g, x, y, s, angle) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.scale(s / 120, s / 120);
  g.strokeStyle = INK;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = 6;
  g.beginPath(); g.moveTo(14, 72); g.lineTo(7, 20); g.lineTo(35, 50); g.lineTo(55, 8); g.lineTo(74, 48); g.lineTo(106, 17); g.lineTo(97, 72); g.stroke();
  g.beginPath(); g.moveTo(16, 70); g.quadraticCurveTo(56, 64, 96, 68); g.stroke();
  g.restore();
}

function burst(g, x, y, s, angle) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.strokeStyle = INK;
  g.lineCap = 'round';
  g.lineWidth = 7;
  for (const [a, b, c, d] of [[0, -s, 0, -s * 0.45], [s * 0.7, -s * 0.6, s * 0.35, -s * 0.25], [s, 0.05 * s, s * 0.5, 0.05 * s]]) {
    g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke();
  }
  g.restore();
}

const BADGE_LABEL = { carried: 'Carried', solid: 'Solid', night: 'Night-before', moral: 'Moral support' };

/**
 * result: analyse() output. opts: { repoName, totalLabel, url, source(person) -> Promise<{kind, img}> }
 */
export async function drawCard(result, { repoName, countLabel, url, source }) {
  seed = 20261103;
  await Promise.all([
    document.fonts.load(`100px ${HEAD}`), document.fonts.load(`700 40px ${COND}`), document.fonts.load(`600 40px ${COND}`),
  ]).catch(() => {});
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = BG;
  g.fillRect(0, 0, W, H);
  grain(g);

  // masthead
  g.fillStyle = INK;
  g.font = `76px ${HEAD}`;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.fillText('Blame', W / 2, 108);
  g.fillRect(60, 132, W - 120, 4);
  g.fillRect(60, 142, W - 120, 1.5);

  // headline on yellow tape, EXCLUSIVE on red tape over it
  const head = result.headline.text;
  const hs = fit(g, head, HEAD, 940, 196, 70);
  const lines = hs <= 96 && head.includes(' ') ? splitTwo(g, head, hs * 1.25) : [head];
  const size = lines.length > 1 ? fit(g, lines.reduce((a, b) => (a.length > b.length ? a : b)), HEAD, 940, 150, 60) : hs;
  const tapeH = lines.length * size * 1.02 + size * 0.28;
  tape(g, 44, 244, W - 88, tapeH, YELLOW, { angle: -0.022 });
  g.save();
  g.translate(W / 2, 244 + tapeH / 2 + size * 0.04);
  g.rotate(-0.022);
  g.fillStyle = INK;
  g.font = `${size}px ${HEAD}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  lines.forEach((l, i) => g.fillText(l, 0, (i - (lines.length - 1) / 2) * size * 1.02 + size * 0.05));
  g.restore();
  tape(g, 52, 168, 330, 80, RED, { angle: -0.07, amp: 4, fiber: false });
  g.save();
  g.translate(52 + 165, 168 + 40); g.rotate(-0.07);
  g.fillStyle = '#fff'; g.font = `60px ${HEAD}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('EXCLUSIVE', 0, 3);
  g.restore();

  // the hero, printed
  const heroTop = 244 + tapeH + 24;
  const heroH = Math.max(420, 1010 - heroTop);
  const who = result.headline.who;
  try {
    // the painted swash behind the portrait (the same asset as the page)
    const sw = await loadImage('assets/swash.webp');
    const sww = Math.min(W * 1.02, heroH * 2.1); const swh = sww * (sw.naturalHeight / sw.naturalWidth);
    g.save();
    g.translate(W / 2 + 10, heroTop + heroH * 0.6);
    g.rotate(-0.24);
    g.drawImage(sw, -sww / 2, -swh / 2, sww, swh);
    g.restore();
  } catch {
    g.fillStyle = YELLOW;
    g.beginPath(); g.ellipse(W / 2, heroTop + heroH * 0.55, heroH * 0.52, heroH * 0.42, -0.12, 0, Math.PI * 2); g.fill();
  }
  if (who) {
    try {
      const s = await source(who);
      let art;
      if (s.kind === 'photo') art = disc(s.img, { size: heroH * 0.9, cell: 4.6 });
      else art = cutout(s.img, { w: heroH * 1.1, h: heroH, cell: 4.4, halo: 12 });
      g.drawImage(art, (W - art.width) / 2, heroTop + heroH - art.height);
    } catch { /* no picture: the tape and the text still carry it */ }
    if (result.headline.kind === 'carried' || result.headline.kind === 'solo' || result.headline.kind === 'pair') crown(g, W / 2 - heroH * 0.42, heroTop + 10, 150, -0.25);
  }
  burst(g, 130, heroTop + heroH * 0.45, 60, -2.4);
  burst(g, W - 140, heroTop + heroH * 0.25, 60, -0.2);

  // the jab, on a black strip
  let y = heroTop + heroH - 30;
  const jab = (result.jab || '').replace(/\.$/, '');
  if (jab) {
    const js = fit(g, jab, COND, 920, 50, 30, '700');
    g.save();
    g.translate(W / 2, y + 44);
    g.rotate(-0.014);
    g.fillStyle = INK;
    torn(g, -500, -44, 1000, 88, 5);
    g.fill();
    g.fillStyle = '#fff';
    g.font = `700 ${js}px ${COND}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(jab, 0, 2);
    g.restore();
    y += 88;
  }

  // the split
  y += 36;
  const rows = result.ranked.slice(0, 5);
  const rowH = rows.length > 4 ? 92 : 100;
  for (const p of rows) {
    const av = 76;
    try {
      const s = await source(p);
      const art = s.kind === 'photo' ? disc(s.img, { size: av, cell: 2.3 }) : discCutout(s.img, { size: av, cell: 2.3 });
      g.drawImage(art, 64, y + (rowH - av) / 2 - 4);
    } catch {
      g.fillStyle = YELLOW; g.beginPath(); g.arc(64 + av / 2, y + rowH / 2 - 4, av / 2, 0, Math.PI * 2); g.fill();
    }
    const x = 168;
    g.fillStyle = INK;
    g.textBaseline = 'alphabetic';
    g.textAlign = 'left';
    const ns = fit(g, p.display, COND, 430, 44, 26, '700');
    g.font = `700 ${ns}px ${COND}`;
    g.fillText(p.display, x, y + 44);
    const nw = g.measureText(p.display).width;
    if (p.badge) {
      g.font = `700 27px ${COND}`;
      const label = BADGE_LABEL[p.badge];
      const bw = g.measureText(label).width + 22;
      g.fillStyle = INK;
      g.fillRect(x + nw + 16, y + 14, bw, 36);
      g.fillStyle = YELLOW;
      g.fillText(label, x + nw + 27, y + 42);
    }
    g.fillStyle = INK;
    g.textAlign = 'right';
    g.font = `700 48px ${COND}`;
    g.fillText(p.pctLabel, W - 64, y + 46);
    g.fillStyle = '#DCDAD5';
    roundRect(g, x, y + 60, W - 64 - x, 18, 9); g.fill();
    g.fillStyle = YELLOW;
    roundRect(g, x, y + 60, Math.max(18, (W - 64 - x) * Math.min(1, p.share)), 18, 9); g.fill();
    y += rowH;
  }
  if (result.ranked.length > rows.length) {
    g.fillStyle = '#55524B'; g.font = `600 30px ${COND}`; g.textAlign = 'left';
    g.fillText(`+ ${result.ranked.length - rows.length} more`, 168, y + 20);
    y += 40;
  }

  // the deadline line
  const d = result.deadline;
  if (y < H - 330) {
    const bh = 112;
    const num = `${d.count.toLocaleString('en-IN')}`;
    g.font = `66px ${HEAD}`;
    const nw = g.measureText(num).width;
    g.font = `600 34px ${COND}`;
    const tw = Math.max(g.measureText(`${d.count === 1 ? 'commit' : 'commits'} in the last 24 hours`).width, g.measureText(`before the ${d.set ? 'deadline' : 'final commit'}`).width);
    tape(g, 50, y + 14, Math.min(W - 100, nw + tw + 110), bh, YELLOW, { angle: -0.012, amp: 6 });
    g.fillStyle = INK; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.font = `66px ${HEAD}`;
    g.fillText(num, 96, y + 14 + bh / 2 + 3);
    g.font = `600 34px ${COND}`;
    g.fillText(`${d.count === 1 ? 'commit' : 'commits'} in the last 24 hours`, 96 + nw + 22, y + 14 + bh / 2 - 18);
    g.fillText(`before the ${d.set ? 'deadline' : 'final commit'}`, 96 + nw + 22, y + 14 + bh / 2 + 20);
  }

  // small print and the foot
  g.fillStyle = '#55524B';
  g.font = `500 28px ${COND}`;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.fillText(`For fun: ${result.measure === 'lines' ? 'lines changed are' : 'commit counts are'} a rough measure of effort.`, W / 2, H - 148);
  g.fillStyle = '#1A1A19';
  g.beginPath();
  g.moveTo(0, H - 104);
  for (let x = 0; x <= W; x += 18) g.lineTo(x, H - 112 + rnd() * 16);
  g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
  g.fillStyle = '#fff';
  g.font = `600 34px ${COND}`;
  g.fillText(`${repoName} · ${countLabel}`, W / 2, H - 56);
  g.fillStyle = '#CFCBC2';
  g.font = `500 27px ${COND}`;
  g.fillText(url, W / 2, H - 20);

  return new Promise((resolve) => c.toBlob(resolve, 'image/png'));
}

function splitTwo(g, text, size) {
  const words = text.split(' ');
  let best = [text]; let bestW = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '); const b = words.slice(i).join(' ');
    g.font = `${size}px ${HEAD}`;
    const w = Math.max(g.measureText(a).width, g.measureText(b).width);
    if (w < bestW) { bestW = w; best = [a, b]; }
  }
  return best;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export { PAPER };
