import type { Metadata, Viewport } from "next";
import "./globals.css";

const TITLE = "한결 | 결이 맞는 사람";
const DESCRIPTION = "연락 스타일과 주말이 맞는 사람. 11분 가치관 검사로 나의 연애 결을 알아보세요.";

// 공유 미리보기(카카오톡, 인스타그램 DM 등)의 이미지 주소를 절대 주소로 만들 때 쓴다.
// Vercel이 넣어주는 운영 주소가 있으면 그걸, 없으면(내 컴퓨터) localhost를 쓴다.
const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "한결",
  // 이미지는 app/opengraph-image.png 파일이 자동으로 붙는다
  openGraph: {
    type: "website",
    siteName: "한결",
    locale: "ko_KR",
    url: "/",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f3f5f8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        {/* 한글 웹폰트: 본문은 프리텐다드, 문장과 제목은 고운바탕 */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* 루트 레이아웃이라 모든 페이지에 적용된다. pages 라우터 기준 경고라 끈다 */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
