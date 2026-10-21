"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveProfile, type FormState } from "@/app/actions";
import { PrimaryButton } from "@/components/buttons";

/** OpenAI 안내: API로 보낸 데이터는 기본적으로 모델 학습에 쓰지 않는다 */
const OPENAI_DATA_POLICY = "https://openai.com/ko-KR/policies/how-your-data-is-used-to-improve-model-performance/";

/** 동의 한 줄: 필수는 체크하지 않으면 넘어가지 못한다(브라우저 required + 서버에서 다시 확인) */
function Consent({ name, title, required = false, children }: { name: string; title: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-surface px-4 py-3.5 ring-1 ring-line/80">
      <input type="checkbox" name={name} required={required} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-indigo)]" />
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold text-ink">
          <span className={required ? "text-indigo" : "text-muted"}>[{required ? "필수" : "선택"}]</span> {title}
        </span>
        <span className="mt-1 block text-[13.5px] leading-relaxed text-muted">{children}</span>
      </span>
    </label>
  );
}

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

      <div className="space-y-3">
        <Consent name="agreePrivacy" required title="개인정보 수집·이용에 동의해요">
          이메일, 닉네임, 성별, 출생연도, 검사 응답, 친구가 남긴 평가. 리포트와 매칭 추천에 쓰고, 탈퇴하면 바로 지워요.{" "}
          <Link href="/privacy" target="_blank" className="underline underline-offset-4">
            처리방침 전문
          </Link>
        </Consent>
        <Consent name="agreePhotoAi" required title="프로필 사진을 OpenAI의 AI가 확인하는 데 동의해요">
          올리는 사진이 등록 기준에 맞는지(혼자 나온 실제 사진인지 등)를 OpenAI(미국)의 AI가 판단하고 더 잘 나오는 방법을 알려줘요.
          보내는 것은 사진과 성별뿐이에요. API로 보낸 사진은{" "}
          <a href={OPENAI_DATA_POLICY} target="_blank" rel="noreferrer" className="underline underline-offset-4">
            OpenAI의 AI 학습에 이용되지 않아요
          </a>
          .
        </Consent>
        <Consent name="agreeReligion" required title="종교 정보 수집·이용에 동의해요 (민감정보)">
          종교 조건에 맞는 상대를 추천하는 데만 쓰고, 상대에게 그대로 보여주지 않아요. 탈퇴하면 바로 지워요.
        </Consent>
        <Consent name="agreeIllustration" title="그림 프로필을 자동으로 만들어도 좋아요">
          사진 2장과 자기소개·검사 결과 요약(이름·지역·종교·연락처 제외)을 OpenAI로 보내 따뜻한 손그림 풍 그림을 그려요. 준비가 끝나면 한
          번 자동으로 그리고, 추천 카드에 보여줄지는 직접 정해요. 동의하지 않아도 매칭에는 불이익이 없어요.
        </Consent>
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
