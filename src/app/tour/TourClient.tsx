"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { LikedBadge } from "@/components/LikedBadge";
import { personLine, TalkingPoint } from "@/components/PersonCard";
import { PrimaryButton, PrimaryLink } from "@/components/buttons";
import { Notice } from "@/components/ui";
import { ZoomImage } from "@/components/ZoomImage";
import { checkChatMessage, MAX_MESSAGE_CHARS, MESSAGES_PER_PERSON } from "@/lib/chat/rules";
import { personaFor, type TourGender, type TourPersona } from "@/lib/tour/personas";

// 가상 매칭 둘러보기. 모든 것이 이 화면 안에서만 일어나고 서버에는 아무것도 보내지 않는다.

export type JourneyStep = { id: string; label: string; href: string; done: boolean; detail: string; minutes: number | null };

type Props = {
  initialGender: TourGender | null;
  nickname: string | null;
  journey: JourneyStep[];
  cta: { href: string; label: string };
};

type Stage = "gender" | "card" | "photos" | "waitAccept" | "chat" | "done";
type Msg = { id: number; mine: boolean; body: string; at: number };
type Contact = "none" | "mine" | "theirs" | "exchanged";

const FLOW = ["추천", "관심", "사진 공개", "대화", "연락처"];
const timeFmt = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "numeric", minute: "2-digit" });
const rise = "motion-safe:animate-[rise-in_260ms_ease-out]";

