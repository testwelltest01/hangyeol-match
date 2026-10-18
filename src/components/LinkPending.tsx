"use client";

// 링크를 눌렀는데 다음 화면이 바로 뜨지 않을 때(미리 불러오지 못했거나 데이터를 읽는 중) 누른 자리에 '가는 중' 표시.
// <Link> 안쪽에서만 쓴다 (useLinkStatus). 자리 크기는 늘 같게 두고 보이기만 바꿔서 화면이 흔들리지 않게 한다.
import { useLinkStatus } from "next/link";
import { IconChevron } from "@/components/icons";

function Spinner({ size, className = "" }: { size: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/** 목록 줄의 오른쪽 꺾쇠: 가는 동안 도는 표시로 바뀐다 */
export function PendingChevron({ size = 18, className = "" }: { size?: number; className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span aria-hidden className={`-mr-1 flex shrink-0 items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {pending ? <Spinner size={size - 4} /> : <IconChevron size={size} />}
    </span>
  );
}

/** 큰 버튼 오른쪽 끝의 도는 표시 (버튼에 relative가 있어야 한다). 떠 있는 자리라 생겨도 글자가 밀리지 않는다 */
export function PendingSpinner({ className = "" }: { className?: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span aria-hidden className={`pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 ${className}`}>
      <Spinner size={16} />
    </span>
  );
}

/** 탭처럼 누른 곳 전체를 은은하게 칠해 두는 표시 (부모에 relative) */
export function PendingFill({ className = "" }: { className?: string }) {
  const { pending } = useLinkStatus();
  return <span aria-hidden className={`pointer-events-none absolute inset-0 transition-opacity ${pending ? "opacity-100" : "opacity-0"} ${className}`} />;
}
