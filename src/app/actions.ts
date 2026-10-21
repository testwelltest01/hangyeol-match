"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { OBSERVER_ITEMS, STEPS, TEST_VERSION, firstIncompleteStep, sanitizeAnswers, type Answers } from "@/lib/items";
import { computeScores } from "@/lib/scoring";
import { createAdminClient } from "@/lib/supabase/admin";
import { allow, clientIp, TOO_MANY } from "@/lib/security";
import { createClient, getUserId } from "@/lib/supabase/server";

export type FormState = { error: string | null };

const MAX_FRIEND_RATINGS = 30;

/** 만 19세 기준: 청소년보호법처럼 '19세가 되는 해의 1월 1일'부터 허용한다. 1단계에서 본인인증으로 다시 확인한다. */
function isAdultByBirthYear(birthYear: number): boolean {
  return birthYear <= new Date().getFullYear() - 19;
}

export async function saveProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const nickname = String(formData.get("nickname") ?? "").trim();
  const gender = String(formData.get("gender") ?? "");
  const birthYear = Number(formData.get("birthYear"));
  const agreed = formData.get("agreePrivacy") === "on";
  const agreePhotoAi = formData.get("agreePhotoAi") === "on";
  const agreeReligion = formData.get("agreeReligion") === "on";
  const agreeIllustration = formData.get("agreeIllustration") === "on";

  if (nickname.length < 1 || nickname.length > 12) return { error: "닉네임은 1~12자로 정해주세요." };
  if (gender !== "male" && gender !== "female") return { error: "성별을 골라주세요." };
  if (!Number.isInteger(birthYear) || birthYear < 1900) return { error: "출생연도를 확인해주세요." };
  if (!isAdultByBirthYear(birthYear)) return { error: "한결은 만 19세 이상만 이용할 수 있어요." };
  if (!agreed) return { error: "개인정보 수집·이용에 동의해야 검사를 시작할 수 있어요." };
  if (!agreePhotoAi) return { error: "프로필 사진을 AI가 확인하는 데 동의해야 시작할 수 있어요." };
  if (!agreeReligion) return { error: "종교 정보 수집·이용에 동의해야 시작할 수 있어요." };
  if (!agreeIllustration) return { error: "그림 프로필 만들기에 동의해야 시작할 수 있어요." };

  // 브라우저에서 직접 쓰지 못하게 막아두었으므로(0002 보안 강화) 검증을 마친 서버가 쓴다
  const { error } = await createAdminClient().from("profiles").upsert({
    id: userId,
    nickname,
    gender,
    birth_year: birthYear,
    agreed_privacy_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: "저장하지 못했어요. 잠시 후 다시 시도해주세요." };

  // 동의 기록: 사진 AI 확인(국외 이전)·종교(민감정보)·그림 프로필(국외 이전)은 모두 필수
  const admin = createAdminClient();
  const { error: consentError } = await admin.from("consents").upsert([
    { user_id: userId, kind: "photo_overseas" },
    { user_id: userId, kind: "religion" },
  ]);
  if (consentError) return { error: "동의를 저장하지 못했어요. 잠시 후 다시 시도해주세요." };
  // 그림 프로필 동의는 따로 저장한다: 0006 SQL 전에는 이 동의 종류를 저장할 수 없어서 실패해도 넘어간다
  // (그때는 그림 프로필도 준비 단계에 없고, 0006 뒤에 그림 프로필 화면에서 다시 동의받는다)
  await admin.from("consents").upsert({ user_id: userId, kind: "illustration" });

  redirect("/test");
}

