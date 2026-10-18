"use client";

import { useState, useTransition } from "react";
import { submitFriendRating } from "@/app/actions";
import { PrimaryButton } from "@/components/buttons";
import { LikertScale } from "@/components/scales";
import { FriendDone } from "./FriendDone";

export function FriendForm({ token, name, items }: { token: string; name: string; items: { id: string; text: string }[] }) {
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

  if (done) return <FriendDone name={name} />;

  return (
    <>
      <h1 className="font-serif text-[1.65rem] font-bold leading-tight">{name}님은 어떤 사람인가요?</h1>
      <p className="mt-3 text-ink-soft">
        10문항, 1분이면 끝나요. 답은 다른 친구들의 답과 합쳐서 평균으로만 보여주고, 누가 어떻게 답했는지는 {name}님에게
        보이지 않아요. 이름이나 연락처는 받지 않아요.
      </p>
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
    </>
  );
}
