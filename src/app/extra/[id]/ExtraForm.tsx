"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveExtra } from "@/app/extra/actions";
import { ChoiceGroup, LikertScale } from "@/components/scales";
import { PrimaryButton } from "@/components/Shell";
import type { ExtraAnswers, ExtraTest } from "@/lib/extra/tests";

export function ExtraForm({ test, initial, initialShare }: { test: ExtraTest; initial: ExtraAnswers; initialShare: boolean }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<ExtraAnswers>(initial);
  const [share, setShare] = useState(initialShare);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const done = test.items.filter((i) => answers[i.id] !== undefined).length;
  const complete = done === test.items.length;
  const set = (id: string) => (v: number | string) => setAnswers((a) => ({ ...a, [id]: Number(v) }));

  function submit() {
    setError(null);
    start(async () => {
      const res = await saveExtra(test.id, answers, share);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/report#extra");
    });
  }

  return (
    <div>
      <p className="text-sm text-muted">
        더 알아보기 · {test.items.length}문항 · 약 {test.minutes}분
      </p>
      <h1 className="mt-1 font-serif text-[1.85rem] font-bold leading-tight">{test.title}</h1>
      <p className="mt-3 text-ink-soft">{test.guide}</p>

      <div className="mt-8 space-y-9">
        {test.items.map((item) =>
          item.options ? (
            <ChoiceGroup key={item.id} name={item.id} question={item.text} options={item.options} value={answers[item.id]} onChange={set(item.id)} />
          ) : (
            <LikertScale key={item.id} name={item.id} text={item.text} options={test.likert} value={answers[item.id]} onChange={set(item.id)} />
          ),
        )}
      </div>

      <label className="mt-10 flex cursor-pointer items-start gap-3 rounded-xl bg-mist px-4 py-4">
        <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} className="mt-1 h-4 w-4 accent-indigo" />
        <span>
          <span className="font-semibold">추천받은 상대에게 결과 요약 보여주기</span>
          <span className="mt-0.5 block text-sm text-ink-soft">상대의 자세히 보기 화면에 요약과 공통점이 보여요. 답 하나하나는 보이지 않아요.</span>
        </span>
      </label>

      {error && (
        <p role="alert" className="mt-4 text-alert">
          {error}
        </p>
      )}
      <div className="mt-6">
        <PrimaryButton disabled={!complete || pending} onClick={submit}>
          {pending ? "저장하는 중" : complete ? "결과 보기" : `${test.items.length - done}문항 남았어요`}
        </PrimaryButton>
      </div>
      <p className="mt-3 text-center text-sm text-muted">한결이 직접 만든 시범 검사예요. 추천 계산에는 쓰지 않아요.</p>
    </div>
  );
}
