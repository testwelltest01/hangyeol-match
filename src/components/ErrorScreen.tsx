"use client";

// 화면을 그리다 실패했을 때(Next 기본 영어 화면 대신). 잠깐의 연결 문제나, 홈 화면 앱이 오래 켜져 있는 사이
// 새로 배포되어 예전 화면 코드와 서버가 어긋난 경우가 대부분이라 페이지를 새로 받으면 풀린다.
// 그래서 1분에 한 번까지는 알아서 새로 받고, 그래도 안 되면 버튼을 보여준다.
import { useEffect } from "react";

const KEY = "hg-error-reload";
const ONCE_PER_MS = 60_000;

export function useAutoReloadOnce(error: unknown) {
  useEffect(() => {
    console.error(error);
    try {
      const last = Number(sessionStorage.getItem(KEY) ?? 0);
      if (Date.now() - last > ONCE_PER_MS) {
        sessionStorage.setItem(KEY, String(Date.now()));
        window.location.reload();
      }
    } catch {
      // 저장소를 못 쓰면 반복해서 새로 받지 않도록 버튼만 보여준다
    }
  }, [error]);
}

export function errorDigest(error: unknown): string | null {
  return error instanceof Error && "digest" in error && typeof error.digest === "string" ? error.digest : null;
}

/** 루트 레이아웃 안에서 쓰는 오류 화면 (사이트 스타일이 적용된다) */
export function ErrorScreen({ error }: { error: unknown }) {
  useAutoReloadOnce(error);
  const digest = errorDigest(error);
  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-[560px] flex-col justify-center px-6">
      <p className="font-serif text-[1.6rem] font-bold leading-snug text-ink">화면을 불러오지 못했어요</p>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
        연결이 잠깐 고르지 않았거나 앱이 새로 바뀌는 중이었을 수 있어요. 다시 불러오면 대부분 해결돼요.
      </p>
      <div className="mt-8 space-y-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full rounded-full bg-primary px-6 py-4 text-base font-semibold text-white transition active:scale-[0.98] active:opacity-80"
        >
          다시 불러오기
        </button>
        {/* 화면 틀을 새로 받도록 next/link 대신 a */}
        <a href="/start" className="block w-full rounded-full border border-primary px-6 py-3.5 text-center font-semibold text-primary">
          처음 화면으로
        </a>
      </div>
      {digest && <p className="mt-6 text-center text-xs text-muted">오류 번호 {digest}</p>}
    </main>
  );
}
