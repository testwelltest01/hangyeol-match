"use client";

import { useState } from "react";

/** 서비스 자체를 친구에게 알리는 버튼. 리포트 내용은 공유하지 않는다. */
export function ShareService() {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.origin;
    const text = "외모보다 먼저 연락 스타일과 주말이 맞는 사람. 11분 가치관 검사 해봐.";
    if (navigator.share) {
      try {
        await navigator.share({ title: "한결", text, url });
        return;
      } catch {
        // 공유 창을 닫은 경우: 복사로 넘어간다
      }
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    setCopied(true);
  }

  return (
    <div>
      <button
        type="button"
        onClick={share}
        className="w-full rounded-full bg-ink px-6 py-4 font-semibold text-white transition-colors hover:bg-ink-soft"
      >
        친구에게 한결 알려주기
      </button>
      {copied && <p className="mt-2 text-center text-sm text-moss">소개 문구를 복사했어요.</p>}
    </div>
  );
}
