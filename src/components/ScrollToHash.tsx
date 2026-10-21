"use client";

import { useEffect } from "react";

/**
 * 주소의 #id가 이 id와 같으면 화면이 뜬 뒤 그 자리로 스크롤한다 (예: 오늘 탭 '추가하는 방법 보기' → /me#app).
 * 내용을 Suspense로 늦게 그리는 화면은 브라우저·Next가 #로 스크롤하는 순간 그 자리가 아직 없어서 맨 위에 머물기 때문이다.
 * 위쪽 고정 바 높이만큼의 여백은 html scroll-padding-top이 맡는다. 그 자리(id를 단 요소) 안에 둔다
 */
export function ScrollToHash({ id }: { id: string }) {
  useEffect(() => {
    if (window.location.hash !== `#${id}`) return;
    const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(frame);
  }, [id]);
  return null;
}
