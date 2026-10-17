"use client";
/* eslint-disable @next/next/no-img-element -- 사진은 10분짜리 서명 주소라 next/image 최적화 대신 그대로 보여준다 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * 누르면 사진 전체를 화면에 맞춰 크게 보여주고, 화면 아무 데나 누르거나 Esc를 누르면 제자리로 돌아간다.
 * 작은 사진은 틀에 맞게 잘라 보여주고(object-cover), 크게 볼 때는 자르지 않는다(object-contain).
 */
export function ZoomImage({
  src,
  alt,
  className = "h-full w-full object-cover",
}: {
  src: string;
  alt: string;
  /** 작은 사진의 class (틀을 채우는 방식) */
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    trigger.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    // 크게 보는 동안 뒤 화면이 스크롤되지 않게
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${alt} 크게 보기`}
        className="block h-full w-full cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo"
      >
        <img src={src} alt={alt} className={className} />
      </button>
      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={alt}
            onClick={close}
            className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/95 p-3 motion-safe:animate-[zoom-fade_150ms_ease-out]"
          >
            <img src={src} alt={alt} className="max-h-full max-w-full rounded-lg object-contain motion-safe:animate-[zoom-in_180ms_ease-out]" />
            <button
              type="button"
              autoFocus
              onClick={close}
              className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] rounded-full bg-white/15 px-3.5 py-1.5 text-sm text-white backdrop-blur"
            >
              닫기
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
