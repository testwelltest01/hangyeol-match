// 한결 앱 아이콘 만들기: 하얀 바탕에 분홍·하늘 물결이 나란히 흐른다 (분홍이 조금 앞서고 하늘이 뒤따른다).
// 실행: node scripts/make-icons.mjs  (sharp는 next가 함께 설치한다)
// 바꾸면 public/sw.js의 VERSION도 올린다 (알림 아이콘을 캐시해서).
// iPhone·iPad 시작 화면(public/splash/)도 같은 물결로 함께 만든다. 시작 화면은 홈 화면에 추가할 때 받아가므로
// 이미 설치한 기기는 지우고 다시 추가해야 바뀐다.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

const PINK = ["#F8A0BE", "#EF5F92", "#DB3672"];
const SKY = ["#94D2FA", "#3AA6F0", "#1580DB"];

/** 가운데 선(fx, fy)과 폭 w(t)로 끝이 가는 리본. d(경로)와 pts(외곽 점, 가운데 맞추기용) */
function ribbon(fx, fy, w, n = 240) {
  const L = [];
  const R = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const e = 1e-4;
    const dx = fx(Math.min(1, t + e)) - fx(Math.max(0, t - e));
    const dy = fy(Math.min(1, t + e)) - fy(Math.max(0, t - e));
    const len = Math.hypot(dx, dy) || 1;
    const h = w(t) / 2;
    const x = fx(t);
    const y = fy(t);
    L.push([x - (dy / len) * h, y + (dx / len) * h]);
    R.push([x + (dy / len) * h, y - (dx / len) * h]);
  }
  const pts = [...L, ...R.reverse()];
  return { pts, d: "M" + pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L") + "Z" };
}

/** 기준 곡선에서 법선 방향으로 off만큼 떨어진 평행 곡선 (구간 t0..t1만) */
function offsetCurve(bx, by, off, t0 = 0, t1 = 1) {
  const e = 1e-4;
  const normal = (t) => {
    const dx = bx(Math.min(1, t + e)) - bx(Math.max(0, t - e));
    const dy = by(Math.min(1, t + e)) - by(Math.max(0, t - e));
    const len = Math.hypot(dx, dy) || 1;
    return [-dy / len, dx / len];
  };
  const T = (u) => t0 + (t1 - t0) * u;
  return [(u) => bx(T(u)) + normal(T(u))[0] * off, (u) => by(T(u)) + normal(T(u))[1] * off];
}

const taper = (W, a) => (t) => W * Math.pow(Math.sin(Math.PI * t), a);

/**
 * 두 물결의 경로. 같은 물결 하나를 기준으로 위(분홍)·아래(하늘)에 틈을 두고 나란히 놓는다.
 * k: 크기(마스커블은 안전 영역에 맞게 작게), W: 굵기 비율, gap: 두 물결 사이 틈 비율
 */
function waves(S, k, { W = 0.13, gap = 0.035 } = {}) {
  const c = S / 2;
  const sp = S * 0.36 * k;
  const bx = (t) => c - sp + 2 * sp * t;
  // 한 번 출렁이며 오른쪽으로 살짝 오른다
  const by = (t) => c - S * 0.08 * k * (t - 0.5) + S * 0.075 * k * Math.sin(2 * Math.PI * t);
  const w = S * W * k;
  const off = (w + S * gap * k) / 2;
  const stagger = 0.1; // 분홍은 조금 앞에서 시작하고, 하늘은 조금 뒤에서 끝난다
  const [px, py] = offsetCurve(bx, by, -off, 0, 1 - stagger);
  const [sx, sy] = offsetCurve(bx, by, off, stagger, 1);
  // 위쪽 가장자리를 따라 흐르는 옅은 빛 (비단 느낌)
  const sheen = (fx, fy) => {
    const [hx, hy] = offsetCurve(fx, fy, -w * 0.2);
    return ribbon(hx, hy, taper(w * 0.26, 1));
  };
  const parts = {
    pink: ribbon(px, py, taper(w, 0.8)),
    sky: ribbon(sx, sy, taper(w, 0.8)),
    pinkSheen: sheen(px, py),
    skySheen: sheen(sx, sy),
  };
  // 두 물결 전체가 정확히 가운데 오도록 옮긴다
  const all = [...parts.pink.pts, ...parts.sky.pts];
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const dx = c - (Math.min(...xs) + Math.max(...xs)) / 2;
  const dy = c - (Math.min(...ys) + Math.max(...ys)) / 2;
  return {
    transform: `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`,
    pink: parts.pink.d,
    sky: parts.sky.d,
    pinkSheen: parts.pinkSheen.d,
    skySheen: parts.skySheen.d,
  };
}

