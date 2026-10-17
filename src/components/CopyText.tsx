"use client";

import { useState } from "react";

/** 누르면 text를 복사하는 작은 버튼 */
export function CopyText({ text, label = "복사" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          // 복사가 막힌 브라우저에서는 아무것도 하지 않는다 (번호는 화면에 그대로 보인다)
        }
      }}
      className="shrink-0 rounded-full border border-line bg-surface px-3.5 py-1.5 font-sans text-sm text-ink-soft"
    >
      {done ? "복사했어요" : label}
    </button>
  );
}
