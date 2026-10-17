import type { NextConfig } from "next";

// 메타 태그를 <head>에 바로 넣어줘야 하는 미리보기 봇 목록.
// Next.js 기본 목록에 카카오톡(kakaotalk-scrap)과 다음(Daumoa)을 더했다. 기본 목록에 없으면
// 친구 평가 링크처럼 메타데이터를 그때그때 만드는 페이지에서 카카오톡 미리보기가 비어 보인다.
const HTML_LIMITED_BOTS =
  /[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight|kakaotalk-scrap|Kakaotalk|Daumoa/i;

// 보안 헤더. 브라우저가 이 사이트에서 불러올 수 있는 곳을 좁혀서, 혹시 스크립트가 끼어들어도 할 수 있는 일을 줄인다.
const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://*.supabase.co";
const isDev = process.env.NODE_ENV !== "production";

const CSP = [
  "default-src 'self'",
  // Next.js가 페이지에 넣는 인라인 스크립트 때문에 'unsafe-inline'이 필요하다(미리 만든 정적 페이지라 nonce를 쓸 수 없음).
  // 개발 모드의 빠른 새로고침은 eval을 써서 개발 때만 허용한다.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
  "font-src 'self' data: https://cdn.jsdelivr.net https://fonts.gstatic.com",
  `img-src 'self' data: blob: ${SUPABASE}`,
  `connect-src 'self' ${SUPABASE} ${SUPABASE.replace("https://", "wss://")}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  htmlLimitedBots: HTML_LIMITED_BOTS,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      // 로그인 후 화면과 친구 평가 링크는 검색에 노출하지 않는다
      {
        source: "/:dir(f|me|match|people|report|test|onboarding|admin|extra|chat)/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  experimental: {
    serverActions: {
      // 사진은 기기에서 긴 변 1024px JPEG로 줄여서 보내므로 보통 300KB 안팎이다. 여유를 둔다.
      bodySizeLimit: "4mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