function grad(id, S, stops) {
  const step = 1 / (stops.length - 1);
  return `<linearGradient id="${id}" x1="0" y1="0" x2="${S}" y2="0" gradientUnits="userSpaceOnUse">${stops
    .map((s, i) => `<stop offset="${(i * step).toFixed(2)}" stop-color="${s}"/>`)
    .join("")}</linearGradient>`;
}

/** 물결 그림에 쓰는 색·그림자 (S: 물결을 그리는 칸 크기) */
function markDefs(S) {
  return `${grad("pink", S, PINK)}${grad("sky", S, SKY)}
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="${S * 0.012}"/>
      <feOffset dy="${S * 0.01}"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.12"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`;
}

/** S 칸 가운데에 그린 두 물결 */
function mark(S, k = 1) {
  const v = waves(S, k);
  return `<g transform="${v.transform}">
    <g filter="url(#shadow)"><path d="${v.pink}" fill="url(#pink)"/><path d="${v.sky}" fill="url(#sky)"/></g>
    <path d="${v.pinkSheen}" fill="#fff" opacity="0.32"/><path d="${v.skySheen}" fill="#fff" opacity="0.32"/>
  </g>`;
}

/**
 * shape: rounded = 둥근 사각(모서리 투명, 옅은 테두리) / square = 가장자리까지 하얀 바탕(iOS·마스커블)
 */
function iconSvg(S, { shape = "rounded", k = 1 } = {}) {
  const bg =
    shape === "rounded"
      ? `<rect width="${S}" height="${S}" rx="${S * 0.225}" fill="url(#bg)"/>
         <rect x="${S * 0.0025}" y="${S * 0.0025}" width="${S * 0.995}" height="${S * 0.995}" rx="${S * 0.224}" fill="none" stroke="#1f2f5c" stroke-opacity="0.08" stroke-width="${S * 0.005}"/>`
      : `<rect width="${S}" height="${S}" fill="url(#bg)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="75%">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.7" stop-color="#FDFDFE"/><stop offset="1" stop-color="#F3F5F9"/>
    </radialGradient>
    ${markDefs(S)}
  </defs>
  ${bg}
  ${mark(S, k)}
</svg>`;
}

// ---------------------------------------------------------------------------
// iPhone·iPad 시작 화면: 앱 바탕색 위에 물결 + '한결' + '결이 맞는 사람'
// 기기 목록은 src/lib/pwa/splash-devices.json (레이아웃과 함께 쓴다)
// ---------------------------------------------------------------------------
const TEXT = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/splash-text.json"), "utf8"));
const PAPER = "#f3f5f8";

/** 글자 외곽선(크기 1000, 기준선 0)을 가운데 cx, 기준선 y, 글자 크기 px로 놓는다 */
function text(t, cx, y, px, fill) {
  const s = px / 1000;
  const x = cx - ((t.x1 + t.x2) / 2) * s;
  return `<path d="${t.d}" fill="${fill}" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s})"/>`;
}

