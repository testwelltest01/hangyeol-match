"use client";

import { useState, useTransition } from "react";
import { getOrCreateInvite } from "@/app/actions";

export function InviteBox({ initialToken, count, minCount }: { initialToken: string | null; count: number; minCount: number }) {
  const [token, setToken] = useState(initialToken);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const link = token ? `${typeof window === "undefined" ? "" : window.location.origin}/f/${token}` : null;

  // 링크만 보낸다. 문구를 붙이면 카카오톡 등에 링크와 함께 그대로 보내져서, 회원이 원하지 않는 말이 같이 간다
  // (링크 미리보기는 /f/[token]의 제목·설명이 대신 보여준다)
  async function share(url: string) {
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

  function makeLink() {
    setError(null);
    startTransition(async () => {
      const t = await getOrCreateInvite();
      if (!t) {
        setError("링크를 만들지 못했어요. 다시 시도해주세요.");
        return;
      }
      setToken(t);
      await share(`${window.location.origin}/f/${t}`);
    });
  }

  const remaining = Math.max(minCount - count, 0);

  return (
    <div>
      <p className="text-ink-soft">
        친구가 링크에서 10문항에 답하면, 친구들이 보는 나를 성격 막대에 함께 표시해요. 누가 어떻게 답했는지는 보이지 않고,{" "}
        {minCount}명 이상 모였을 때 평균만 보여줘요.
      </p>
      <p className="mt-3 rounded-2xl bg-indigo/5 px-4 py-3 text-[14px] leading-relaxed text-ink-soft ring-1 ring-indigo/15">
        친구 1명이 평가할 때마다 <strong className="font-semibold text-ink">오늘의 추천 새로고침 쿠폰</strong> 1장을 받아요. 오늘 추천을 넘긴 뒤 저녁 8시를
        기다리지 않고 바로 새 사람을 받을 수 있어요(하루 한 번).
      </p>
      <p className="mt-3 font-semibold">
        {count === 0
          ? "아직 평가가 없어요."
          : remaining > 0
            ? `${count}명이 평가했어요. ${remaining}명만 더 모이면 보여드려요.`
            : `${count}명이 평가했어요.`}
      </p>
      <button
        type="button"
        onClick={() => (link ? share(link) : makeLink())}
        disabled={pending}
        className="mt-4 w-full rounded-full border border-primary px-6 py-3.5 font-semibold text-primary transition-colors hover:bg-primary hover:text-white disabled:opacity-60"
      >
        {pending ? "링크 만드는 중" : link ? "평가 링크 보내기" : "평가 링크 만들기"}
      </button>
      {copied && <p className="mt-2 text-center text-sm text-moss">링크를 복사했어요. 친구에게 붙여넣어 보내주세요.</p>}
      {error && (
        <p role="alert" className="mt-2 text-alert">
          {error}
        </p>
      )}
    </div>
  );
}
