// Newsprint halftone on canvas: every face on the page is printed as black dots.
// Cut-outs (transparent PNG/WebP) get a paper-white fill and a yellow halo, like a
// clipped tabloid photo; square avatars are printed onto a yellow disc.

export const INK = '#141414';
export const YELLOW = '#FCE015';
export const PAPER = '#F4F2EC';

const imgCache = new Map();

/** Load an image that canvas may read back (GitHub avatars send CORS headers). */
export function loadImage(src) {
  if (imgCache.has(src)) return imgCache.get(src);
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image failed: ${src}`));
    img.src = src;
  });
  imgCache.set(src, p);
  p.catch(() => imgCache.delete(src));
  return p;
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** Draw `src` into a w x h canvas, covering it, with the focus point at (fx, fy). */
function cover(src, w, h, { fx = 0.5, fy = 0.5, zoom = 1 } = {}) {
  const sw = src.naturalWidth || src.width;
  const sh = src.naturalHeight || src.height;
  const s = Math.max(w / sw, h / sh) * zoom;
  const dw = sw * s; const dh = sh * s;
  const c = canvas(w, h);
  c.getContext('2d').drawImage(src, (w - dw) * fx, (h - dh) * fy, dw, dh);
  return c;
}

/** Same as cover, but fits the whole image in (for cut-outs). */
function contain(src, w, h, { fy = 1 } = {}) {
  const sw = src.naturalWidth || src.width;
  const sh = src.naturalHeight || src.height;
  const s = Math.min(w / sw, h / sh);
  const dw = sw * s; const dh = sh * s;
  const c = canvas(w, h);
  c.getContext('2d').drawImage(src, (w - dw) / 2, (h - dh) * fy, dw, dh);
  return c;
}

/**
 * Print the luminance of `src` (a canvas the same size as ctx's target region) as dots.
 * cell: dot pitch in device px. Levels are stretched per image so dim avatars still print.
 */
function dots(ctx, src, { cell, angle = Math.PI / 4, ink = INK, gamma = 0.9, levels = true }) {
  const w = src.width; const h = src.height;
  const data = src.getContext('2d').getImageData(0, 0, w, h).data;
  let lo = 0; let hi = 1;
  if (levels) {
    const hist = new Uint32Array(64); let n = 0;
    for (let i = 0; i < data.length; i += 16) {
      if (data[i + 3] < 128) continue;
      hist[Math.min(63, ((0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 4) | 0)]++; n++;
    }
    let acc = 0; let a = -1; let b = 63;
    for (let k = 0; k < 64; k++) { acc += hist[k]; if (a < 0 && acc > n * 0.02) a = k; if (acc > n * 0.985) { b = k; break; } }
    if (n > 50 && b > a) { lo = (a * 4) / 255; hi = Math.min(1, ((b + 1) * 4) / 255); }
  }
  const cos = Math.cos(angle); const sin = Math.sin(angle);
  const cx = w / 2; const cy = h / 2;
  const reach = Math.ceil(Math.hypot(w, h) / 2 / cell) + 1;
  const maxR = cell * 0.72;
  ctx.fillStyle = ink;
  ctx.beginPath();
  for (let i = -reach; i <= reach; i++) {
    for (let j = -reach; j <= reach; j++) {
      const x = cx + i * cell * cos - j * cell * sin;
      const y = cy + i * cell * sin + j * cell * cos;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const p = ((y | 0) * w + (x | 0)) * 4;
      const alpha = data[p + 3] / 255;
      if (alpha < 0.15) continue;
      let lum = (0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]) / 255;
      lum = Math.min(1, Math.max(0, (lum - lo) / (hi - lo)));
      const dark = Math.pow(1 - lum, gamma) * alpha;
      const r = maxR * Math.sqrt(dark);
      if (r < 0.45) continue;
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
  }
  ctx.fill();
}

function tint(src, color) {
  const c = canvas(src.width, src.height);
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

/**
 * A cut-out (transparent background) printed as a clipped tabloid photo:
 * yellow halo, paper-white body, black dots. Returns a canvas of w x h CSS px at dpr.
 */
export function cutout(img, { w, h, dpr = 1, cell = 3.2, halo = 7, haloColor = YELLOW, fill = PAPER, fy = 1, pad = 0 }) {
  const W = w * dpr; const H = h * dpr; const P = pad * dpr;
  const inner = contain(img, W - P * 2, H - P, { fy });
  const out = canvas(W, H);
  const g = out.getContext('2d');
  if (halo) {
    const t = tint(inner, haloColor);
    const R = halo * dpr;
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      g.drawImage(t, P + Math.cos(a) * R, P + Math.sin(a) * R);
    }
  }
  g.drawImage(tint(inner, fill), P, P);
  g.save();
  g.translate(P, P);
  dots(g, inner, { cell: cell * dpr });
  g.restore();
  return out;
}

/** A square photo (a GitHub avatar) printed onto a yellow disc. */
export function disc(img, { size, dpr = 1, cell = 2.6, bg = YELLOW, zoom = 1.04 }) {
  const S = size * dpr;
  const src = cover(img, S, S, { zoom });
  const out = canvas(S, S);
  const g = out.getContext('2d');
  g.beginPath();
  g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = bg;
  g.fillRect(0, 0, S, S);
  dots(g, src, { cell: cell * dpr, gamma: 1.05 });
  return out;
}

/** A cut-out on a yellow disc (the demo portraits and the unknown-suspect silhouette). */
export function discCutout(img, { size, dpr = 1, cell = 2.6, bg = YELLOW, fill = PAPER, zoom = 1.12, fy = 0.15 }) {
  const S = size * dpr;
  const src = cover(img, S, S, { zoom, fy });
  const out = canvas(S, S);
  const g = out.getContext('2d');
  g.beginPath();
  g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = bg;
  g.fillRect(0, 0, S, S);
  g.drawImage(tint(src, fill), 0, 0);
  dots(g, src, { cell: cell * dpr, gamma: 1.25 });
  return out;
}

/** Head-and-shoulders silhouette for people with no GitHub account linked: identity withheld. */
export function silhouette(size = 512) {
  const c = canvas(size, size);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size * 0.4, size * 0.3, size * 0.05, size * 0.5, size * 0.55, size * 0.65);
  grad.addColorStop(0, '#9a9a9a');
  grad.addColorStop(0.55, '#4a4a4a');
  grad.addColorStop(1, '#1e1e1e');
  g.fillStyle = grad;
  g.beginPath();
  g.ellipse(size * 0.5, size * 0.38, size * 0.17, size * 0.2, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(size * 0.08, size);
  g.bezierCurveTo(size * 0.1, size * 0.72, size * 0.28, size * 0.62, size * 0.5, size * 0.62);
  g.bezierCurveTo(size * 0.72, size * 0.62, size * 0.9, size * 0.72, size * 0.92, size);
  g.closePath();
  g.fill();
  // the question mark, printed out of the face
  g.fillStyle = '#d8d8d8';
  g.font = `${Math.round(size * 0.22)}px Anton, Impact, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('?', size * 0.5, size * 0.4);
  return c;
}