/** W×H 화면 픽셀, dpr 배율. 글자·물결 크기는 CSS px로 정하고 배율을 곱한다 */
function splashSvg(W, H, dpr) {
  const u = (n) => n * dpr;
  const S = u(190); // 물결 칸 (물결 폭은 이 칸의 약 70%)
  const word = u(34);
  const tag = u(14.5);
  // 물결 · 한결 · 문구를 한 묶음으로 보고, 묶음이 화면 가운데보다 살짝 위에 오게
  const markH = S * 0.42;
  const gap1 = u(26);
  const wordH = ((TEXT.wordmark.y2 - TEXT.wordmark.y1) / 1000) * word;
  const gap2 = u(14);
  const tagH = ((TEXT.tagline.y2 - TEXT.tagline.y1) / 1000) * tag;
  const total = markH + gap1 + wordH + gap2 + tagH;
  const top = H * 0.46 - total / 2;
  const cx = W / 2;
  const markCy = top + markH / 2;
  const wordBase = top + markH + gap1 - (TEXT.wordmark.y1 / 1000) * word;
  const tagBase = wordBase + (TEXT.wordmark.y2 / 1000) * word + gap2 - (TEXT.tagline.y1 / 1000) * tag;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${markDefs(S)}</defs>
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  <g transform="translate(${(cx - S / 2).toFixed(2)} ${(markCy - S / 2).toFixed(2)})">${mark(S)}</g>
  ${text(TEXT.wordmark, cx, wordBase, word, "#1f2f5c")}
  ${text(TEXT.tagline, cx, tagBase, tag, "#5b6478")}
</svg>`;
}

/** 안드로이드 알림 배지: 모양(투명도)만 쓰이므로 하얀 물결 실루엣. 작게 보여서 굵게, 틈은 넓게 */
function badgeSvg(S) {
  const v = waves(S, 1.25, { W: 0.16, gap: 0.07 });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"><g transform="${v.transform}"><path d="${v.pink}" fill="#fff"/><path d="${v.sky}" fill="#fff"/></g></svg>`;
}

const R = 4; // 크게 그린 뒤 줄여서 가장자리를 부드럽게
/** opaque: iOS·마스커블은 투명한 곳이 없어야 한다 (iOS는 투명을 검게 칠한다) */
async function sized(svgAt, size, out, { opaque = false } = {}) {
  const big = await sharp(Buffer.from(svgAt(size * R))).png().toBuffer();
  let img = sharp(big).resize(size, size, { kernel: "lanczos3" });
  if (opaque) img = img.flatten({ background: "#ffffff" }).removeAlpha();
  await img.png({ compressionLevel: 9 }).toFile(path.join(ROOT, out));
  console.log("wrote", out);
}

await sized((S) => iconSvg(S), 192, "public/icons/icon-192.png");
await sized((S) => iconSvg(S), 512, "public/icons/icon-512.png");
await sized((S) => iconSvg(S, { shape: "square", k: 0.92 }), 512, "public/icons/icon-maskable-512.png", { opaque: true });
await sized((S) => badgeSvg(S), 96, "public/icons/badge-96.png");
await sized((S) => iconSvg(S, { shape: "square", k: 1 }), 180, "src/app/apple-icon.png", { opaque: true });
await sized((S) => iconSvg(S, { k: 1.3 }), 96, "src/app/icon.png");

// 시작 화면: 지난 그림을 지우고 기기 목록대로 새로 만든다
const { devices } = JSON.parse(fs.readFileSync(path.join(ROOT, "src/lib/pwa/splash-devices.json"), "utf8"));
const SPLASH_DIR = path.join(ROOT, "public/splash");
fs.rmSync(SPLASH_DIR, { recursive: true, force: true });
fs.mkdirSync(SPLASH_DIR, { recursive: true });
const sizes = new Map();
for (const d of devices) {
  const [W, H] = [d.w * d.dpr, d.h * d.dpr];
  sizes.set(`${W}x${H}`, [W, H, d.dpr]);
  if (d.ipad) sizes.set(`${H}x${W}`, [H, W, d.dpr]);
}
for (const [name, [W, H, dpr]] of sizes) {
  await sharp(Buffer.from(splashSvg(W, H, dpr)))
    .flatten({ background: PAPER })
    .removeAlpha()
    .png({ compressionLevel: 9, palette: true, quality: 95 })
    .toFile(path.join(SPLASH_DIR, `${name}.png`));
}
console.log(`wrote public/splash/ (${sizes.size}장)`);
