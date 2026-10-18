"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { sendChatMessage, setContactShare } from "@/app/chat/actions";
import { CopyText } from "@/components/CopyText";
import { checkChatMessage, MAX_MESSAGE_CHARS } from "@/lib/chat/rules";
import type { ChatMessageView, ChatState } from "@/lib/chat/server";

// 서버와 브라우저가 같은 글자를 그리도록 시간대를 고정한다
const timeFmt = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "numeric", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short" });
const dayKey = (iso: string) => new Date(new Date(iso).getTime() + 9 * 3600_000).toISOString().slice(0, 10);

/** 대화가 오가는 동안은 자주, 조용해지면 드물게 새 메시지를 확인한다. 화면이 가려지면 멈춘다 */
const FAST_MS = 2500;
const MID_MS = 6000;
const SLOW_MS = 15000;
const FAST_WINDOW = 60_000;
const MID_WINDOW = 180_000;

type Props = {
  otherId: string;
  name: string;
  initialMessages: ChatMessageView[];
  initialState: ChatState;
  initialTheirRead: number;
  contact: { instagram: string | null; kakao: string | null } | null;
  tip: string | null;
};

export function ChatRoom({ otherId, name, initialMessages, initialState, initialTheirRead, contact, tip }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [state, setState] = useState(initialState);
  const [theirRead, setTheirRead] = useState(initialTheirRead);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, startSend] = useTransition();
  const [contactPending, startContact] = useTransition();
  const lastIdRef = useRef(initialMessages.at(-1)?.id ?? 0);
  const exchangedRef = useRef(initialState.exchanged);
  /** 마지막으로 대화가 오간 시각 (자주 확인할지 정할 때 쓴다) */
  const activeAt = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const merge = useCallback((incoming: ChatMessageView[]) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const add = incoming.filter((m) => !seen.has(m.id));
      if (!add.length) return prev;
      const next = [...prev, ...add].sort((a, b) => a.id - b.id);
      lastIdRef.current = next[next.length - 1].id;
      return next;
    });
  }, []);

  const applyState = useCallback(
    (s: ChatState) => {
      setState(s);
      if (s.exchanged && !exchangedRef.current) {
        exchangedRef.current = true;
        router.refresh(); // 연락처는 서버에서 다시 받아온다
      }
    },
    [router],
  );

  const poll = useCallback(async () => {
    const res = await fetch(`/api/chat/${otherId}?after=${lastIdRef.current}`, { cache: "no-store" });
    if (res.status === 404) {
      router.refresh();
      return;
    }
    if (!res.ok) return;
    const data = (await res.json()) as { messages: ChatMessageView[]; state: ChatState; theirRead: number };
    if (data.messages.length) activeAt.current = Date.now();
    merge(data.messages);
    setTheirRead(data.theirRead);
    applyState(data.state);
  }, [otherId, router, merge, applyState]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const schedule = () => {
      if (stopped || document.visibilityState !== "visible") return;
      const quiet = Date.now() - activeAt.current;
      const delay = quiet < FAST_WINDOW ? FAST_MS : quiet < MID_WINDOW ? MID_MS : SLOW_MS;
      timer = setTimeout(() => {
        poll()
          .catch(() => {})
          .finally(schedule);
      }, delay);
    };
    const onVisible = () => {
      clearTimeout(timer);
      if (document.visibilityState === "visible") {
        activeAt.current = Date.now();
        poll()
          .catch(() => {})
          .finally(schedule);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    activeAt.current = Date.now();
    schedule();
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll]);

  // 새 메시지가 오면 아래로 (위쪽을 읽는 중이 아니면)
  const count = messages.length;
  useEffect(() => {
    const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 320;
    if (nearBottom || count === initialMessages.length) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [count, initialMessages.length]);

  const remaining = state.limit - state.myCount;
  const canSend = !state.closed && remaining > 0;

  function send() {
    const t = text.trim();
    if (!t || sending) return;
    const problem = checkChatMessage(t);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    startSend(async () => {
      const res = await sendChatMessage(otherId, t);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setText("");
      activeAt.current = Date.now();
      merge([res.message]);
      setState((s) => ({ ...s, myCount: s.myCount + 1 }));
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ block: "end" }));
    });
  }

  function toggleContact(on: boolean) {
    if (on && !window.confirm(`내 연락처를 ${name}님에게 전달할까요? ${name}님도 누르면 서로의 연락처가 보여요.`)) return;
    setError(null);
    startContact(async () => {
      const res = await setContactShare(otherId, on);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      applyState(res.state);
    });
  }

  const lastMine = [...messages].reverse().find((m) => m.mine);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-serif text-[1.5rem] font-bold leading-tight">
          <Link href={`/people/${otherId}`} className="underline-offset-4 hover:underline">
            {name}
          </Link>
          님과의 대화
        </h1>
        <Link href={`/people/${otherId}#safety`} className="shrink-0 text-sm text-muted underline underline-offset-4">
          신고·차단
        </Link>
      </div>

      <ContactPanel state={state} name={name} contact={contact} pending={contactPending} onToggle={toggleContact} otherId={otherId} />

      {messages.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line px-5 py-6 text-center">
          <p className="font-serif text-lg">먼저 인사를 건네보세요</p>
          <p className="mt-2 text-[15px] text-ink-soft">
            {tip ?? "자기소개나 검사 결과에서 공통점을 찾아 이야기를 시작하면 편해요."}
          </p>
        </div>
      ) : (
        <ol className="mt-6 space-y-1.5" aria-label="대화">
          {messages.map((m, i) => {
            const newDay = i === 0 || dayKey(messages[i - 1].at) !== dayKey(m.at);
            const showTime = i === messages.length - 1 || messages[i + 1].mine !== m.mine || dayKey(messages[i + 1].at) !== dayKey(m.at);
            return (
              <li key={m.id}>
                {newDay && <p className="my-4 text-center text-xs text-muted">{dayFmt.format(new Date(m.at))}</p>}
                <div className={`flex items-end gap-1.5 ${m.mine ? "flex-row-reverse" : ""}`}>
                  <p
                    className={`max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed ${
                      m.mine ? "rounded-br-md bg-primary text-white" : "rounded-bl-md border border-line bg-surface text-ink"
                    } ${m.body === null ? "italic opacity-70" : ""}`}
                  >
                    {m.body ?? "보관 기간이 지나 지워진 메시지예요"}
                  </p>
                  {showTime && (
                    <span className="shrink-0 pb-0.5 text-[11px] text-muted">
                      {m.mine && lastMine?.id === m.id && theirRead >= m.id && <span className="mr-1 text-indigo">읽음</span>}
                      {timeFmt.format(new Date(m.at))}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <div ref={bottomRef} />

      <div className="sticky bottom-0 -mx-5 mt-6 border-t border-line bg-paper/95 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        {error && (
          <p role="alert" className="mb-2 text-sm text-alert">
            {error}
          </p>
        )}
        {state.closed ? (
          <p className="text-[15px] text-muted">대화가 닫혀서 더 보낼 수 없어요.</p>
        ) : !canSend ? (
          <p className="text-[15px] text-ink-soft">
            메시지를 모두 보냈어요. {state.exchanged ? "연락처로 이어서 이야기해보세요." : "더 이야기하고 싶으면 위에서 '연락처 전달'을 눌러보세요."}
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <label htmlFor="chat-text" className="sr-only">
              메시지
            </label>
            <div className="flex items-end gap-2">
              <textarea
                id="chat-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  // 컴퓨터에서는 Enter로 보내고 Shift+Enter로 줄바꿈. 휴대폰은 보내기 버튼으로
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={2}
                maxLength={MAX_MESSAGE_CHARS}
                placeholder="메시지를 입력하세요"
                className="min-h-[3rem] flex-1 resize-none rounded-xl border border-line bg-surface px-3.5 py-2.5 text-base text-ink placeholder:text-muted focus:border-indigo focus:outline-none"
              />
              <button
                type="submit"
                disabled={sending || !text.trim()}
                className="shrink-0 rounded-xl bg-primary px-4 py-3 font-semibold text-white disabled:bg-line disabled:text-muted"
              >
                보내기
              </button>
            </div>
            <p className="mt-1.5 flex justify-between text-xs text-muted">
              <span>
                보낼 수 있는 메시지 {remaining}개 · {name}님 {state.limit - state.theirCount}개
              </span>
              <span className="tabular-nums">
                {text.length}/{MAX_MESSAGE_CHARS}
              </span>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

function ContactPanel({
  state,
  name,
  contact,
  pending,
  onToggle,
  otherId,
}: {
  state: ChatState;
  name: string;
  contact: Props["contact"];
  pending: boolean;
  onToggle: (on: boolean) => void;
  otherId: string;
}) {
  const box = "mt-5 rounded-2xl px-4 py-4";
  if (state.exchanged) {
    return (
      <div className={`${box} border border-line bg-surface`}>
        <p className="font-semibold">연락처를 주고받았어요</p>
        {contact && (contact.instagram || contact.kakao) ? (
          <dl className="mt-3 space-y-2">
            {contact.instagram && (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <dt className="text-xs text-muted">인스타그램</dt>
                  <dd className="font-semibold">@{contact.instagram}</dd>
                </div>
                <CopyText text={contact.instagram} />
              </div>
            )}
            {contact.kakao && (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <dt className="text-xs text-muted">카카오톡 ID</dt>
                  <dd className="font-semibold">{contact.kakao}</dd>
                </div>
                <CopyText text={contact.kakao} />
              </div>
            )}
          </dl>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">연락처를 불러오는 중이에요.</p>
        )}
        <Link href={`/people/${otherId}#feedback`} className="mt-3 inline-block text-sm text-muted underline underline-offset-4">
          첫 만남 안전 수칙
        </Link>
      </div>
    );
  }
  if (state.closed) return null;
  if (state.contactTheirs && !state.contactMine) {
    return (
      <div className={`${box} flex flex-wrap items-center justify-between gap-3 bg-mist`}>
        <p className="text-[15px]">
          <strong>{name}님</strong>이 연락처를 주고받고 싶어해요.
        </p>
        <button type="button" disabled={pending} onClick={() => onToggle(true)} className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          연락처 전달
        </button>
      </div>
    );
  }
  if (state.contactMine) {
    return (
      <div className={`${box} flex flex-wrap items-center justify-between gap-3 bg-mist`}>
        <p className="text-[15px] text-ink-soft">연락처 전달을 눌렀어요. {name}님도 누르면 서로의 연락처가 보여요.</p>
        <button type="button" disabled={pending} onClick={() => onToggle(false)} className="shrink-0 text-sm text-muted underline underline-offset-4 disabled:opacity-60">
          취소
        </button>
      </div>
    );
  }
  return (
    <div className={`${box} flex flex-wrap items-center justify-between gap-3 border border-line`}>
      <p className="text-[15px] text-ink-soft">더 이야기하고 싶어지면 연락처를 주고받아 보세요. 둘 다 눌러야 보여요.</p>
      <button
        type="button"
        disabled={pending}
        onClick={() => onToggle(true)}
        className="shrink-0 rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary hover:text-white disabled:opacity-60"
      >
        연락처 전달
      </button>
    </div>
  );
}
