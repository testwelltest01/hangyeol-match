"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PrimaryButton } from "@/components/buttons";
import { OpenInBrowserLink } from "@/components/OpenInBrowserLink";
import { Notice } from "@/components/ui";
import { externalBrowserUrl } from "@/lib/inapp";
import { installGuide, type InstallGuide } from "@/lib/pwa/install";
import {
  currentSubscription,
  disablePush,
  enablePush,
  getInstallPrompt,
  isStandalone,
  onInstallPromptChange,
  promptInstall,
  pushSupport,
  type PushSupport,
} from "@/lib/push/client";

type Env = {
  standalone: boolean;
  guide: InstallGuide;
  /** 앱 안 브라우저에서 기본 브라우저로 넘길 수 있는지 (카카오톡·라인·안드로이드 앱들) */
  canHandOff: boolean;
  support: PushSupport;
  permission: NotificationPermission | null;
};

/** 내 정보의 '앱처럼 쓰기': 홈 화면에 추가하는 방법과 이 기기 알림 켜기/끄기 */
export function AppSettings() {
  const [env, setEnv] = useState<Env | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 브라우저에서만 알 수 있는 값이라 화면이 뜬 뒤에 읽는다
    const read = () => {
      const ua = navigator.userAgent;
      setEnv({
        standalone: isStandalone(),
        guide: installGuide(ua, navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
        canHandOff: externalBrowserUrl(ua, window.location.href) !== null,
        support: pushSupport(),
        permission: "Notification" in window ? Notification.permission : null,
      });
      setCanPrompt(Boolean(getInstallPrompt()));
    };
    read();
    currentSubscription()
      .then((s) => setSubscribed(Boolean(s)))
      .catch(() => {});
    return onInstallPromptChange(read);
  }, []);

  if (!env) return <div className="mt-4 h-24" aria-hidden />;

  async function turnOn() {
    setBusy(true);
    setError(null);
    const res = await enablePush();
    setBusy(false);
    if (!res.ok) setError(res.error);
    setSubscribed(res.ok);
    setEnv((e) => (e ? { ...e, permission: Notification.permission } : e));
  }

  async function turnOff() {
    setBusy(true);
    setError(null);
    const res = await disablePush();
    setBusy(false);
    if (!res.ok) setError(res.error);
    else setSubscribed(false);
  }

  return (
    <div className="mt-4 space-y-6">
      <div>
        <h3 className="font-semibold">홈 화면에 추가</h3>
        {env.standalone ? (
          <p className="mt-1.5 text-[15px] text-moss">홈 화면 앱으로 쓰고 있어요.</p>
        ) : installed ? (
          <p className="mt-1.5 text-[15px] text-moss">홈 화면에 추가했어요. 이제 홈 화면의 한결 아이콘으로 열어주세요.</p>
        ) : canPrompt ? (
          // 안드로이드 Chrome·삼성 인터넷·컴퓨터 Chrome/Edge: 버튼 하나로 브라우저의 설치 창을 띄운다
          <div className="mt-3">
            <PrimaryButton onClick={() => void promptInstall().then(setInstalled)}>홈 화면에 한결 추가하기</PrimaryButton>
            <p className="mt-2 text-center text-[13px] text-muted">누르면 브라우저가 &lsquo;설치&rsquo;를 한 번 더 물어봐요.</p>
          </div>
        ) : (
          <InstallSteps env={env} />
        )}
      </div>

      <div>
        <h3 className="font-semibold">알림</h3>
        <p className="mt-1.5 text-[15px] text-ink-soft">
          매일 저녁 8시 새 추천, 서로 관심, 대화방 열림, 새 메시지, 연락처 전달을 알려드려요. 알림에는 메시지 내용이 보이지 않아요.
        </p>
        <div className="mt-3">
          {env.support === "not-ready" ? (
            <Notice>알림 기능을 준비하고 있어요.</Notice>
          ) : env.support === "ios-install" ? (
            <Notice>아이폰은 홈 화면에 추가한 한결 앱에서 알림을 켤 수 있어요. 위 방법으로 추가한 뒤, 그 앱의 내 정보에서 켜주세요.</Notice>
          ) : env.support === "unsupported" ? (
            <Notice>이 브라우저는 알림을 지원하지 않아요. Chrome이나 Safari에서 열어주세요.</Notice>
          ) : env.permission === "denied" ? (
            <Notice>알림이 차단되어 있어요. 휴대폰이나 브라우저 설정에서 한결 알림을 허용한 뒤 다시 와주세요.</Notice>
          ) : subscribed ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3.5">
              <span className="text-[15px] text-moss">이 기기로 알림을 받고 있어요.</span>
              <button type="button" disabled={busy} onClick={turnOff} className="text-sm text-muted underline underline-offset-4 disabled:opacity-60">
                {busy ? "끄는 중" : "알림 끄기"}
              </button>
            </div>
          ) : (
            <PrimaryButton onClick={turnOn} disabled={busy}>
              {busy ? "켜는 중" : "알림 켜기"}
            </PrimaryButton>
          )}
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm text-alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

