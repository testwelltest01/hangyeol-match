import type { MetadataRoute } from "next";

/** 홈 화면에 설치했을 때(PWA)의 이름·아이콘·시작 화면 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "한결 | 결이 맞는 사람",
    short_name: "한결",
    description: "가치관 검사로 결이 맞는 사람을 매일 한 명씩 소개해요.",
    lang: "ko",
    dir: "ltr",
    // 로그인 여부와 진행 단계에 맞는 화면으로 보내준다
    start_url: "/start",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3f5f8",
    theme_color: "#f3f5f8",
    categories: ["lifestyle", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "오늘의 추천", url: "/match", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "연결된 사람", url: "/match/connected", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
