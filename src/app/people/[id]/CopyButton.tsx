"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="shrink-0 rounded-full border border-line px-3 py-1.5 text-sm text-ink-soft"
    >
      {done ? "복사됨" : "복사"}
    </button>
  );
}
