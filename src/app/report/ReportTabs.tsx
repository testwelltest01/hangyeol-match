"use client";

// 내 결 화면 안의 탭. 한 번에 한 묶음만 보여줘서 페이지가 길어지지 않게 한다.
// 고른 탭은 주소의 #(예: /report#friends)에 둔다: 다른 화면의 바로가기 링크와 '친구에게 평가 부탁하기'(#friends)가 그대로 동작한다.
// 탭을 바꿀 때 방문 기록을 쌓지 않는다(replaceState). 패널은 모두 그려 두고 숨기기만 해서 입력 중인 내용이 사라지지 않는다.
import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";

export type ReportTab = { id: string; label: string; content: ReactNode };

const TAB_EVENT = "hg-report-tab";
function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  window.addEventListener(TAB_EVENT, cb);
  return () => {
    window.removeEventListener("hashchange", cb);
    window.removeEventListener(TAB_EVENT, cb);
  };
}
const readHash = () => window.location.hash.slice(1);
const noHash = () => "";

/**
 * syncHash=false: 관리자 화면처럼 주소의 #를 다른 바로가기가 쓰는 곳에서는 탭을 화면 안에서만 기억한다. sticky=false면 탭 줄을 붙이지 않는다.
 * label: 화면 읽기 프로그램용 탭 묶음 이름 (연애 상황 보고서도 이 탭을 쓴다)
 */
export function ReportTabs({
  tabs,
  syncHash = true,
  sticky = true,
  label = "내 결",
}: {
  tabs: ReportTab[];
  syncHash?: boolean;
  sticky?: boolean;
  label?: string;
}) {
  const hash = useSyncExternalStore(subscribe, readHash, noHash);
  const [local, setLocal] = useState(tabs[0].id);
  const wanted = syncHash ? hash : local;
  const active = tabs.some((t) => t.id === wanted) ? wanted : tabs[0].id;

  const anchorRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const firstRun = useRef(true);

  // 탭이 바뀌면: 탭 줄을 지나 아래를 읽고 있었다면 탭 줄 바로 아래(새 내용의 처음)로, 고른 탭이 가로로 가려 있으면 보이게
  useEffect(() => {
    const skip = firstRun.current && active === tabs[0].id;
    firstRun.current = false;
    if (skip) return;
    const anchor = anchorRef.current;
    const header = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    if (anchor && anchor.getBoundingClientRect().top < header) anchor.scrollIntoView({ block: "start" });
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active, tabs]);

  function select(id: string) {
    if (!syncHash) {
      setLocal(id);
      return;
    }
    window.history.replaceState(window.history.state, "", `#${id}`);
    window.dispatchEvent(new Event(TAB_EVENT));
  }

  // 왼쪽·오른쪽 화살표로 탭 옮기기 (키보드)
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = tabs.findIndex((t) => t.id === active);
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    select(next.id);
    listRef.current?.querySelector<HTMLElement>(`#report-tab-${next.id}`)?.focus();
  }

  return (
    <div className="mt-6">
      <div ref={anchorRef} aria-hidden />
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className={`-mx-5 flex gap-1 overflow-x-auto border-b border-line/80 bg-paper/95 px-4 backdrop-blur-md [scrollbar-width:none] ${
          sticky ? "sticky top-[calc(52px+env(safe-area-inset-top))] z-30" : "relative"
        }`}
      >
        {tabs.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              id={`report-tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`report-panel-${t.id}`}
              tabIndex={on ? 0 : -1}
              onClick={() => select(t.id)}
              className={`relative shrink-0 whitespace-nowrap px-2.5 py-3 text-[15px] transition-colors ${
                on ? "font-semibold text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {t.label}
              <span aria-hidden className={`absolute inset-x-2 -bottom-px h-[2.5px] rounded-full ${on ? "bg-primary" : "bg-transparent"}`} />
            </button>
          );
        })}
      </div>

      {tabs.map((t) => (
        <div
          key={t.id}
          id={`report-panel-${t.id}`}
          role="tabpanel"
          aria-labelledby={`report-tab-${t.id}`}
          hidden={t.id !== active}
          className="pt-5"
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