/** 검사 한 단계를 저장한다. 마지막 단계까지 끝나면 점수를 계산해 저장한다. */
export async function saveAnswers(partial: Record<string, unknown>): Promise<{ ok: boolean; done: boolean; error?: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, done: false, error: "로그인이 풀렸어요. 다시 로그인해주세요." };

  if (!(await allow(`answers:${userId}`, 120, 3600))) return { ok: false, done: false, error: TOO_MANY };
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("test_answers")
    .select("answers")
    .eq("user_id", userId)
    .maybeSingle();

  // 사용자는 RLS상 자기 응답 행을 직접 고칠 수도 있으므로, 저장돼 있던 값까지 다시 검증한다.
  const { data: profile } = await admin.from("profiles").select("gender").eq("id", userId).maybeSingle();
  const gender = profile?.gender;
  if (gender !== "male" && gender !== "female") return { ok: false, done: false, error: "프로필을 먼저 만들어주세요." };

  const merged: Answers = sanitizeAnswers({ ...((existing?.answers as Record<string, unknown>) ?? {}), ...partial });
  const done = firstIncompleteStep(merged, gender) === STEPS.length;
  const now = new Date().toISOString();

  const { error } = await admin.from("test_answers").upsert({
    user_id: userId,
    version: TEST_VERSION,
    answers: merged,
    completed_at: done ? now : null,
    updated_at: now,
  });
  if (error) return { ok: false, done: false, error: "저장하지 못했어요. 다시 시도해주세요." };

  if (done) {
    const scores = computeScores(merged, gender);
    const { error: scoreError } = await admin
      .from("test_scores")
      .upsert({ user_id: userId, version: TEST_VERSION, scores, computed_at: now });
    if (scoreError) return { ok: false, done: false, error: "결과를 계산하지 못했어요. 다시 시도해주세요." };
  }

  return { ok: true, done };
}

/** 친구 평가 링크용 토큰. 이미 있으면 그대로 쓴다. */
export async function getOrCreateInvite(): Promise<string | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("friend_invites")
    .select("token")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing?.token) return existing.token;

  const token = randomBytes(12).toString("base64url");
  const { error } = await admin.from("friend_invites").insert({ token, user_id: userId });
  return error ? null : token;
}

/** 친구가 남긴 평가를 저장한다. 로그인 없이 링크로 들어온 사람이 쓴다. */
export async function submitFriendRating(token: string, input: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{8,64}$/.test(token) || !input || typeof input !== "object") {
    return { ok: false, error: "링크가 올바르지 않아요." };
  }
  // 로그인 없이 쓰는 기능이라 IP와 링크 단위로 횟수를 제한한다
  const ip = await clientIp();
  if (!(await allow(`friend:ip:${ip}`, 10, 3600)) || !(await allow(`friend:token:${token}`, 20, 86400))) {
    return { ok: false, error: TOO_MANY };
  }
  const admin = createAdminClient();
  const { data: invite } = await admin.from("friend_invites").select("user_id").eq("token", token).maybeSingle();
  if (!invite) return { ok: false, error: "링크가 올바르지 않아요." };

  const answers: Answers = {};
  for (const item of OBSERVER_ITEMS) {
    const v = input[item.id];
    if (!Number.isInteger(v) || (v as number) < 1 || (v as number) > 5) {
      return { ok: false, error: "모든 문항에 답해주세요." };
    }
    answers[item.id] = v as number;
  }

  const { count } = await admin
    .from("friend_ratings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", invite.user_id);
  if ((count ?? 0) >= MAX_FRIEND_RATINGS) return { ok: false, error: "이 링크는 더 이상 평가를 받지 않아요." };

  const { error } = await admin.from("friend_ratings").insert({ user_id: invite.user_id, answers });
  return error ? { ok: false, error: "저장하지 못했어요. 다시 시도해주세요." } : { ok: true };
}

/** 탈퇴: 계정을 지우면 모든 테이블이 auth.users를 cascade로 참조하므로 검사 응답·점수·친구 평가가 함께 지워진다. */
export async function deleteAccount(): Promise<{ ok: boolean; error?: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "로그인이 풀렸어요. 다시 로그인해주세요." };

  const admin = createAdminClient();
  // Storage의 사진 파일은 DB cascade로 지워지지 않으므로 먼저 지운다
  const { data: files } = await admin.storage.from("photos").list(userId, { limit: 1000 });
  if (files?.length) await admin.storage.from("photos").remove(files.map((f) => `${userId}/${f.name}`));
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: "탈퇴하지 못했어요. 잠시 후 다시 시도해주세요." };

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
