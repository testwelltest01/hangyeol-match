"use client";

import { useState, useTransition } from "react";
import { saveMeetingFeedback, type MeetingInput } from "@/app/match/actions";
import { PrimaryButton } from "@/components/Shell";

const OUTCOMES: { id: MeetingInput["outcome"]; label: string }[] = [
  { id: "met", label: "만났어요" },
  { id: "not_yet", label: "아직 못 만났어요" },
  { id: "no_contact", label: "연락이 닿지 않았어요" },
  { id: "no_show", label: "약속에 나오지 않았어요" },
];

const QUESTIONS: { id: "photo_match" | "cleanliness" | "manners" | "again"; text: string }[] = [
  { id: "photo_match", text: "사진과 실제 인상이 비슷했나요?" },
  { id: "cleanliness", text: "깔끔한 인상이었나요?" },
  { id: "manners", text: "매너가 좋았나요?" },
  { id: "again", text: "다시 만나고 싶나요?" },
];

export function MeetingFeedbackForm({ targetId, name, answered }: { targetId: string; name: string; answered: string | null }) {
  const [outcome, setOutcome] = useState<MeetingInput["outcome"] | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (done || (answered && answered !== "not_yet")) {
    return <p className="text-ink-soft">만남 피드백을 남겨줘서 고마워요. 답은 {name}님에게 보이지 않아요.</p>;
  }

  const complete = outcome !== null && (outcome !== "met" || QUESTIONS.every((q) => ratings[q.id]));

  function submit() {
    if (!outcome) return;
    setError(null);
    startTransition(async () => {
      const res = await saveMeetingFeedback(targetId, { outcome, ...ratings });
      if (!res.ok) return setError(res.error);
      setDone(true);
    });
  }

  return (
    <div>
      <h2 className="font-serif text-xl font-bold">{name}님과 만나셨나요?</h2>
      <p className="mt-2 text-ink-soft">답은 상대에게 보이지 않고, 다음 추천을 더 정확하게 만드는 데만 써요.</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {OUTCOMES.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={outcome === o.id}
            onClick={() => setOutcome(o.id)}
            className={`rounded-xl border px-3 py-3 text-[15px] ${outcome === o.id ? "border-indigo bg-mist font-semibold" : "border-line bg-surface"}`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {outcome === "met" && (
        <div className="mt-6 space-y-5">
          {QUESTIONS.map((q) => (
            <fieldset key={q.id}>
              <legend className="text-[15px]">{q.text}</legend>
              <div className="mt-2 flex items-center justify-between gap-1">
                <span className="text-xs text-muted">전혀</span>
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-label={`${v}점`}
                    aria-pressed={ratings[q.id] === v}
                    onClick={() => setRatings((r) => ({ ...r, [q.id]: v }))}
                    className={`h-10 w-10 rounded-full border-2 ${ratings[q.id] === v ? "border-indigo bg-indigo text-white" : "border-line"}`}
                  >
                    {v}
                  </button>
                ))}
                <span className="text-xs text-muted">매우</span>
              </div>
            </fieldset>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-alert">
          {error}
        </p>
      )}
      <div className="mt-6">
        <PrimaryButton onClick={submit} disabled={!complete || pending}>
          {pending ? "보내는 중" : "보내기"}
        </PrimaryButton>
      </div>
    </div>
  );
}
