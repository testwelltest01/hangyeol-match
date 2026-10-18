"use client";

import { useEffect } from "react";
import { isThemedPath, THEME_KEY, type Theme } from "@/lib/theme";

function apply(theme: Theme | null) {
  const root = document.documentElement;
  if (theme && isThemedPath(location.pathname)) root.setAttribute("data-theme", theme);
  else root.removeAttribute("data-theme");
}

/** 탭 화면에서 내 성별 테마를 기기에 기억하고 바로 붙인다 (다음부터는 <head> 스크립트가 첫 그림 전에 붙인다) */
export function ThemeSync({ theme }: { theme: Theme | null }) {
  useEffect(() => {
    try {
      if (theme) localStorage.setItem(THEME_KEY, theme);
      else localStorage.removeItem(THEME_KEY);
    } catch {
      // 저장소를 못 쓰는 브라우저(사생활 보호 모드 등)는 이번 화면에만 붙인다
    }
    apply(theme);
  }, [theme]);
  return null;
}

/** 관리자 화면: 서비스 화면에서 넘어와도 테마를 뗀다 (차트의 쪽빛=남성 색을 지키려고) */
export function ClearTheme() {
  useEffect(() => {
    document.documentElement.removeAttribute("data-theme");
  }, []);
  return null;
}

/** 로그아웃: 이 기기에 기억한 테마를 지운다 (다음 사람의 로그인 화면이 기본 쪽빛이 되게) */
export function forgetTheme() {
  try {
    localStorage.removeItem(THEME_KEY);
  } catch {}
  document.documentElement.removeAttribute("data-theme");
}
