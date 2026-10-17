/** 상대가 나에게 먼저 관심을 보냈을 때 붙이는 표시 */
export function LikedBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose/10 px-2.5 py-1 text-xs font-semibold text-rose">
      <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5 fill-current">
        <path d="M12 21s-7.5-4.6-10-9.3C.4 8.4 2.3 4.5 6 4.5c2.1 0 3.4 1.1 4.2 2.3h3.6C14.6 5.6 15.9 4.5 18 4.5c3.7 0 5.6 3.9 4 7.2C19.5 16.4 12 21 12 21z" />
      </svg>
      관심을 받았어요
    </span>
  );
}
