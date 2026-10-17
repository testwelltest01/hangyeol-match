import { kstTime } from "@/lib/admin/data";
import type { Internal, UserView } from "@/lib/photo/score";
import { PHOTO_UPLOADS_PER_DAY } from "@/lib/photo/rules";
import { Chip, Empty, Panel } from "../../ui";

export type PhotoEntry = {
  id: string;
  slot: "face" | "body";
  url: string | null;
  feedback: UserView;
  internal: Internal;
  created_at: string;
  replaced_at: string | null;
  purged_at: string | null;
};

export type AttemptEntry = { slot: string; result: string; created_at: string; detail?: string | null };

const SLOT = { face: "얼굴", body: "전신" } as Record<string, string>;
const SCORE_LABEL: [keyof Internal, string][] = [
  ["mood", "분위기"],
  ["photo_quality", "사진 품질"],
  ["expression_pose", "표정·자세"],
  ["grooming_style", "꾸밈·스타일"],
];

type Item = { kind: "photo"; at: string; photo: PhotoEntry } | { kind: "attempt"; at: string; attempt: AttemptEntry };

function Scores({ internal }: { internal: Internal }) {
  return (
    <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums text-muted">
      {SCORE_LABEL.map(([k, label]) => (
        <span key={k}>
          {label} <strong className="text-ink-soft">{String(internal[k])}</strong>/10
        </span>
      ))}
      <span>
        종합 <strong className="text-ink">{internal.overall}</strong>/100
      </span>
      {internal.heavy_edit_suspected && <span className="font-semibold text-alert">보정 의심</span>}
      <span>{internal.model}</span>
    </p>
  );
}

function PhotoCard({ p }: { p: PhotoEntry }) {
  const fb = p.feedback;
  const status = !p.replaced_at ? (
    <Chip tone="moss">사용 중</Chip>
  ) : p.purged_at ? (
    <Chip>교체됨 · 파일 삭제</Chip>
  ) : (
    <Chip>교체됨 {kstTime(p.replaced_at).slice(5, 10)}</Chip>
  );
  return (
    <div className="flex gap-4">
      <div className="w-24 shrink-0">
        {p.url ? (
          <a href={p.url} target="_blank" rel="noreferrer" className="block aspect-[3/4] overflow-hidden rounded-lg bg-mist">
            {/* 10분짜리 서명 주소라 next/image 최적화 대신 그대로 보여준다 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={`${SLOT[p.slot]} 사진 (${kstTime(p.created_at)})`} className="h-full w-full object-cover" />
          </a>
        ) : (
          <div className="flex aspect-[3/4] items-center justify-center rounded-lg bg-mist px-2 text-center text-xs text-muted">파일 없음</div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2 text-sm">
        <p className="flex flex-wrap items-center gap-1.5">
          <strong>{SLOT[p.slot]}</strong>
          <span className="tabular-nums text-muted">{kstTime(p.created_at)}</span>
          <Chip tone="indigo">등록</Chip>
          {status}
          {fb.suggest_retake && <Chip tone="alert">다시 찍기 권유</Chip>}
        </p>
        {fb.acknowledged_previous && (
          <p>
            <span className="text-muted">이전 피드백 반영 · </span>
            {fb.acknowledged_previous}
          </p>
        )}
        {fb.strength && (
          <p>
            <span className="text-muted">잘된 점 · </span>
            {fb.strength}
          </p>
        )}
        {fb.improvements.length > 0 && (
          <ol className="list-decimal space-y-1 pl-5">
            {fb.improvements.map((i, n) => (
              <li key={n}>
                <strong className="font-semibold">{i.what}</strong>
                {i.how && <span> — {i.how}</span>}
                {i.why && <span className="text-muted"> ({i.why})</span>}
              </li>
            ))}
          </ol>
        )}
        <Scores internal={p.internal} />
      </div>
    </div>
  );
}

function AttemptCard({ a }: { a: AttemptEntry }) {
  const rejected = a.result === "rejected";
  return (
    <div className="text-sm">
      <p className="flex flex-wrap items-center gap-1.5">
        <strong>{SLOT[a.slot] ?? a.slot}</strong>
        <span className="tabular-nums text-muted">{kstTime(a.created_at)}</span>
        <Chip tone={rejected ? "alert" : "mist"}>{rejected ? "등록 거절" : "오류"}</Chip>
      </p>
      <p className="mt-1.5 text-ink-soft">
        {a.detail ?? <span className="text-muted">사유 기록 없음 (0004 SQL 실행 전 시도)</span>}
      </p>
      {rejected && <p className="mt-1 text-xs text-muted">거절된 사진은 저장하지 않아서 이미지가 없어요.</p>}
    </div>
  );
}

export function PhotoHistory({ photos, attempts, todayResults }: { photos: PhotoEntry[]; attempts: AttemptEntry[]; todayResults: string[] }) {
  const failed = attempts.filter((a) => a.result !== "registered");
  const items: Item[] = [
    ...photos.map((p): Item => ({ kind: "photo", at: p.created_at, photo: p })),
    ...failed.map((a): Item => ({ kind: "attempt", at: a.created_at, attempt: a })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));
  const counted = todayResults.filter((r) => r === "registered" || r === "rejected").length;

  return (
    <Panel
      className="mt-4"
      title={`사진 업로드 기록 ${photos.length + failed.length}건`}
      lead="올릴 때마다 받은 AI 피드백과 내부 점수예요. 내부 점수는 회원에게 보이지 않고 추천에도 쓰지 않아요. 교체한 사진 파일은 30일 뒤 지워져요. 사진은 신고 확인용으로만 보고 저장하지 말아주세요."
    >
      <p className="mb-4 flex flex-wrap gap-1.5">
        <Chip tone="indigo">등록 {photos.length}</Chip>
        <Chip tone="alert">거절 {failed.filter((a) => a.result === "rejected").length}</Chip>
        <Chip>오류 {failed.filter((a) => a.result !== "rejected").length}</Chip>
        <Chip tone="moss">
          오늘 {counted}/{PHOTO_UPLOADS_PER_DAY}번 사용
        </Chip>
      </p>
      {items.length === 0 ? (
        <Empty>아직 사진을 올린 적이 없어요.</Empty>
      ) : (
        <ul className="divide-y divide-line/70">
          {items.map((it) => (
            <li key={it.kind === "photo" ? it.photo.id : `${it.at}-${it.attempt.slot}`} className="py-4 first:pt-0">
              {it.kind === "photo" ? <PhotoCard p={it.photo} /> : <AttemptCard a={it.attempt} />}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