/** 화면 속 버튼 모양을 글 사이에 그려 보여준다 */
function Glyph({ children, label }: { children: ReactNode; label: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      className="mx-0.5 inline-flex h-[22px] w-[22px] translate-y-[3px] items-center justify-center rounded-md bg-surface text-ink ring-1 ring-line"
    >
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </span>
  );
}
const MoreGlyph = () => (
  <Glyph label="더보기 버튼">
    <circle cx="6" cy="12" r="1.2" fill="currentColor" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    <circle cx="18" cy="12" r="1.2" fill="currentColor" />
  </Glyph>
);
const ShareGlyph = () => (
  <Glyph label="공유 버튼">
    <path d="M8 9H6.5A1.5 1.5 0 0 0 5 10.5v8A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 17.5 9H16" />
    <path d="M12 14V3.5M8.5 7 12 3.5 15.5 7" />
  </Glyph>
);
const AddGlyph = () => (
  <Glyph label="홈 화면에 추가 아이콘">
    <rect x="4" y="4" width="16" height="16" rx="3.5" />
    <path d="M12 8.5v7M8.5 12h7" />
  </Glyph>
);

/**
 * 버튼으로 설치 창을 띄울 수 없을 때의 방법. 아이폰은 웹사이트가 설치를 띄울 방법이 없어서(애플이 막아둠) 직접 추가해야 한다.
 * 안드로이드·컴퓨터도 브라우저가 아직 설치 이벤트를 주지 않았거나 전에 닫았으면 메뉴에서 추가한다
 */
function InstallSteps({ env }: { env: Env }) {
  const list = (items: ReactNode[]) => (
    <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[15px] leading-relaxed text-ink-soft">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ol>
  );
  switch (env.guide) {
    case "in-app":
      return env.canHandOff ? (
        <div className="mt-2 space-y-3">
          <p className="text-[15px] text-ink-soft">
            카카오톡 같은 앱 안에서는 홈 화면에 추가할 수 없어요. 휴대폰 기본 브라우저로 연 뒤, 다시 로그인하고 여기서 추가해주세요.
          </p>
          <OpenInBrowserLink href="/me#app">기본 브라우저로 열기</OpenInBrowserLink>
        </div>
      ) : (
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">
          앱 안에서는 홈 화면에 추가할 수 없어요. 오른쪽 위 메뉴에서 &lsquo;Safari로 열기&rsquo;(또는 &lsquo;외부 브라우저로 열기&rsquo;)를 누른 뒤
          여기서 추가해주세요.
        </p>
      );
    case "ios-safari":
      return list([
        <>
          아래쪽 주소창 옆 <MoreGlyph /> 버튼을 누르고 <ShareGlyph /> &lsquo;공유&rsquo;를 눌러요. 공유 버튼이 바로 보이면 그걸 눌러요.
        </>,
        <>
          목록을 위로 올려 <AddGlyph /> &lsquo;홈 화면에 추가&rsquo;를 눌러요.
        </>,
        <>&lsquo;웹 앱으로 열기&rsquo;가 켜진 채로 오른쪽 위 &lsquo;추가&rsquo;를 눌러요.</>,
        <>홈 화면에 생긴 한결 아이콘으로 열어요. 처음 한 번은 다시 로그인해야 할 수 있어요.</>,
      ]);
    case "ios-other":
      return list([
        <>
          주소창 오른쪽의 <ShareGlyph /> 공유 버튼을 눌러요.
        </>,
        <>
          <AddGlyph /> &lsquo;홈 화면에 추가&rsquo;를 누르고 &lsquo;추가&rsquo;를 눌러요. 목록에 없으면 Safari에서 열어 추가해주세요.
        </>,
        <>홈 화면에 생긴 한결 아이콘으로 열어요. 처음 한 번은 다시 로그인해야 할 수 있어요.</>,
      ]);
    case "samsung":
      return list([
        <>아래쪽 ≡ 메뉴에서 &lsquo;현재 페이지 추가&rsquo;를 누르고 &lsquo;홈 화면&rsquo;을 골라요.</>,
        <>주소창에 설치 아이콘이 보이면 그걸 눌러도 돼요.</>,
      ]);
    case "android":
      return list([<>오른쪽 위 ⋮ 메뉴에서 &lsquo;홈 화면에 추가&rsquo;(또는 &lsquo;앱 설치&rsquo;)를 눌러요.</>, <>&lsquo;설치&rsquo;를 누르면 홈 화면에 한결 아이콘이 생겨요.</>]);
    case "desktop":
      return (
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">
          주소창 오른쪽의 설치 아이콘을 누르거나, 브라우저 메뉴에서 &lsquo;한결 설치&rsquo;(또는 &lsquo;앱 설치&rsquo;)를 눌러주세요. 휴대폰에서
          쓰려면 휴대폰으로 한결에 들어와 추가해주세요.
        </p>
      );
  }
}
