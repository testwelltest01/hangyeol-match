"use client";

import { useActionState, useState } from "react";
import { RegionSelect } from "@/components/RegionSelect";
import { PrimaryButton } from "@/components/buttons";
import { ErrorText, fieldClass } from "@/components/ui";
import { INTRO_MAX, MAX_HEIGHT, MIN_HEIGHT, RELIGIONS, type Religion } from "@/lib/match/filters";
import { saveMatchProfile, type FormState } from "../actions";

const HEIGHTS = Array.from({ length: MAX_HEIGHT - MIN_HEIGHT - 39 }, (_, i) => MIN_HEIGHT + 10 + i); // 140~200

export function ProfileForm({
  initial,
  hasReligionConsent,
}: {
  initial: { region: string; height: number; intro: string; religion: Religion | null } | null;
  hasReligionConsent: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveMatchProfile, { error: null });
  const [intro, setIntro] = useState(initial?.intro ?? "");
  const [religion, setReligion] = useState<string>(initial?.religion ?? "");
  const needsConsent = religion !== "" && !hasReligionConsent;

  return (
    <form action={action} className="mt-8 space-y-8">
      <div>
        <span className="text-sm font-semibold">사는 지역</span>
        <RegionSelect name="region" defaultValue={initial?.region} />
        <p className="mt-2 text-sm text-muted">위치 권한은 받지 않아요. 시·군·구까지만 보여요.</p>
      </div>

      <label className="block">
        <span className="text-sm font-semibold">키</span>
        <select name="height" required defaultValue={initial?.height ?? ""} className={fieldClass}>
          <option value="" disabled>
            선택해주세요
          </option>
          {HEIGHTS.map((h) => (
            <option key={h} value={h}>
              {h}cm
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="flex items-baseline justify-between text-sm font-semibold">
          자기소개
          <span className="font-normal text-muted">
            {intro.length}/{INTRO_MAX}
          </span>
        </span>
        <textarea
          name="intro"
          required
          rows={6}
          maxLength={INTRO_MAX}
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          placeholder="주말에 주로 하는 일, 요즘 빠져 있는 것, 만나면 같이 해보고 싶은 것처럼 대화가 시작될 만한 이야기를 써주세요."
          className={`${fieldClass} resize-y leading-relaxed`}
        />
        <span className="mt-2 block text-sm text-muted">연락처와 SNS 아이디는 적을 수 없어요. 서로 수락하면 따로 공개돼요.</span>
      </label>

      <fieldset>
        <legend className="text-sm font-semibold">종교 (선택)</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[{ id: "", label: "입력 안 함" }, ...RELIGIONS].map((r) => (
            <label key={r.id || "skip"} className="cursor-pointer">
              <input
                type="radio"
                name="religion"
                value={r.id}
                checked={religion === r.id}
                onChange={() => setReligion(r.id)}
                className="peer sr-only"
              />
              <span className="block rounded-xl border border-line bg-surface px-2 py-3 text-center text-[15px] peer-checked:border-indigo peer-checked:bg-mist peer-checked:font-semibold peer-focus-visible:outline-2 peer-focus-visible:outline-indigo">
                {r.label}
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted">
          입력하지 않아도 매칭돼요. 다만 종교 조건을 건 사람에게는 추천되지 않고, 나도 종교 조건을 걸 수 없어요.
        </p>
        {needsConsent && (
          <div className="mt-4 rounded-xl bg-mist px-4 py-4 text-sm text-ink-soft">
            <p className="font-semibold text-ink">민감정보 수집·이용 동의 (선택)</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>항목: 종교</li>
              <li>목적: 종교 조건에 맞는 상대 추천</li>
              <li>보유기간: 종교를 지우거나 탈퇴할 때까지</li>
              <li>동의하지 않아도 매칭을 이용할 수 있어요. 이 경우 종교는 저장하지 않아요.</li>
            </ul>
            <label className="mt-3 flex items-start gap-3 text-ink">
              <input type="checkbox" name="agreeReligion" required className="mt-1 h-5 w-5 accent-[var(--color-indigo)]" />
              <span>종교 정보 수집·이용에 동의해요.</span>
            </label>
          </div>
        )}
      </fieldset>

      <p className="text-sm text-muted">결혼·자녀 생각과 흡연·음주 여부는 검사에서 답한 내용을 조건 비교에 써요. 상대에게 그대로 보이지는 않아요.</p>

      <ErrorText>{state.error}</ErrorText>
      {state.saved && !state.error && <p className="text-moss">저장했어요.</p>}

      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "저장하는 중" : initial ? "저장하기" : "저장하고 조건 정하기"}
      </PrimaryButton>
    </form>
  );
}
