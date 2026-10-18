import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { ReportParts } from "@/app/report/ReportBody";
import { requireAdmin } from "@/lib/admin/auth";
import { kstTime, memberName, OUTCOME_LABEL, REPORT_REASON_LABEL, type ReportRow } from "@/lib/admin/data";
import { STAGE_LABEL, userStage } from "@/lib/admin/stats";
import { DOMAINS, TRAITS, type Answers } from "@/lib/items";
import { loadMySetup, setupSteps, signedPhotoUrls } from "@/lib/match/me";
import { MIN_FRIEND_RATINGS_TO_SHOW } from "@/lib/match/rules";
import { regionLabel } from "@/lib/regions";
import { buildReport } from "@/lib/report";
import { aggregateFriendRatings, type Scores } from "@/lib/scoring";
import { UUID_RE } from "@/lib/sniff";
import { createAdminClient } from "@/lib/supabase/admin";
import { myChatRooms } from "@/lib/chat/server";
import { extraCards } from "@/lib/extra/cards";
import { loadExtraResults } from "@/lib/extra/server";
import { EXTRA_TESTS } from "@/lib/extra/tests";
import { ResolveButton, SuspendButton } from "../../AdminButtons";
import { PhotoHistory, type AttemptEntry, type PhotoEntry } from "./PhotoHistory";
import { Avatar } from "@/components/app-ui";
import { IconCheck } from "@/components/icons";
import { AdminLoading, AdminShell, Chip, Empty, JumpLinks, Panel, TableWrap, td, th } from "../../ui";
import { ZoomImage } from "@/components/ZoomImage";

export const metadata: Metadata = { title: "회원 상세 | 한결 관리", robots: { index: false, follow: false } };

export default function MemberPage({ params }: PageProps<"/admin/users/[id]">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <MemberGate params={params} />
    </Suspense>
  );
}

const GENDER = { male: "남자", female: "여자" } as const;

function Info({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-sm sm:grid-cols-[7rem_1fr_7rem_1fr]">
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="min-w-0 break-words">{v === null || v === "" || v === undefined ? <span className="text-muted">–</span> : v}</dd>
        </div>
      ))}
    </dl>
  );
}

type Reaction = { from_user: string; to_user: string; interest: boolean; accept: boolean | null; interest_at: string; accept_at: string | null };

function relationLabel(mine: Reaction | undefined, theirs: Reaction | undefined): string {
  if (mine?.accept === true && theirs?.accept === true) return "연결";
  if (mine?.accept === false || theirs?.accept === false) return "사진 공개 후 거절";
  if (mine?.interest && theirs?.interest) return "서로 관심";
  if (mine && !mine.interest) return "회원이 넘김";
  if (theirs && !theirs.interest) return "상대가 넘김";
  if (mine?.interest) return "회원이 관심 보냄";
  if (theirs?.interest) return "상대가 관심 보냄";
  return "";
}

const answerLabel = (r: Reaction | undefined) => {
  if (!r) return "–";
  const interest = r.interest ? "관심" : "넘김";
  if (r.accept === null) return interest;
  return `${interest} → ${r.accept ? "수락" : "거절"}`;
};

