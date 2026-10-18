"use client";

import { useRouter } from "next/navigation";
import { IconBack } from "@/components/icons";

/** 위쪽 바의 뒤로가기. 앞 화면이 있으면 브라우저 뒤로, 처음 연 화면이면 fallback으로 */
export function BackButton({ fallback, label }: { fallback: string; label: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
      className="-ml-1 flex h-10 items-center gap-0.5 rounded-full pl-1 pr-3 text-[15px] text-ink hover:bg-mist"
    >
      <IconBack size={22} />
      {label}
    </button>
  );
}
