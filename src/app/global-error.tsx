"use client";

// 루트 레이아웃까지 실패했을 때. 이 화면은 사이트 스타일(globals.css)이 적용되지 않아서 스타일을 직접 넣는다
import { errorDigest, useAutoReloadOnce } from "@/components/ErrorScreen";

const INK = "#1f2f5c";
const font = '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

export default function GlobalError({ error }: { error: unknown; retry: () => void }) {
  useAutoReloadOnce(error);
  const digest = errorDigest(error);
  return (
    <html lang="ko">
      <body style={{ margin: 0, background: "#f3f5f8", color: INK, fontFamily: font }}>
        <title>한결</title>
        <main style={{ maxWidth: 560, minHeight: "80vh", margin: "0 auto", padding: "0 24px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <p style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>화면을 불러오지 못했어요</p>
          <p style={{ marginTop: 12, fontSize: 15, lineHeight: 1.7, color: "#3a4a75" }}>
            연결이 잠깐 고르지 않았거나 앱이 새로 바뀌는 중이었을 수 있어요. 다시 불러오면 대부분 해결돼요.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ marginTop: 32, width: "100%", border: 0, borderRadius: 999, background: INK, color: "#fff", padding: "16px 24px", fontSize: 16, fontWeight: 600, fontFamily: font }}
          >
            다시 불러오기
          </button>
          <a
            href="/start"
            style={{ marginTop: 12, display: "block", borderRadius: 999, border: `1px solid ${INK}`, color: INK, padding: "14px 24px", textAlign: "center", fontWeight: 600, textDecoration: "none" }}
          >
            처음 화면으로
          </a>
          {digest && <p style={{ marginTop: 24, textAlign: "center", fontSize: 12, color: "#5b6478" }}>오류 번호 {digest}</p>}
        </main>
      </body>
    </html>
  );
}