export function TourClient({ initialGender, nickname, journey, cta }: Props) {
  const [gender, setGender] = useState<TourGender | null>(initialGender);
  const [stage, setStage] = useState<Stage>(initialGender ? "card" : "gender");
  const [cardOpen, setCardOpen] = useState(false);
  const [passed, setPassed] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [busy, setBusy] = useState(false);

  // 대화방
  const [messages, setMessages] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [round, setRound] = useState(0);
  const [contact, setContact] = useState<Contact>("none");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const contactRef = useRef<Contact>("none");
  const idRef = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [stage]);
  useEffect(() => {
    if (messages.length) bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length, typing, contact]);

  const p = gender ? personaFor(gender) : null;
  const later = (ms: number, fn: () => void) => void timers.current.push(setTimeout(fn, ms));
  const fill = (s: string) => s.replace("{name}", nickname ? ` ${nickname}님` : "");

  function setContactBoth(c: Contact) {
    contactRef.current = c;
    setContact(c);
  }

  function push(mine: boolean, body: string) {
    idRef.current += 1;
    const id = idRef.current;
    setMessages((m) => [...m, { id, mine, body, at: Date.now() }]);
  }

  /** 상대가 여러 줄을 차례로 보낸다 (입력 중 표시 → 한 줄씩) */
  function theySay(lines: string[], then?: () => void) {
    setTyping(true);
    let t = 900;
    lines.forEach((line, i) => {
      later(t, () => {
        push(false, line);
        if (i === lines.length - 1) {
          setTyping(false);
          then?.();
        }
      });
      t += 800 + Math.min(line.length * 22, 1400);
    });
  }

  function restart() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setMessages([]);
    setTyping(false);
    setRound(0);
    setContactBoth("none");
    setText("");
    setError(null);
    setCardOpen(false);
    setPassed(false);
    setDeclined(false);
    setBusy(false);
    setStage(gender ? "card" : "gender");
  }

  function sendInterest() {
    setBusy(true);
    later(700, () => {
      setBusy(false);
      setStage("photos");
    });
  }

  function accept(persona: TourPersona) {
    setStage("waitAccept");
    later(1700, () => {
      setStage("chat");
      theySay(persona.opening.map(fill));
    });
  }

  function reply(persona: TourPersona, body: string, answer: string[] | null) {
    push(true, body);
    setText("");
    setError(null);
    const r = persona.rounds[round];
    const lastRound = round === persona.rounds.length - 1;
    setRound((n) => n + 1);
    const lines =
      answer ?? r?.freeAnswer ?? [contactRef.current === "exchanged" ? "ㅎㅎ 이제 연락처로도 편하게 이야기해요!" : "ㅎㅎ 연락처 주고받고 이어서 이야기해요!"];
    theySay(lines, () => {
      if (lastRound && contactRef.current === "none") {
        theySay([persona.contactAsk], () => {
          if (contactRef.current === "none") setContactBoth("theirs");
        });
      }
    });
  }

  function sendFree(persona: TourPersona) {
    const t = text.trim();
    if (!t || typing) return;
    const problem = checkChatMessage(t);
    if (problem) {
      setError(problem);
      return;
    }
    reply(persona, t, null);
  }

  function shareContact() {
    if (contactRef.current === "theirs") {
      setContactBoth("exchanged");
      return;
    }
    setContactBoth("mine");
    later(1600, () => {
      push(false, "앗 저도 지금 누르려고 했어요 ㅎㅎ");
      setContactBoth("exchanged");
    });
  }

  if (!p || stage === "gender") {
    return (
      <section className={`mt-8 ${rise}`}>
        <h2 className="font-serif text-xl font-bold">먼저 하나만 알려주세요</h2>
        <p className="mt-1.5 text-[15px] text-ink-soft">한결은 이성 매칭만 해요. 이 선택은 체험에서만 쓰고 저장하지 않아요.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {(
            [
              { g: "male", label: "남성이에요", sub: "여성을 소개받아요" },
              { g: "female", label: "여성이에요", sub: "남성을 소개받아요" },
            ] as const
          ).map((o) => (
            <button
              key={o.g}
              type="button"
              onClick={() => {
                setGender(o.g);
                setStage("card");
              }}
              className="rounded-2xl border border-line bg-surface px-4 py-5 text-center transition-colors hover:border-indigo"
            >
              <span className="block font-semibold">{o.label}</span>
              <span className="mt-1 block text-sm text-muted">{o.sub}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  const flowAt = stage === "card" ? 0 : stage === "photos" || stage === "waitAccept" ? 2 : stage === "chat" ? (contact === "exchanged" ? 4 : 3) : 5;

  return (
    <div className="mt-6">
      <Flow at={flowAt} />
      <div className="mt-5">
        <Notice>
          <strong className="font-semibold text-ink">{p.nickname}님은 체험용 가상 인물이에요.</strong> 실제 회원이 아니고, 여기서 누른 건 아무것도
          저장되지 않아요.
        </Notice>
      </div>

      {stage === "card" && (
        <section className={`mt-8 ${rise}`}>
          <div aria-hidden className="grid grid-cols-3 border-b border-line text-[16px]">
            <span className="relative py-3 text-center font-semibold text-ink after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary">
              오늘
            </span>
            <span className="py-3 text-center text-muted">관심</span>
            <span className="py-3 text-center text-muted">연결</span>
          </div>
          <p className="mt-6 text-ink-soft">매일 저녁 8시에 결이 맞는 한 사람을 새로 골라요. 어떻게 만나는지 먼저 따라가 볼게요.</p>

          <article className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-serif text-xl font-bold">
                  {p.nickname} <VirtualTag />
                </h3>
                <LikedBadge />
              </div>
              <p className="mt-1 text-sm text-muted">{personLine(p)}</p>
              <p className="mt-4 border-l-2 border-indigo pl-3 font-serif leading-relaxed">{p.reason}</p>
              {/* 실제 추천 카드처럼 '다를 수 있는 부분'도 처음부터 보여준다 */}
              <TalkingPoint text={p.talkingPoint} />
              <Chips items={p.chips} />
              <p className={`mt-4 whitespace-pre-line text-[15px] text-ink-soft ${cardOpen ? "" : "line-clamp-4"}`}>{p.intro}</p>
              {cardOpen && (
                <div className={rise}>
                  <Domains persona={p} />
                </div>
              )}
              <div className="mt-5 flex items-center gap-3">
                <div className="flex flex-1 gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={sendInterest}
                    className="flex-1 rounded-full bg-primary transition active:scale-[0.98] active:opacity-80 px-4 py-3 font-semibold text-white disabled:bg-line disabled:text-muted"
                  >
                    {busy ? "보내는 중" : "관심 있어요"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setPassed(true)}
                    className="rounded-full border border-line px-4 py-3 text-ink-soft disabled:opacity-60"
                  >
                    넘기기
                  </button>
                </div>
                <button type="button" onClick={() => setCardOpen((o) => !o)} className="shrink-0 text-sm text-muted underline underline-offset-4">
                  {cardOpen ? "접기" : "자세히"}
                </button>
              </div>
              {passed && (
                <p role="status" className={`mt-3 text-sm text-ink-soft ${rise}`}>
                  실제로는 넘긴 사람은 다시 추천되지 않아요. 체험이니 관심을 보내볼까요?
                </p>
              )}
            </div>
          </article>

          <div className="mt-4 rounded-2xl border border-dashed border-line px-5 py-4 text-center text-sm text-muted">
            나머지 2명은 매칭이 시작되면 진짜 회원으로 만나요
          </div>

          <Guide>
            추천 카드에는 사진이 없어요. 검사 결과로 찾은 추천 이유와 자기소개를 먼저 보고, 마음이 가면 &lsquo;관심 있어요&rsquo;를 눌러요. 상대가 먼저
            관심을 보냈다면 &lsquo;관심을 받았어요&rsquo;가 붙어요.
          </Guide>
        </section>
      )}

      {(stage === "photos" || stage === "waitAccept") && (
        <article className={`mt-8 ${rise}`}>
          <div className="flex items-center gap-2.5 rounded-2xl bg-rose/10 px-4 py-3.5 text-rose">
            <Heart />
            <p className="font-semibold">서로 관심을 보냈어요! 사진이 공개됐어요.</p>
          </div>

          <h2 className="mt-7 font-serif text-[1.9rem] font-bold leading-tight">
            {p.nickname} <VirtualTag />
          </h2>
          <p className="mt-1 text-muted">{personLine(p)}</p>
          <p className="mt-5 border-l-2 border-indigo pl-3 font-serif text-[1.05rem] leading-relaxed">{p.reason}</p>
          <p className="mt-3 text-ink-soft">{p.talkingPoint}</p>

          <div className="mt-7 grid grid-cols-2 gap-3">
            <div className="aspect-[3/4] overflow-hidden rounded-xl bg-mist">
              <ZoomImage src={p.photos.face} alt={`${p.nickname}님의 얼굴 사진 (가상 인물)`} />
            </div>
            <div className="aspect-[3/4] overflow-hidden rounded-xl bg-mist">
              <ZoomImage src={p.photos.body} alt={`${p.nickname}님의 전신 사진 (가상 인물)`} />
            </div>
          </div>
          <p className="mt-2 text-sm text-muted">사진을 누르면 크게 볼 수 있어요.</p>

          <Guide>
            서로 관심을 보내면 이때 처음으로 서로의 얼굴·전신 사진이 보여요. 내 사진도 이렇게 관심을 주고받은 사람에게만 공개돼요.
          </Guide>

          <section className="mt-8">
            <h3 className="text-sm font-semibold text-muted">자기소개</h3>
            <p className="mt-2 whitespace-pre-line leading-relaxed">{p.intro}</p>
            <Chips items={p.chips} />
          </section>
          <section className="mt-8">
            <h3 className="text-sm font-semibold text-muted">나와 비슷한 정도</h3>
            <Domains persona={p} plain />
          </section>

          <section className="mt-10 border-t border-line pt-8">
            {stage === "photos" ? (
              <>
                <p className="mb-4 text-ink-soft">사진을 보고 마음에 들면 수락해주세요. 서로 수락하면 대화방이 열려요.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => accept(p)} className="flex-1 rounded-full bg-primary transition active:scale-[0.98] active:opacity-80 px-4 py-3 font-semibold text-white">
                    수락하기
                  </button>
                  <button type="button" onClick={() => setDeclined(true)} className="rounded-full border border-line px-4 py-3 text-ink-soft">
                    이번엔 넘길게요
                  </button>
                </div>
                {declined && (
                  <p role="status" className={`mt-3 text-sm text-ink-soft ${rise}`}>
                    실제로는 넘기면 다시 볼 수 없어요. 체험이니 수락해서 대화방까지 가볼까요?
                  </p>
                )}
              </>
            ) : (
              <Notice>
                <span className="flex items-center gap-2">
                  수락했어요. {p.nickname}님의 답을 기다리고 있어요 <Dots />
                </span>
              </Notice>
            )}
          </section>
        </article>
      )}

      {stage === "chat" && (
        <section className={`mt-8 ${rise}`}>
          <div className="flex items-center gap-2.5 rounded-2xl bg-moss/10 px-4 py-3.5 text-moss">
            <Heart />
            <p className="font-semibold">서로 수락했어요. 대화방이 열렸어요.</p>
          </div>
          <h2 className="mt-7 font-serif text-[1.6rem] font-bold leading-tight">
            {p.nickname}님과의 대화 <VirtualTag />
          </h2>

          {/* 실제 대화방처럼 위에 두되, 상대가 먼저 누른 뒤와 주고받은 뒤에는 대화를 따라 읽는 자리(아래)에 보여준다 */}
          {(contact === "none" || contact === "mine") && <ContactBox persona={p} contact={contact} onShare={shareContact} onFinish={() => setStage("done")} />}

          <Guide>
            한 사람당 메시지를 {MESSAGES_PER_PERSON}개까지 보낼 수 있고, 대화창에는 전화번호·아이디를 쓸 수 없어요. 더 이야기하고 싶으면 둘 다
            &lsquo;연락처 전달&rsquo;을 눌러요.
          </Guide>

          <ol className="mt-6 space-y-1.5" aria-label="대화" aria-live="polite">
            {messages.map((m, i) => {
              const showTime = i === messages.length - 1 || messages[i + 1].mine !== m.mine;
              return (
                <li key={m.id} className={rise}>
                  <div className={`flex items-end gap-1.5 ${m.mine ? "flex-row-reverse" : ""}`}>
                    <p
                      className={`max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed ${
                        m.mine ? "rounded-br-md bg-primary text-white" : "rounded-bl-md border border-line bg-surface text-ink"
                      }`}
                    >
                      {m.body}
                    </p>
                    {showTime && <span className="shrink-0 pb-0.5 text-[11px] text-muted">{timeFmt.format(new Date(m.at))}</span>}
                  </div>
                </li>
              );
            })}
            {typing && (
              <li className="flex">
                <span className="rounded-2xl rounded-bl-md border border-line bg-surface px-3.5 py-3" aria-label={`${p.nickname}님이 입력 중`}>
                  <Dots />
                </span>
              </li>
            )}
          </ol>
          {(contact === "theirs" || contact === "exchanged") && (
            <ContactBox persona={p} contact={contact} onShare={shareContact} onFinish={() => setStage("done")} />
          )}

          {/* 체험 대화는 짧아서 입력창을 고정하지 않고 대화 바로 아래에 둔다 (새 메시지가 입력창에 가리지 않게) */}
          <div className="mt-6 border-t border-line pt-4">
            {!typing && round < p.rounds.length && (
              <div className={`mb-3 ${rise}`}>
                <p className="mb-2 text-xs text-muted">답장을 골라보거나 직접 써보세요</p>
                <div className="flex flex-col gap-2">
                  {p.rounds[round].replies.map((r) => (
                    <button
                      key={r.text}
                      type="button"
                      onClick={() => reply(p, r.text, r.answer)}
                      className="rounded-2xl border border-indigo/40 bg-surface px-3.5 py-2.5 text-left text-[15px] text-ink hover:border-indigo"
                    >
                      {r.text}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {error && (
              <p role="alert" className="mb-2 text-sm text-alert">
                {error}
              </p>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendFree(p);
              }}
            >
              <label htmlFor="tour-text" className="sr-only">
                메시지
              </label>
              <div className="flex items-end gap-2">
                <textarea
                  id="tour-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
                      e.preventDefault();
                      sendFree(p);
                    }
                  }}
                  rows={1}
                  maxLength={MAX_MESSAGE_CHARS}
                  placeholder={typing ? `${p.nickname}님이 입력 중이에요` : "메시지를 입력하세요"}
                  className="min-h-[3rem] flex-1 resize-none rounded-xl border border-line bg-surface px-3.5 py-2.5 text-base text-ink placeholder:text-muted focus:border-indigo focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={typing || !text.trim()}
                  className="shrink-0 rounded-xl bg-primary transition active:scale-[0.98] active:opacity-80 px-4 py-3 font-semibold text-white disabled:bg-line disabled:text-muted"
                >
                  보내기
                </button>
              </div>
              <p className="mt-1.5 text-xs text-muted">
                보낼 수 있는 메시지 {MESSAGES_PER_PERSON - messages.filter((m) => m.mine).length}개 · {p.nickname}님{" "}
                {MESSAGES_PER_PERSON - messages.filter((m) => !m.mine).length}개
              </p>
            </form>
          </div>
          <div ref={bottomRef} />
        </section>
      )}

      {stage === "done" && <Finish persona={p} journey={journey} cta={cta} onRestart={restart} />}
    </div>
  );
}

function Flow({ at }: { at: number }) {
  return (
    <ol className="grid grid-cols-5 gap-1.5" aria-label="체험 단계">
      {FLOW.map((label, i) => {
        const state = i < at ? "done" : i === at ? "now" : "next";
        return (
          <li key={label} aria-current={state === "now" ? "step" : undefined} className="text-center">
            <span className={`block h-1 rounded-full ${state === "done" ? "bg-moss" : state === "now" ? "bg-primary" : "bg-line"}`} />
            <span className={`mt-1.5 block text-[13px] ${state === "now" ? "font-semibold text-ink" : state === "done" ? "text-moss" : "text-muted"}`}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function VirtualTag() {
  return (
    <span className="ml-1 inline-block translate-y-[-3px] rounded-full border border-dashed border-muted/60 px-2 py-0.5 align-middle font-sans text-xs font-normal text-muted">
      가상 인물
    </span>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 flex flex-wrap gap-2" aria-label="성향">
      {items.map((c) => (
        <li key={c} className="rounded-full bg-mist px-3 py-1 text-sm text-ink-soft">
          {c}
        </li>
      ))}
    </ul>
  );
}

function Domains({ persona, plain = false }: { persona: TourPersona; plain?: boolean }) {
  return (
    <>
      {!plain && <p className="mt-5 text-sm font-semibold text-muted">나와 비슷한 정도</p>}
      <ul className="mt-3 space-y-2.5">
        {persona.domains.map((d) => (
          <li key={d.label} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-3 text-[15px]">
            <span>{d.label}</span>
            <span className="relative h-1.5 rounded-full bg-line" aria-hidden>
              <span className="absolute inset-y-0 left-0 rounded-full bg-indigo/70" style={{ width: `${d.percent}%` }} />
            </span>
            <span className="text-right text-sm text-muted">{d.percent}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">체험용 예시 값이에요. 실제로는 두 사람의 검사 결과로 계산해요.</p>
    </>
  );
}

function Guide({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 flex gap-3 rounded-xl border border-indigo/20 bg-indigo/5 px-4 py-3.5 text-[15px] leading-relaxed text-ink-soft">
      <span className="shrink-0 pt-px text-xs font-semibold text-indigo">실제로는</span>
      <p>{children}</p>
    </div>
  );
}

function Heart() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 shrink-0 fill-current motion-safe:animate-[zoom-in_320ms_ease-out]">
      <path d="M12 21s-7.5-4.6-10-9.3C.4 8.4 2.3 4.5 6 4.5c2.1 0 3.4 1.1 4.2 2.3h3.6C14.6 5.6 15.9 4.5 18 4.5c3.7 0 5.6 3.9 4 7.2C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

function Dots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {[0, 150, 300].map((d) => (
        <span key={d} className="h-1.5 w-1.5 rounded-full bg-muted motion-safe:animate-bounce" style={{ animationDelay: `${d}ms` }} />
      ))}
    </span>
  );
}

function ContactBox({
  persona,
  contact,
  onShare,
  onFinish,
}: {
  persona: TourPersona;
  contact: Contact;
  onShare: () => void;
  onFinish: () => void;
}) {
  const box = `mt-5 rounded-2xl px-4 py-4 ${rise}`;
  const name = persona.nickname;
  if (contact === "exchanged") {
    return (
      <div className={`${box} border border-line bg-surface`}>
        <p className="font-semibold">연락처를 주고받았어요</p>
        <dl className="mt-3 space-y-2">
          <div>
            <dt className="text-xs text-muted">인스타그램</dt>
            <dd className="font-semibold tracking-wider">@●●●●●●●</dd>
          </div>
        </dl>
        <p className="mt-2 text-sm text-ink-soft">
          체험이라 가려 두었어요. 실제로는 여기에 상대의 인스타그램이나 카카오톡 ID가 보이고 바로 복사할 수 있어요.
        </p>
        <div className="mt-4">
          <PrimaryButton onClick={onFinish}>체험 마치고 남은 준비 보기</PrimaryButton>
        </div>
      </div>
    );
  }
  if (contact === "theirs") {
    return (
      <div className={`${box} flex flex-wrap items-center justify-between gap-3 bg-mist`}>
        <p className="text-[15px]">
          <strong>{name}님</strong>이 연락처를 주고받고 싶어해요.
        </p>
        <button type="button" onClick={onShare} className="shrink-0 rounded-full bg-primary transition active:scale-[0.98] active:opacity-80 px-4 py-2 text-sm font-semibold text-white">
          연락처 전달
        </button>
      </div>
    );
  }
  if (contact === "mine") {
    return (
      <div className={`${box} bg-mist`}>
        <p className="text-[15px] text-ink-soft">연락처 전달을 눌렀어요. {name}님도 누르면 서로의 연락처가 보여요.</p>
      </div>
    );
  }
  return (
    <div className={`${box} flex flex-wrap items-center justify-between gap-3 border border-line`}>
      <p className="text-[15px] text-ink-soft">더 이야기하고 싶어지면 연락처를 주고받아 보세요. 둘 다 눌러야 보여요.</p>
      <button
        type="button"
        onClick={onShare}
        className="shrink-0 rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary hover:text-white"
      >
        연락처 전달
      </button>
    </div>
  );
}

function Finish({
  persona,
  journey,
  cta,
  onRestart,
}: {
  persona: TourPersona;
  journey: JourneyStep[];
  cta: Props["cta"];
  onRestart: () => void;
}) {
  const left = journey.filter((s) => !s.done);
  const minutes = left.reduce((sum, s) => sum + (s.minutes ?? 0), 0);
  return (
    <div className={`mt-8 ${rise}`}>
      <section className="rounded-2xl border border-line bg-surface px-5 py-6 text-center">
        <p className="font-serif text-2xl font-bold">체험 끝!</p>
        <p className="mt-2 text-ink-soft">{persona.nickname}님과 그랬듯, 한결에서는 이렇게 한 사람을 만나요.</p>
        <ol className="mt-4 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2 text-sm" aria-label="소개 과정">
          {FLOW.map((f, i) => (
            <li key={f} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden className="text-muted">→</span>}
              <span className="rounded-full bg-mist px-2.5 py-1 text-ink-soft">{f}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl font-bold">{left.length ? `진짜 소개까지 ${left.length}단계 남았어요` : "진짜 소개를 받을 준비가 끝났어요"}</h2>
        <p className="mt-2 text-ink-soft">
          {left.length
            ? `남은 시간은 약 ${minutes}분이에요. 모두 채우면 바로 오늘의 추천이 열리고, 그다음부터 매일 결이 맞는 한 사람이 찾아와요.`
            : "오늘의 추천에서 결이 맞는 진짜 회원을 만나보세요."}
        </p>
        <ol className="mt-6 space-y-2.5">
          {journey.map((s, i) => (
            <li key={s.id} className={`flex items-start gap-4 rounded-2xl border px-5 py-4 ${s.done ? "border-line bg-surface/60" : "border-line bg-surface"}`}>
              <span className={`w-5 shrink-0 text-center font-serif text-xl leading-6 ${s.done ? "text-moss" : "text-indigo"}`}>{s.done ? "✓" : i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className={`block ${s.done ? "text-muted line-through decoration-line" : "font-semibold"}`}>{s.label}</span>
                {!s.done && <span className="mt-0.5 block text-sm text-muted">{s.detail}</span>}
              </span>
              <span className="shrink-0 pt-0.5 text-sm text-muted">{s.done ? "완료" : s.minutes ? `${s.minutes}분` : ""}</span>
            </li>
          ))}
        </ol>
        <div className="mt-6">
          <PrimaryLink href={cta.href}>{cta.label}</PrimaryLink>
        </div>
        <p className="mt-4 text-center">
          <button type="button" onClick={onRestart} className="text-sm text-muted underline underline-offset-4">
            처음부터 다시 보기
          </button>
        </p>
      </section>
    </div>
  );
}
