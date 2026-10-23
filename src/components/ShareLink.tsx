"use client";

import { useState } from "react";

/**
 * 한결 안의 주소(path)를 공유하는 버튼. 링크만 보낸다 (문구를 붙이면 카카오톡 등에 그대로 같이 보내진다. 미리보기는 그 페이지의 제목·설명이 맡는다).
 * 공유 창이 없거나 닫으면 링크를 복사한다. variant="text"면 작은 밑줄 글자 버튼 (한 칸에 큰 버튼이 이미 있을 때)
 */
export function ShareLink({ path, label, variant = "button" }: { path: string; label: string; variant?: "button" | "text" }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = new URL(path, window.location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch {
        // 공유 창을 닫은 경우: 복사로 넘어간다
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt("이 링크를 복사해 보내주세요", url);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={share}
        className={
          variant === "text"
            ? "mx-auto block text-[14px] text-muted underline underline-offset-4"
            : "w-full rounded-full border border-primary px-6 py-3 text-[15px] font-semibold text-primary transition-colors hover:bg-primary hover:text-white active:scale-[0.98] active:opacity-80"
        }
      >
        {label}
      </button>
      {copied && <p className="mt-2 text-center text-sm text-moss">링크를 복사했어요. 친구에게 붙여넣어 보내주세요.</p>}
    </div>
  );
}
