"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveProfile, type FormState } from "@/app/actions";
import { PrimaryButton } from "@/components/buttons";

const fieldClass =
  "mt-2 w-full rounded-xl border border-line bg-surface px-4 py-3.5 text-base text-ink focus:border-indigo focus:outline-none";

export function OnboardingForm({ years }: { years: number[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProfile, { error: null });

  return (
    <form action={action} className="mt-8 space-y-7">
      <label className="block">
        <span className="text-sm font-semibold">닉네임</span>
        <input name="nickname" required maxLength={12} placeholder="1~12자" className={fieldClass} />
      </label>

      <fieldset>
        <legend className="text-sm font-semibold">성별</legend>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {[
            { value: "female", label: "여성" },
            { value: "male", label: "남성" },
          ].map((g) => (
            <label key={g.value} className="cursor-pointer">
              <input type="radio" name="gender" value={g.value} required className="peer sr-only" />
              <span className="block rounded-xl border border-line bg-surface px-4 py-3.5 text-center peer-checked:border-indigo peer-checked:bg-mist peer-checked:font-semibold peer-focus-visible:outline-2 peer-focus-visible:outline-indigo">
                {g.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="text-sm font-semibold">출생연도</span>
        <select name="birthYear" required defaultValue="" className={fieldClass}>
          <option value="" disabled>
            선택해주세요
          </option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}년
            </option>
          ))}
        </select>
        <span className="mt-2 block text-sm text-muted">만 19세 이상만 이용할 수 있어요.</span>
      </label>

      <div className="rounded-xl bg-mist px-4 py-4 text-sm text-ink-soft">
        <p>
          수집 항목: 이메일, 닉네임, 성별, 출생연도, 검사 응답, 친구가 남긴 평가. 리포트와 매칭 추천에 쓰고, 탈퇴하면 바로
          지워요.
        </p>
        <label className="mt-3 flex items-start gap-3 text-ink">
          <input type="checkbox" name="agreePrivacy" required className="mt-1 h-5 w-5 accent-[var(--color-indigo)]" />
          <span>
            개인정보 수집·이용에 동의해요 (필수).{" "}
            <Link href="/privacy" target="_blank" className="underline underline-offset-4">
              전문 보기
            </Link>
          </span>
        </label>
      </div>

      {state.error && (
        <p role="alert" className="text-alert">
          {state.error}
        </p>
      )}

      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "저장하는 중" : "검사 시작하기"}
      </PrimaryButton>
    </form>
  );
}
