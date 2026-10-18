"use client";

import { useState } from "react";

/** 서비스 자체를 친구에게 알리는 버튼. 리포트 내용은 공유하지 않는다. */
export function ShareService() {
  const [copied, setCopied] = useState(false);

  // 링크만 보낸다 (문구를 붙이면 카카오톡 등에 그대로 같이 보내진다. 미리보기는 첫 화면의 제목·설명이 맡는다)
  async function share() {
    const url = window.location.origin;
    if (navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch {
        // 공유 창을 닫은 경우: 복사로 넘어간다
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <div>
      <button
        type="button"
        onClick={share}
        className="w-full rounded-full border border-primary px-6 py-3.5 font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
      >
        친구에게 한결 알려주기
      </button>
      {copied && <p className="mt-2 text-center text-sm text-moss">링크를 복사했어요. 친구에게 붙여넣어 보내주세요.</p>}
    </div>
  );
}
