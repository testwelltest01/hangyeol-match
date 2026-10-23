/** 인스타 인증을 마친 사람 '인스타 인증' (한결 인스타 DM 코드로 계정 주인임을 확인. 아이디는 연락처 전달 뒤에만 보인다) */
export function IgVerifiedBadge({ short = false }: { short?: boolean }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-moss/10 px-2.5 py-1 text-xs font-semibold text-moss"
      title="한결 인스타 DM으로 계정 주인임을 확인했어요"
    >
      <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
      {short ? "인증" : "인스타 인증"}
    </span>
  );
}
