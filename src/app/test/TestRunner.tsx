"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveAnswers } from "@/app/actions";
import { PrimaryButton } from "@/components/Shell";
import { BipolarScale, ImportanceQuestion, LikertQuestion, SingleQuestion } from "@/components/scales";
import { STEPS, isStepComplete, visibleItems, type Answers, type Item, type TestGender } from "@/lib/items";

export function TestRunner({
  initialAnswers,
  initialStep,
  gender,
}: {
  initialAnswers: Answers;
  initialStep: number;
  gender: TestGender;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [stepIndex, setStepIndex] = useState(Math.min(initialStep, STEPS.length - 1));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const step = STEPS[stepIndex];
  const items = visibleItems(step, gender);
  const complete = isStepComplete(step, answers, gender);
  const isLast = stepIndex === STEPS.length - 1;

  const set = (id: string) => (v: number | string) => setAnswers((a) => ({ ...a, [id]: v }));

  function next() {
    setError(null);
    const stepAnswers = Object.fromEntries(
      items.filter((i) => answers[i.id] !== undefined).map((i) => [i.id, answers[i.id]]),
    );
    startTransition(async () => {
      const res = await saveAnswers(stepAnswers);
      if (!res.ok) {
        setError(res.error ?? "저장하지 못했어요. 다시 시도해주세요.");
        return;
      }
      if (res.done) {
        router.push("/report");
        router.refresh();
        return;
      }
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
      window.scrollTo({ top: 0 });
    });
  }

  function back() {
    setError(null);
    setStepIndex((i) => Math.max(i - 1, 0));
    window.scrollTo({ top: 0 });
  }

  function renderItem(item: Item) {
    switch (item.kind) {
      case "bipolar":
        return <BipolarScale item={item} value={answers[item.id] as number | undefined} onChange={set(item.id)} />;
      case "importance":
        return <ImportanceQuestion item={item} value={answers[item.id] as number | undefined} onChange={set(item.id)} />;
      case "likert":
        return <LikertQuestion item={item} value={answers[item.id] as number | undefined} onChange={set(item.id)} />;
      case "single":
        return <SingleQuestion item={item} value={answers[item.id]} onChange={set(item.id)} />;
    }
  }

  const progress = ((stepIndex + (complete ? 1 : 0)) / STEPS.length) * 100;

  return (
    <div>
      <div className="flex items-baseline justify-between text-sm text-muted">
        <span>
          {stepIndex + 1} / {STEPS.length}
        </span>
        <span>저장하면 나중에 이어서 할 수 있어요</span>
      </div>
      <div
        className="mt-2 h-1 w-full overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="검사 진행률"
      >
        <div className="h-full bg-indigo transition-[width] duration-300" style={{ width: `${progress}%` }} />
      </div>

      <h1 className="mt-8 font-serif text-[1.7rem] font-bold leading-tight">{step.title}</h1>
      <p className="mt-2 text-ink-soft">{step.guide}</p>

      <div className="mt-8 divide-y divide-line">
        {items.map((item) => (
          <div key={item.id} className="py-7 first:pt-0">
            {renderItem(item)}
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-alert">
          {error}
        </p>
      )}

      <div className="mt-6 space-y-3">
        <PrimaryButton onClick={next} disabled={!complete || pending}>
          {pending ? "저장하는 중" : isLast ? "결과 보기" : "다음"}
        </PrimaryButton>
        {stepIndex > 0 && (
          <button
            type="button"
            onClick={back}
            disabled={pending}
            className="w-full py-2 text-center text-sm text-muted underline underline-offset-4"
          >
            이전 단계
          </button>
        )}
      </div>
    </div>
  );
}
