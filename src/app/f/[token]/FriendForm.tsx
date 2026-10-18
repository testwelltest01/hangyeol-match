"use client";

import { useState, useTransition } from "react";
import { submitFriendRating } from "@/app/actions";
import { PrimaryButton, PrimaryLink } from "@/components/buttons";
import { LikertScale } from "@/components/scales";

export function FriendForm({ token, items }: { token: string; items: { id: string; text: string }[] }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const complete = items.every((i) => answers[i.id] !== undefined);

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await submitFriendRating(token, answers);
      if (!res.ok) {
        setError(res.error ?? "저장하지 못했어요. 다시 시도해주세요.");
        return;
      }
      setDone(true);
      window.scrollTo({ top: 0 });
    });
  }

  if (done) {
    return (
      <div className="mt-10">
        <p className="font-serif text-2xl font-bold">고마워요. 답이 전달됐어요.</p>
        <p className="mt-3 text-ink-soft">
          한결은 연락 스타일과 주말이 맞는 사람을 찾는 소개팅 서비스예요. 11분 검사로 나의 연애 결도
          알아볼 수 있어요.
        </p>
        <div className="mt-8">
          <PrimaryLink href="/">나도 검사해보기</PrimaryLink>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="divide-y divide-line">
        {items.map((item) => (
          <div key={item.id} className="py-7 first:pt-0">
            <LikertScale
              name={item.id}
              text={item.text}
              value={answers[item.id]}
              onChange={(v) => setAnswers((a) => ({ ...a, [item.id]: v }))}
            />
          </div>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-alert">
          {error}
        </p>
      )}
      <div className="mt-6">
        <PrimaryButton onClick={submit} disabled={!complete || pending}>
          {pending ? "보내는 중" : "답 보내기"}
        </PrimaryButton>
      </div>
    </div>
  );
}