async function MemberGate({ params }: { params: PageProps<"/admin/users/[id]">["params"] }) {
  await requireAdmin();
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const admin = createAdminClient();

  const { data: authData } = await admin.auth.admin.getUserById(id);
  const user = authData?.user;
  if (!user) notFound();

  const [setup, scoreRow, flag, ratings, reactions, reports, feedback, recsReceived, recsShown, allPhotos, attempts, extra, chats, illus] = await Promise.all([
    loadMySetup(id),
    admin.from("test_scores").select("scores, version, computed_at").eq("user_id", id).maybeSingle(),
    admin.from("user_flags").select("suspended_at, reason").eq("user_id", id).maybeSingle(),
    admin.from("friend_ratings").select("answers, created_at").eq("user_id", id).order("created_at"),
    admin
      .from("reactions")
      .select("from_user, to_user, interest, accept, interest_at, accept_at")
      .or(`from_user.eq.${id},to_user.eq.${id}`),
    admin
      .from("reports")
      .select("id, reporter, target, reason, detail, created_at, resolved_at")
      .or(`target.eq.${id},reporter.eq.${id}`)
      .order("created_at", { ascending: false }),
    admin.from("meeting_feedback").select("outcome, photo_match, cleanliness, manners, again").eq("to_user", id),
    admin.from("recommendations").select("target_id", { count: "exact", head: true }).eq("user_id", id),
    admin.from("recommendations").select("user_id", { count: "exact", head: true }).eq("target_id", id),
    admin
      .from("photos")
      .select("id, slot, path, feedback, internal, created_at, replaced_at, purged_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
    // 사유 칸(detail)은 0004 SQL 뒤에 생기므로 * 로 읽는다
    admin.from("photo_attempts").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(300),
    loadExtraResults(admin, id),
    myChatRooms(admin, id),
    admin
      .from("illustrations")
      .select("id, status, path, model, prompt_version, features, error, shown, created_at, completed_at, deleted_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  // 관계·신고에 나오는 다른 사람의 닉네임
  const rx = (reactions.data ?? []) as Reaction[];
  const reportRows = (reports.data ?? []) as ReportRow[];
  const otherIds = [
    ...new Set([
      ...rx.map((r) => (r.from_user === id ? r.to_user : r.from_user)),
      ...reportRows.flatMap((r) => [r.reporter, r.target]).filter((x): x is string => Boolean(x) && x !== id),
    ]),
  ];
  const { data: others } = otherIds.length
    ? await admin.from("profiles").select("id, nickname").in("id", otherIds)
    : { data: [] as { id: string; nickname: string }[] };
  const nameOf = new Map((others ?? []).map((o) => [o.id, o.nickname as string]));
  const otherName = (uid: string | null) => (uid ? (nameOf.get(uid) ?? "탈퇴한 회원") : "탈퇴한 회원");

  const name = memberName({ id, nickname: setup?.nickname ?? null, email: user.email ?? null });
  const scores = scoreRow.data?.scores as Scores | undefined;
  const friendAnswers = (ratings.data ?? []).map((r) => r.answers as Answers);
  const friends = aggregateFriendRatings(friendAnswers);
  const suspended = Boolean(flag.data?.suspended_at);
  const stage = userStage({
    hasProfile: Boolean(setup),
    hasScores: Boolean(scores),
    friendCount: setup?.friendCount ?? 0,
    hasMatchProfile: Boolean(setup?.matchProfile),
    photoCount: setup ? Number(Boolean(setup.photos.face)) + Number(Boolean(setup.photos.body)) : 0,
    hasContact: Boolean(setup?.contact),
  });

  const photoRows = setup ? [setup.photos.face, setup.photos.body].filter((p) => p !== null) : [];
  const photoHistory = (allPhotos.data ?? []) as (Omit<PhotoEntry, "url"> & { path: string })[];
  // 지금 사진과, 아직 파일이 남아 있는 교체된 사진의 서명 주소를 한 번에 만든다
  const urls = await signedPhotoUrls([...new Set([...photoRows.map((p) => p.path), ...photoHistory.filter((p) => !p.purged_at).map((p) => p.path)])]);
  const attemptRows = (attempts.data ?? []) as AttemptEntry[];
  const illusRows = (illus.data ?? []) as {
    id: string;
    status: string;
    path: string | null;
    model: string;
    prompt_version: string;
    features: Record<string, unknown>;
    error: string | null;
    shown: boolean;
    created_at: string;
    deleted_at: string | null;
  }[];
  const illusUrls = await signedPhotoUrls(illusRows.flatMap((r) => (r.path && !r.deleted_at ? [r.path] : [])));

  const pairs = otherIds
    .filter((o) => rx.some((r) => r.from_user === o || r.to_user === o))
    .map((o) => {
      const mine = rx.find((r) => r.from_user === id && r.to_user === o);
      const theirs = rx.find((r) => r.from_user === o && r.to_user === id);
      const last = [mine?.interest_at, mine?.accept_at, theirs?.interest_at, theirs?.accept_at].filter(Boolean).sort().at(-1) ?? "";
      return { other: o, mine, theirs, last };
    })
    .sort((a, b) => (a.last < b.last ? 1 : -1));

  const fb = feedback.data ?? [];
  const avg = (k: "photo_match" | "cleanliness" | "manners" | "again") => {
    const vals = fb.map((f) => f[k]).filter((v): v is number => typeof v === "number");
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "–";
  };

  return (
    <AdminShell current="users" back={{ href: "/admin/users", label: "회원 목록" }}>
      <section className="rounded-[20px] bg-surface px-5 py-5 ring-1 ring-line/80">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={name} size={56} />
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-[1.6rem] font-bold leading-tight">{name}</h1>
            <p className="mt-0.5 break-all text-sm text-muted">
              {user.email} <span className="font-mono text-xs">{id}</span>
            </p>
            <p className="mt-2 flex flex-wrap gap-1.5">
              <Chip tone={stage === "ready" ? "moss" : "mist"}>{STAGE_LABEL[stage]}</Chip>
              {suspended && <Chip tone="alert">정지</Chip>}
              {setup?.matchProfile?.paused && <Chip>매칭 쉬는 중</Chip>}
            </p>
          </div>
          <SuspendButton userId={id} suspended={suspended} name={name} />
        </div>
      </section>

      <JumpLinks
        links={[
          { href: "#info", label: "기본 정보" },
          { href: "#photos", label: "사진" },
          { href: "#pairs", label: "관심·수락" },
          { href: "#chats", label: "대화방" },
          { href: "#reports", label: "신고·피드백" },
          { href: "#scores", label: "원점수" },
          { href: "#report", label: "리포트" },
        ]}
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel id="info" title="기본 정보" className="lg:col-span-2">
          <Info
            items={[
              ["성별", setup ? GENDER[setup.gender] : null],
              ["출생연도", setup?.birthYear],
              ["가입", kstTime(user.created_at)],
              ["최근 로그인", kstTime(user.last_sign_in_at)],
              ["지역", setup?.matchProfile ? regionLabel(setup.matchProfile.region) : null],
              ["키", setup?.matchProfile ? `${setup.matchProfile.height}cm` : null],
              ["검사", scoreRow.data ? `${kstTime(scoreRow.data.computed_at)} (${scoreRow.data.version})` : null],
              ["연락처", setup?.contact ? [setup.contact.instagram && "인스타그램", setup.contact.kakao && "카카오톡"].filter(Boolean).join(", ") + " 등록" : null],
              ["추천받음", `${recsReceived.count ?? 0}번`],
              ["추천됨", `${recsShown.count ?? 0}번`],
              ["정지 사유", suspended ? `${flag.data?.reason ?? ""} (${kstTime(flag.data?.suspended_at)})` : null],
            ]}
          />
        </Panel>

        <Panel title="매칭 준비">
          {setup ? (
            <ul className="space-y-1.5 text-sm">
              {setupSteps(setup).map((s) => (
                <li key={s.id} className="flex items-center gap-2.5">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${s.done ? "bg-moss text-white" : "bg-mist text-muted"}`}
                  >
                    {s.done ? <IconCheck size={12} strong /> : "–"}
                  </span>
                  <span className={s.done ? "" : "text-muted"}>{s.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>아직 프로필을 만들지 않았어요.</Empty>
          )}
        </Panel>

        <Panel id="photos" title="자기소개·사진" lead="신고 확인용이에요. 저장하거나 밖으로 옮기지 말아주세요.">
          {setup?.matchProfile?.intro ? (
            <p className="whitespace-pre-line text-sm leading-relaxed">{setup.matchProfile.intro}</p>
          ) : (
            <Empty>자기소개가 없어요.</Empty>
          )}
          {photoRows.length > 0 && (
            <div className="mt-4 grid max-w-xs grid-cols-2 gap-2">
              {photoRows.map((p) =>
                urls.get(p.path) ? (
                  <div key={p.id} className="aspect-[3/4] overflow-hidden rounded-xl bg-mist">
                    <ZoomImage src={urls.get(p.path)!} alt={`${name}님의 ${p.slot === "face" ? "얼굴" : "전신"} 사진`} />
                  </div>
                ) : null,
              )}
            </div>
          )}
        </Panel>
      </div>

      <PhotoHistory
        photos={photoHistory.map(({ path, ...p }) => ({ ...p, url: p.purged_at ? null : (urls.get(path) ?? null) }))}
        attempts={attemptRows}
      />

      {!illus.error && (
        <Panel className="mt-4" title={`그림 프로필 ${illusRows.length}건`} lead="회원이 만든 AI 그림과 그림에 쓴 정보예요. 추천 카드에는 회원이 '보여주기'를 켠 그림만 보여요.">
          {illusRows.length === 0 ? (
            <Empty>아직 그림을 만들지 않았어요.</Empty>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {illusRows.map((r) => {
                const url = r.path && !r.deleted_at ? illusUrls.get(r.path) : undefined;
                return (
                  <li key={r.id} className="text-sm">
                    <div className="flex aspect-[2/3] items-center justify-center overflow-hidden rounded-xl bg-mist text-muted">
                      {url ? (
                        <ZoomImage src={url} alt="AI 그림 프로필" />
                      ) : (
                        <span>{r.status === "pending" ? "그리는 중" : r.status === "failed" ? "실패" : "지움"}</span>
                      )}
                    </div>
                    <p className="mt-2 flex flex-wrap gap-1.5">
                      {r.shown && !r.deleted_at && <Chip tone="moss">추천 카드에 보이는 중</Chip>}
                      {r.deleted_at && <Chip>지움</Chip>}
                      {r.status === "failed" && <Chip tone="alert">실패</Chip>}
                    </p>
                    <p className="mt-1 tabular-nums text-muted">
                      {kstTime(r.created_at)} · {r.model} · {r.prompt_version}
                    </p>
                    {r.error && <p className="mt-1 text-alert">{r.error}</p>}
                    <details className="mt-1">
                      <summary className="cursor-pointer text-muted">그림에 쓴 정보</summary>
                      <pre className="mt-1 whitespace-pre-wrap break-words rounded-lg bg-paper p-2 text-xs">{JSON.stringify(r.features, null, 2)}</pre>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      )}

      <Panel id="pairs" className="mt-4" title={`관심·수락 기록 ${pairs.length}명`}>
        {pairs.length === 0 ? (
          <Empty>아직 주고받은 관심이 없어요.</Empty>
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <th className={th}>상대</th>
                <th className={th}>회원이 보낸 답</th>
                <th className={th}>상대가 보낸 답</th>
                <th className={th}>상태</th>
                <th className={th}>마지막</th>
              </tr>
            </thead>
            <tbody>
              {pairs.map((p) => (
                <tr key={p.other}>
                  <td className={td}>
                    <Link href={`/admin/users/${p.other}`} className="font-semibold underline underline-offset-4">
                      {otherName(p.other)}
                    </Link>
                  </td>
                  <td className={td}>{answerLabel(p.mine)}</td>
                  <td className={td}>{answerLabel(p.theirs)}</td>
                  <td className={td}>{relationLabel(p.mine, p.theirs)}</td>
                  <td className={`${td} whitespace-nowrap tabular-nums text-muted`}>{kstTime(p.last)}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>

      {chats.available && (
        <Panel id="chats" className="mt-4" title={`대화방 ${chats.rooms.length}개`} lead="내용은 두 사람 사이에 신고가 있을 때만 열 수 있어요.">
          {chats.rooms.length === 0 ? (
            <Empty>아직 대화방이 없어요.</Empty>
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th className={th}>상대</th>
                  <th className={th}>열린 시각</th>
                  <th className={`${th} text-right`}>메시지 (회원/상대)</th>
                  <th className={th}>연락처</th>
                  <th className={th}>마지막 메시지</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {chats.rooms
                  .sort((a, b) => ((a.last_message_at ?? a.opened_at) < (b.last_message_at ?? b.opened_at) ? 1 : -1))
                  .map((r) => {
                    const isA = r.user_a === id;
                    const other = isA ? r.user_b : r.user_a;
                    const mineAt = isA ? r.contact_a_at : r.contact_b_at;
                    const theirsAt = isA ? r.contact_b_at : r.contact_a_at;
                    return (
                      <tr key={r.id}>
                        <td className={td}>
                          <Link href={`/admin/users/${other}`} className="font-semibold underline underline-offset-4">
                            {otherName(other)}
                          </Link>
                          {r.closed_at && <span className="ml-1.5"><Chip tone="alert">닫힘</Chip></span>}
                        </td>
                        <td className={`${td} whitespace-nowrap`}>{kstTime(r.opened_at)}</td>
                        <td className={`${td} text-right`}>
                          {isA ? r.count_a : r.count_b}/{isA ? r.count_b : r.count_a}
                        </td>
                        <td className={`${td} whitespace-nowrap`}>
                          {r.exchanged_at ? "교환됨" : mineAt ? "회원이 누름" : theirsAt ? "상대가 누름" : "–"}
                        </td>
                        <td className={`${td} whitespace-nowrap text-muted`}>{kstTime(r.last_message_at)}</td>
                        <td className={td}>
                          <Link href={`/admin/chats/${r.id}`} className="text-sm underline underline-offset-4">
                            보기
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </TableWrap>
          )}
        </Panel>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel id="reports" title={`신고 ${reportRows.length}건`} lead="받은 신고와 이 회원이 한 신고">
          {reportRows.length === 0 ? (
            <Empty>신고 기록이 없어요.</Empty>
          ) : (
            <ul className="divide-y divide-line/70">
              {reportRows.map((r) => {
                const received = r.target === id;
                return (
                  <li key={r.id} className="py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <Chip tone={received ? "alert" : "mist"}>{received ? "받은 신고" : "한 신고"}</Chip>
                        <strong>{REPORT_REASON_LABEL[r.reason] ?? r.reason}</strong>
                        <span className="text-muted">
                          {received ? "신고한 사람" : "대상"}{" "}
                          <Link href={`/admin/users/${received ? r.reporter : r.target}`} className="underline underline-offset-4">
                            {otherName(received ? r.reporter : r.target)}
                          </Link>
                        </span>
                      </span>
                      {r.resolved_at ? <span className="text-muted">확인 완료</span> : <ResolveButton reportId={r.id} />}
                    </div>
                    {r.detail && <p className="mt-1.5 whitespace-pre-line text-ink-soft">{r.detail}</p>}
                    <p className="mt-1 text-xs tabular-nums text-muted">{kstTime(r.created_at)}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title={`받은 만남 피드백 ${fb.length}건`} lead="상대에게 보이지 않는 답 (1~5점 평균)">
          {fb.length === 0 ? (
            <Empty>받은 피드백이 없어요.</Empty>
          ) : (
            <Info
              items={[
                ...Object.entries(OUTCOME_LABEL).map(([k, label]): [string, ReactNode] => [label, `${fb.filter((f) => f.outcome === k).length}건`]),
                ["사진과 비슷함", avg("photo_match")],
                ["깔끔함", avg("cleanliness")],
                ["매너", avg("manners")],
                ["다시 만나고 싶음", avg("again")],
              ]}
            />
          )}
        </Panel>
      </div>

      {scores && (
        <Panel id="scores" className="mt-4" title="원점수" lead="화면에 보이지 않는 점수까지 그대로 보여줘요.">
          <div className="grid gap-6 lg:grid-cols-3">
            <div>
              <h3 className="text-sm font-semibold text-muted">성격 5요인 (1~5)</h3>
              <TableWrap wide={false}>
                <thead>
                  <tr>
                    <th className={th}>특성</th>
                    <th className={`${th} text-right`}>본인</th>
                    <th className={`${th} text-right`}>친구 평균 ({friends.count}명)</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {TRAITS.map((t) => (
                    <tr key={t.id}>
                      <td className={td}>{t.label}</td>
                      <td className={`${td} text-right`}>{scores.bigFive[t.id]?.toFixed(2)}</td>
                      <td className={`${td} text-right`}>{friends.count ? friends.bigFive[t.id]?.toFixed(2) : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted">영역 중요도 (1~4)</h3>
              <ul className="mt-2 space-y-1 text-sm tabular-nums">
                {DOMAINS.map((d) => (
                  <li key={d.id} className="flex justify-between border-b border-line/70 py-1.5">
                    <span>{d.label}</span>
                    <span>{scores.values.importance[d.id]}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted">위생·꾸밈</h3>
              <ul className="mt-2 space-y-1 text-sm tabular-nums">
                <li className="flex justify-between border-b border-line/70 py-1.5">
                  <span>위생 (0~18)</span>
                  <span>{scores.hygiene}</span>
                </li>
                <li className="flex justify-between border-b border-line/70 py-1.5">
                  <span>본인 꾸밈 (1~4)</span>
                  <span>{scores.grooming.self?.toFixed(2)}</span>
                </li>
                <li className="flex justify-between border-b border-line/70 py-1.5">
                  <span>원하는 꾸밈 (1~4)</span>
                  <span>{scores.grooming.preferred ?? "상관없음"}</span>
                </li>
                <li className="flex justify-between border-b border-line/70 py-1.5">
                  <span>꾸밈 중요도 (1~4)</span>
                  <span>{scores.grooming.importance}</span>
                </li>
              </ul>
            </div>
          </div>
        </Panel>
      )}

      {extra.available && (
        <Panel className="mt-4" title="추가 검사 점수" lead="한결 시범 검사의 하위척도 평균 (1~5). 추천에는 쓰지 않아요.">
          <div className="grid gap-6 lg:grid-cols-3">
            {EXTRA_TESTS.map((t) => {
              const r = extra.rows[t.id];
              return (
                <div key={t.id}>
                  <h3 className="text-sm font-semibold text-muted">{t.title}</h3>
                  {r ? (
                    <>
                      <ul className="mt-2 space-y-1 text-sm tabular-nums">
                        {t.scales.map((sc) => (
                          <li key={sc.id} className="flex justify-between gap-3 border-b border-line/70 py-1.5">
                            <span>
                              {sc.group === "want" ? "받고 싶은 위로 · " : sc.group === "give" ? "주는 위로 · " : ""}
                              {sc.label}
                            </span>
                            <span>{r.scores.scales[sc.id]?.toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-xs text-muted">
                        {kstTime(r.completed_at)} · {r.version} · {r.share ? "상대에게 보여줌" : "나만 봄"}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-muted">아직 안 했어요.</p>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      <section id="report" className="mt-10 scroll-mt-20">
        <h2 className="text-[16px] font-semibold">회원이 보는 리포트</h2>
        {scores && setup ? (
          <div className="mt-4 max-w-[600px] rounded-[20px] bg-paper px-5 py-8 ring-1 ring-line/80 sm:px-8">
            <ReportParts
              viewer="admin"
              nickname={setup.nickname}
              report={buildReport(scores)}
              friendBigFive={friends.count >= MIN_FRIEND_RATINGS_TO_SHOW ? friends.bigFive : null}
              friendCount={friends.count}
              minFriendCount={MIN_FRIEND_RATINGS_TO_SHOW}
              inviteToken={null}
              extras={extra.available ? extraCards(extra.rows) : null}
            />
          </div>
        ) : (
          <p className="mt-2 text-[15px] text-muted">아직 검사를 마치지 않았어요.</p>
        )}
      </section>
    </AdminShell>
  );
}
