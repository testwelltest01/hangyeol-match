// 앱 화면 공통 조각: 화면 제목, 묶음 목록, 상태 칩, 빈 화면, 다음 할 일 카드(결 진행 표시), 이름 동그라미.
// 서버·화면 어디서나 쓸 수 있게 훅을 쓰지 않는다.
import Link from "next/link";
import type { ReactNode } from "react";
import { PrimaryLink } from "@/components/buttons";
import { IconCheck } from "@/components/icons";
import { PendingChevron } from "@/components/LinkPending";

/** 화면 제목. 제목만 고운바탕, 나머지는 프리텐다드 */
export function PageHeader({ title, sub, aside }: { title: string; sub?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-serif text-[1.65rem] font-bold leading-tight text-ink">{title}</h1>
        {aside && <div className="shrink-0 pt-1.5">{aside}</div>}
      </div>
      {sub && <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{sub}</p>}
    </div>
  );
}

type Tone = "done" | "turn" | "wait" | "alert";
const TONE: Record<Tone, string> = {
  done: "bg-moss/10 text-moss",
  turn: "bg-indigo/10 text-indigo",
  wait: "bg-mist text-muted",
  alert: "bg-rose/10 text-rose",
};

export function StatusChip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${TONE[tone]}`}>
      {children}
    </span>
  );
}

/** 하얀 바탕에 한 줄씩 나뉜 목록 묶음 */
export function ListGroup({ title, note, children }: { title?: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section>
      {title && <h2 className="mb-2 px-1 text-[14px] font-semibold text-ink-soft">{title}</h2>}
      <div className="divide-y divide-line/70 overflow-hidden rounded-2xl bg-surface ring-1 ring-line/80">{children}</div>
      {note && <p className="mt-2 px-1 text-[13px] leading-relaxed text-muted">{note}</p>}
    </section>
  );
}

export function ListRow({
  href,
  icon,
  label,
  sub,
  right,
  chevron = true,
}: {
  href?: string;
  icon?: ReactNode;
  label: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  chevron?: boolean;
}) {
  const body = (
    <>
      {icon && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mist text-ink">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] text-ink">{label}</span>
        {sub && <span className="mt-0.5 block text-[13px] leading-snug text-muted">{sub}</span>}
      </span>
      {right}
      {href && chevron && <PendingChevron size={18} className="text-muted/70" />}
    </>
  );
  const cls = "flex items-center gap-3.5 px-4 py-3.5";
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:bg-mist/60`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** 비어 있는 화면: 무엇을 하면 되는지 알려준다 */
export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-[22px] bg-surface px-6 py-9 text-center ring-1 ring-line/80">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mist text-ink">{icon}</span>
      <p className="mt-4 font-semibold text-ink">{title}</p>
      {body && <p className="mx-auto mt-1.5 max-w-[30ch] text-[15px] leading-relaxed text-ink-soft">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const AVATAR_TINTS = ["bg-mist", "bg-indigo/10", "bg-moss/15", "bg-rose/10", "bg-ochre/15"];

/**
 * 사람을 가리키는 작은 동그라미. src(얼굴 사진·그림 프로필, 서명 주소)가 있으면 그 사진, 없으면 이름 첫 글자.
 * 다른 사람의 얼굴은 사진이 공개된 단계(photosVisible)에서만 넘긴다
 */
export function Avatar({ name, size = 44, src }: { name: string; size?: number; src?: string | null }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 10분짜리 서명 주소라 next/image 최적화를 쓰지 않는다
      <img
        src={src}
        alt=""
        aria-hidden
        className="aspect-square max-w-none shrink-0 rounded-full bg-mist object-cover object-top ring-1 ring-line/60"
        style={{ width: size, height: size }}
      />
    );
  }
  const tint = AVATAR_TINTS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TINTS.length];
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full font-serif font-bold text-ink ${tint}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {[...name][0] ?? "?"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// 다음 할 일: 매칭까지 남은 단계를 두 갈래 결이 하나로 모이는 모양으로 보여준다
// ---------------------------------------------------------------------------

export type JourneyStep = { id: string; label: string; href: string; done: boolean };

const NEXT: Record<string, { cta: string; hint: string }> = {
  profile: { cta: "내 정보 채우기", hint: "지역, 키, 자기소개를 적어요. 추천 카드에 이 정보가 보여요." },
  filters: { cta: "원하는 조건 정하기", hint: "나이·지역처럼 꼭 맞았으면 하는 조건을 골라요." },
  photos: { cta: "사진 올리기", hint: "얼굴·전신 2장. 서로 관심을 보낸 사람에게만 보여요." },
  contact: { cta: "연락처 등록하기", hint: "둘 다 '연락처 전달'을 누르기 전에는 상대에게 보이지 않아요." },
};

/** showList=false: 같은 화면에 단계 목록이 따로 있을 때(내 정보) 카드에서는 다음 할 일만 보여준다 */
export function NextStepCard({ steps, doneTitle, showList = true }: { steps: JourneyStep[]; doneTitle?: string; showList?: boolean }) {
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  if (!next) return doneTitle ? <p className="text-ink-soft">{doneTitle}</p> : null;
  const info = NEXT[next.id] ?? { cta: `${next.label} 하기`, hint: "" };
  return (
    <section className="overflow-hidden rounded-[22px] bg-surface ring-1 ring-line/80">
      <div className="px-5 pt-5">
        <h2 className="text-[1.15rem] font-semibold text-ink">매칭까지 {steps.length - done}단계 남았어요</h2>
        <Strands done={done} total={steps.length} />
        <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">
          다음은 <strong className="font-semibold text-ink">{next.label}</strong>. {info.hint}
        </p>
        <div className={showList ? "mt-4" : "mb-5 mt-4"}>
          <PrimaryLink href={next.href}>{info.cta}</PrimaryLink>
        </div>
      </div>
      {showList && (
        <ol className="mt-5 divide-y divide-line/70 border-t border-line/70">
          {steps.map((s, i) => {
            const current = s.id === next.id;
            return (
              <li key={s.id}>
                <Link href={s.href} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-mist/60">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
                      s.done ? "bg-moss text-white" : current ? "bg-indigo text-white" : "bg-mist text-muted"
                    }`}
                  >
                    {s.done ? <IconCheck size={14} strong /> : i + 1}
                  </span>
                  <span className={`flex-1 text-[15px] ${s.done ? "text-muted" : "text-ink"}`}>{s.label}</span>
                  <span className={`text-[13px] ${s.done ? "text-moss" : current ? "font-semibold text-indigo" : "text-muted"}`}>
                    {s.done ? "완료" : current ? "지금" : ""}
                  </span>
                  <PendingChevron size={16} className="text-muted/60" />
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/** 두 결(기본 쪽빛·이끼색, 성별 테마에서는 아이콘의 분홍·하늘)이 단계마다 가까워지다가 끝에서 만난다. 지나온 만큼 색이 찬다 */
export function Strands({ done, total }: { done: number; total: number }) {
  const pct = total ? (done / total) * 100 : 0;
  const knots = Array.from({ length: total }, (_, i) => 34 + (i * 232) / Math.max(1, total - 1));
  const a = "M6 9 C 150 8, 236 18, 302 28";
  const b = "M6 47 C 150 48, 236 38, 302 28";
  return (
    <svg viewBox="0 0 320 56" className="mt-3 h-14 w-full" role="img" aria-label={`${total}단계 중 ${done}단계 완료`}>
      <g fill="none" strokeWidth="2.2" strokeLinecap="round">
        <path d={a} className="stroke-line" />
        <path d={b} className="stroke-line" />
        <path d={a} className="stroke-strand-a" pathLength={100} strokeDasharray={`${pct} 100`} />
        <path d={b} className="stroke-strand-b" pathLength={100} strokeDasharray={`${pct} 100`} />
      </g>
      {knots.map((x, i) => (
        <circle
          key={x}
          cx={x}
          cy={28}
          r={i < done ? 4 : i === done ? 5 : 3.5}
          className={i < done ? "fill-ink" : i === done ? "fill-surface stroke-indigo" : "fill-surface stroke-line"}
          strokeWidth={i === done ? 2.2 : 1.6}
        />
      ))}
      <path
        d="M308 33.5s-6.5-3.9-7.9-7.4c-1-2.5.5-5.1 3.2-5.1 1.6 0 2.7.9 4.7 2.6 2-1.7 3.1-2.6 4.7-2.6 2.7 0 4.2 2.6 3.2 5.1-1.4 3.5-7.9 7.4-7.9 7.4z"
        className={done >= total ? "fill-rose" : "fill-surface stroke-line"}
        strokeWidth={1.6}
        transform="translate(-4 0)"
      />
    </svg>
  );
}

/** 회색 묶음 안내 (부드러운 강조) */
export function Callout({ icon, children, action }: { icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-indigo/5 px-4 py-3.5 ring-1 ring-indigo/15">
      {icon && <span className="mt-0.5 shrink-0 text-indigo">{icon}</span>}
      <div className="min-w-0 flex-1 text-[15px] leading-relaxed text-ink-soft">
        {children}
        {action && <div className="mt-2.5">{action}</div>}
      </div>
    </div>
  );
}
