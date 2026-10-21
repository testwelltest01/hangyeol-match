"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PrimaryButton } from "@/components/buttons";
import { inAppNow, iosNow, openOutside } from "@/lib/openOutside";

const TRIED_KEY = "hg-inapp-escape";

/**
 * 카카오톡 같은 앱 안 브라우저로 한결이 열리면 바로 밖의 브라우저로 넘긴다 (아이폰은 Safari, 안드로이드는 기본 브라우저).
 * 앱 창에서 가입하면 로그인·홈 화면 추가가 그 창에 묶이기 때문이다.
 * - 친구 평가(/f/)는 친구가 그 자리에서 1분 만에 끝내도록 넘기지 않는다 (끝난 화면의 '시작하기'가 넘긴다)
 * - 한 번 시도했으면 같은 창에서는 다시 자동으로 넘기지 않는다(sessionStorage). 넘긴 뒤 이 창에는 안내를 띄우고
 *   '다시 열기'와 '여기서 계속 보기'를 둔다 (앱이 막아 못 넘긴 경우에도 쓸 수 있게)
 * 루트 레이아웃에 둔다
 */
export function InAppEscape() {
  const pathname = usePathname();
  // 넘겼으면 어느 브라우저로 넘겼는지 (아이폰이면 Safari). null이면 안내를 띄우지 않는다
  const [handed, setHanded] = useState<"ios" | "android" | null>(null);

  useEffect(() => {
    const escape = () => {
      if (!inAppNow() || pathname.startsWith("/f/")) return;
      try {
        if (sessionStorage.getItem(TRIED_KEY)) return;
        sessionStorage.setItem(TRIED_KEY, "1");
      } catch {
        return; // 저장소를 못 쓰면 매번 넘기게 되므로 자동으로는 넘기지 않는다
      }
      if (openOutside(window.location.href)) setHanded(iosNow() ? "ios" : "android");
    };
    escape();
  }, [pathname]);

  if (!handed) return null;
  const browser = handed === "ios" ? "Safari" : "기본 브라우저";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper/95 px-6" role="dialog" aria-modal="true" aria-labelledby="inapp-title">
      <div className="w-full max-w-sm text-center">
        <h2 id="inapp-title" className="font-serif text-[1.4rem] font-bold text-ink">
          {browser}에서 열었어요
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          한결은 {browser}에서 써야 로그인이 유지되고 홈 화면에 추가할 수 있어요. 이 창은 닫아도 돼요.
        </p>
        <div className="mt-7">
          <PrimaryButton onClick={() => openOutside(window.location.href)}>{browser}에서 다시 열기</PrimaryButton>
        </div>
        <button type="button" onClick={() => setHanded(null)} className="mt-4 text-[14px] text-muted underline underline-offset-4">
          여기서 계속 보기
        </button>
      </div>
    </div>
  );
}
