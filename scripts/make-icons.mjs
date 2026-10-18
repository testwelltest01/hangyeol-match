// 한결 앱 아이콘 만들기: 하얀 바탕에 분홍·하늘 물결이 엇갈리며 만난다. 겹친 곳은 라벤더.
// 실행: node scripts/make-icons.mjs  (sharp는 next가 함께 설치한다)
// 바꾸면 public/sw.js의 VERSION도 올린다 (알림 아이콘을 캐시해서).
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

const PINK = ["#FBD5E0", "#F3A9BF", "#E3829F"];
const SKY = ["#D3ECFC", "#9ACFF3", "#62ACE5"];
const LAVENDER = ["#D9C3EE", "#B9B4EE"];

/** 가운데 선(fx, fy)과 폭 w(t)로 끝이 가는 리본 경로 */
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
  return "M" + [...L, ...R.reverse()].map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L") + "Z";
}

const taper = (W, a) => (t) => W * Math.pow(Math.sin(Math.PI * t), a);

/** 두 물결의 경로. k: 크기(마스커블은 안전 영역에 맞게 작게), W: 굵기 비율 */
function waves(S, k, W = 0.13) {
  const c = S / 2;
  const sp = S * 0.35 * k;
  const X = (t) => c - sp + 2 * sp * t;
  const drift = (t) => S * 0.06 * k * Math.sin(2 * Math.PI * t);
  const pinkY = (t) => c + S * 0.1 * k * Math.cos(Math.PI * t) - drift(t);
  const skyY = (t) => c - S * 0.1 * k * Math.cos(Math.PI * t) - drift(t);
  const w = S * W * k;
  // 위쪽 가장자리를 따라 흐르는 옅은 빛 (비단 느낌)
  const sheen = (fy) => ribbon(X, (t) => fy(t) - w * 0.22 * Math.pow(Math.sin(Math.PI * t), 0.8), taper(w * 0.28, 1));
  return {
    pink: ribbon(X, pinkY, taper(w, 0.8)),
    sky: ribbon(X, skyY, taper(w, 0.8)),
    pinkSheen: sheen(pinkY),
    skySheen: sheen(skyY),
  };
}

function grad(id, S, stops) {
  const step = 1 / (stops.length - 1);
  return `<linearGradient id="${id}" x1="0" y1="0" x2="${S}" y2="0" gradientUnits="userSpaceOnUse">${stops
    .map((s, i) => `<stop offset="${(i * step).toFixed(2)}" stop-color="${s}"/>`)
    .join("")}</linearGradient>`;
}

/**
 * shape: rounded = 둥근 사각(모서리 투명, 옅은 테두리) / square = 가장자리까지 하얀 바탕(iOS·마스커블)
 */
function iconSvg(S, { shape = "rounded", k = 1 } = {}) {
  const v = waves(S, k);
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
    ${grad("pink", S, PINK)}${grad("sky", S, SKY)}${grad("lav", S, LAVENDER)}
    <clipPath id="skyClip"><path d="${v.sky}"/></clipPath>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="${S * 0.012}"/>
      <feOffset dy="${S * 0.01}"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.1"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  ${bg}
  <g filter="url(#shadow)"><path d="${v.sky}" fill="url(#sky)"/><path d="${v.pink}" fill="url(#pink)"/></g>
  <path d="${v.pink}" clip-path="url(#skyClip)" fill="url(#lav)"/>
  <path d="${v.skySheen}" fill="#fff" opacity="0.35"/><path d="${v.pinkSheen}" fill="#fff" opacity="0.35"/>
</svg>`;
}

/** 안드로이드 알림 배지: 모양(투명도)만 쓰이므로 하얀 물결 실루엣. 작게 보여서 굵게, 엇갈리는 곳에 틈을 둬서 두 물결로 보이게 */
function badgeSvg(S) {
  const v = waves(S, 1.28, 0.17);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs><mask id="gap" maskUnits="userSpaceOnUse" x="0" y="0" width="${S}" height="${S}">
    <rect width="${S}" height="${S}" fill="#fff"/>
    <path d="${v.pink}" fill="#000" stroke="#000" stroke-width="${S * 0.07}" stroke-linejoin="round"/>
  </mask></defs>
  <path d="${v.sky}" fill="#fff" mask="url(#gap)"/><path d="${v.pink}" fill="#fff"/>
</svg>`;
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
