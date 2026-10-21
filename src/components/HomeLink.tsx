"use client";

// 로그인했는지에 따라 가는 곳이 달라지는 링크. 서버에 묻지 않고 브라우저의 로그인 쿠키로 판단한다
// (화면 껍데기를 정적으로 두기 위해. 진짜 확인은 /start가 하고, 로그인이 풀렸으면 가입·로그인으로 보낸다).
// 로그인했으면 /start(진행 단계에 맞는 화면으로 넘겨주는 주소)로 페이지를 새로 연다. /start는 화면이 아니라
// 넘겨주기만 해서 앱 안 이동(next/link)으로 가면 꼬일 수 있다
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { hasAuthCookie } from "@/lib/authHint";

const noop = () => () => {};
function useLoggedIn(): boolean {
  return useSyncExternalStore(
    noop,
    () => hasAuthCookie(document.cookie),
    () => false,
  );
}

/** 위쪽 바 왼쪽 '한결' 글씨 (탭 없는 화면): 로그인했으면 내 화면, 아니면 첫 화면 */
export function HomeLink({ className }: { className: string }) {
  const loggedIn = useLoggedIn();
  return loggedIn ? (
    <a href="/start" className={className}>
      한결
    </a>
  ) : (
    <Link href="/" className={className}>
      한결
    </Link>
  );
}

/** 첫 화면 오른쪽 위: 로그인했으면 '계속하기', 아니면 '로그인' */
export function LoginOrContinue({ className }: { className: string }) {
  const loggedIn = useLoggedIn();
  return loggedIn ? (
    <a href="/start" className={className}>
      계속하기
    </a>
  ) : (
    <Link href="/login" className={className}>
      로그인
    </Link>
  );
}
