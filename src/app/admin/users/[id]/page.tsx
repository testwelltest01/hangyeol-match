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
import { ResolveButton, SuspendButton } from "../../AdminButtons";
import { AdminLoading, AdminShell, Chip, Empty, Panel, TableWrap, td, th } from "../../ui";

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

  const [setup, scoreRow, flag, ratings, reactions, reports, feedback, recsReceived, recsShown] = await Promise.all([
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
  const urls = await signedPhotoUrls(photoRows.map((p) => p.path));

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
    <AdminShell current="users">
      <Link href="/admin/users" className="text-sm text-muted underline underline-offset-4">
        ← 회원 목록
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-serif text-[1.75rem] font-bold leading-tight">{name}</h1>
          <p className="mt-1 break-all text-sm text-muted">
            {user.email} · <span className="font-mono text-xs">{id}</span>
          </p>
          <p className="mt-2 flex flex-wrap gap-1.5">
            <Chip tone={stage === "ready" ? "moss" : "mist"}>{STAGE_LABEL[stage]}</Chip>
            {suspended && <Chip tone="alert">정지</Chip>}
            {setup?.matchProfile?.paused && <Chip>매칭 쉬는 중</Chip>}
          </p>
        </div>
        <SuspendButton userId={id} suspended={suspended} name={name} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="기본 정보" className="lg:col-span-2">
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
                <li key={s.id} className="flex gap-2">
                  <span className={s.done ? "text-moss" : "text-alert"}>{s.done ? "✓" : "✗"}</span>
                  <span>{s.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>아직 프로필을 만들지 않았어요.</Empty>
          )}
        </Panel>

        <Panel title="자기소개·사진" lead="신고 확인용이에요. 저장하거나 밖으로 옮기지 말아주세요.">
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
                    {/* 10분짜리 서명 주소라 next/image 최적화 대신 그대로 보여준다 */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={urls.get(p.path)} alt={`${name}님의 ${p.slot === "face" ? "얼굴" : "전신"} 사진`} className="h-full w-full object-cover" />
                  </div>
                ) : null,
              )}
            </div>
          )}
        </Panel>
      </div>

      <Panel className="mt-4" title={`관심·수락 기록 ${pairs.length}명`}>
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

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title={`신고 ${reportRows.length}건`} lead="받은 신고와 이 회원이 한 신고">
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
        <Panel className="mt-4" title="원점수" lead="화면에 보이지 않는 점수까지 그대로 보여줘요.">
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

      <section className="mt-10">
        <h2 className="text-lg font-semibold">회원이 보는 리포트</h2>
        {scores && setup ? (
          <div className="mt-4 max-w-[600px] rounded-2xl border border-line bg-paper px-5 py-8 sm:px-8">
            <ReportParts
              viewer="admin"
              nickname={setup.nickname}
              report={buildReport(scores)}
              friendBigFive={friends.count >= MIN_FRIEND_RATINGS_TO_SHOW ? friends.bigFive : null}
              friendCount={friends.count}
              minFriendCount={MIN_FRIEND_RATINGS_TO_SHOW}
              inviteToken={null}
            />
          </div>
        ) : (
          <p className="mt-2 text-[15px] text-muted">아직 검사를 마치지 않았어요.</p>
        )}
      </section>
    </AdminShell>
  );
}
