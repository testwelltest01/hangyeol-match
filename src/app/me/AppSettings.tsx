"use client";

import { useEffect, useState } from "react";
import { PrimaryButton } from "@/components/Shell";
import { Notice } from "@/components/ui";
import {
  currentSubscription,
  disablePush,
  enablePush,
  getInstallPrompt,
  isIOS,
  isStandalone,
  onInstallPromptChange,
  promptInstall,
  pushSupport,
  type PushSupport,
} from "@/lib/push/client";

type Env = { standalone: boolean; ios: boolean; support: PushSupport; permission: NotificationPermission | null };

/** 내 정보의 '앱처럼 쓰기': 홈 화면에 추가하는 방법과 이 기기 알림 켜기/끄기 */
export function AppSettings() {
  const [env, setEnv] = useState<Env | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 브라우저에서만 알 수 있는 값이라 화면이 뜬 뒤에 읽는다
    const read = () => {
      setEnv({
        standalone: isStandalone(),
        ios: isIOS(),
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
        ) : canPrompt ? (
          <div className="mt-3">
            <PrimaryButton onClick={() => void promptInstall()}>홈 화면에 한결 추가하기</PrimaryButton>
          </div>
        ) : env.ios ? (
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-[15px] text-ink-soft">
            <li>Safari 아래쪽(또는 주소창 옆)의 공유 버튼을 눌러요. 네모에서 화살표가 위로 나온 모양이에요.</li>
            <li>목록을 내려 &lsquo;홈 화면에 추가&rsquo;를 누르고, 오른쪽 위 &lsquo;추가&rsquo;를 눌러요.</li>
            <li>홈 화면에 생긴 한결 아이콘으로 열면 앱처럼 쓸 수 있어요.</li>
          </ol>
        ) : (
          <p className="mt-1.5 text-[15px] text-ink-soft">
            브라우저 메뉴(⋮ 또는 ≡)에서 &lsquo;홈 화면에 추가&rsquo;나 &lsquo;앱 설치&rsquo;를 눌러주세요.
          </p>
        )}
      </div>

      <div>
        <h3 className="font-semibold">알림</h3>
        <p className="mt-1.5 text-[15px] text-ink-soft">
          서로 관심, 대화방 열림, 새 메시지, 연락처 전달을 알려드려요. 알림에는 메시지 내용이 보이지 않아요.
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
