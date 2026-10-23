"use client";

import { useActionState, useState } from "react";
import { PrimaryButton } from "@/components/buttons";
import { IgVerifiedBadge } from "@/components/IgVerifiedBadge";
import { normalizeInstagram } from "@/lib/contact";
import { ErrorText, fieldClass } from "@/components/ui";
import { saveContact, type FormState } from "../actions";

export function ContactForm({
  initial,
  verifiedInstagram = null,
}: {
  initial: { instagram: string; kakao: string };
  /** 인스타 확인을 마친 아이디. 입력칸을 다른 값으로 바꿔 저장하면 확인이 풀린다 */
  verifiedInstagram?: string | null;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveContact, { error: null });
  const [instagram, setInstagram] = useState(initial.instagram);
  const stillVerified = verifiedInstagram !== null && normalizeInstagram(instagram) === verifiedInstagram;

  return (
    <form action={action} className="mt-8 space-y-7">
      <label className="block">
        <span className="flex items-center gap-2 text-sm font-semibold">
          인스타그램 아이디
          {stillVerified && <IgVerifiedBadge short />}
        </span>
        <input
          name="instagram"
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="@ 없이 입력"
          className={fieldClass}
        />
        {verifiedInstagram !== null && !stillVerified ? (
          <span className="mt-2 block text-sm text-alert">인증한 아이디(@{verifiedInstagram})와 달라요. 이대로 저장하면 &lsquo;인스타 인증&rsquo;이 풀려요.</span>
        ) : (
          <span className="mt-2 block text-sm text-muted">비공개 계정이어도 괜찮아요. 공개 계정이면 사진이 먼저 보일 수 있다는 점만 알아두세요.</span>
        )}
      </label>

      <label className="block">
        <span className="text-sm font-semibold">카카오톡 ID</span>
        <input
          name="kakao"
          defaultValue={initial.kakao}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="전화번호가 아닌 카카오톡 ID"
          className={fieldClass}
        />
        <span className="mt-2 block text-sm text-muted">
          카카오톡 설정의 프로필 관리에서 카카오톡 ID의 &quot;ID 검색 허용&quot;을 켜둬야 상대가 찾을 수 있어요.
        </span>
      </label>

      <div className="rounded-xl bg-mist px-4 py-4 text-sm text-ink-soft">
        둘 중 하나 이상 입력해주세요. 연락처는 암호화해서 저장하고, 서로 수락한 사람에게만 보여요. 상대가 &quot;ID로 찾을 수
        없어요&quot;라고 알려오면 여기서 다시 확인해주세요.
      </div>

      <ErrorText>{state.error}</ErrorText>

      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "저장하는 중" : "저장하기"}
      </PrimaryButton>
    </form>
  );
}
