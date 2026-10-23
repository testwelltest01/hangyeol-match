"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { normalizeInstagram, normalizeKakao } from "@/lib/contact";
import { encryptText } from "@/lib/crypto";
import { kstYear } from "@/lib/day";
import {
  checkIntro,
  defaultFilters,
  isReligion,
  MAX_HEIGHT,
  MIN_HEIGHT,
  sanitizeFilters,
  type Filters,
  type MatchPerson,
} from "@/lib/match/filters";
import { startAutoIllustration } from "@/lib/illustration/server";
import { syncIgVerification } from "@/lib/instagram/server";
import { loadMySetup, nextSetupPath } from "@/lib/match/me";
import { countMutualMatches, loadPool } from "@/lib/match/server";
import { analyzePhoto, type Improvement, type PhotoSlot, type UserView } from "@/lib/photo/feedback";
import { COUNTED_RESULTS, PHOTO_UPLOADS_PER_ACCOUNT, remainingUploads } from "@/lib/photo/rules";
import { isRegionKey } from "@/lib/regions";
import { allow, sniffImage, TOO_MANY } from "@/lib/security";
import type { Scores } from "@/lib/scoring";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";

export type FormState = { error: string | null; saved?: boolean };

async function requireUser(): Promise<string> {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  return userId;
}

// ---------------------------------------------------------------------------
// 내 정보 (지역, 키, 자기소개, 종교)
// ---------------------------------------------------------------------------

export async function saveMatchProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUser();
  if (!(await allow(`profile:${userId}`, 60, 3600))) return { error: TOO_MANY };
  const setup = await loadMySetup(userId);
  if (!setup) redirect("/start");

  const region = String(formData.get("region") ?? "");
  const height = Number(formData.get("height"));
  const intro = String(formData.get("intro") ?? "").trim();
  const religion = String(formData.get("religion") ?? "");

  if (!isRegionKey(region)) return { error: "사는 지역을 골라주세요." };
  if (!Number.isInteger(height) || height < MIN_HEIGHT || height > MAX_HEIGHT) return { error: "키를 확인해주세요." };
  if (intro.length < 10) return { error: "자기소개를 10자 이상 써주세요." };
  const introError = checkIntro(intro);
  if (introError) return { error: introError };

  // 종교는 필수 (민감정보 동의는 처음 정보 입력에서 받는다)
  if (!isReligion(religion)) return { error: "종교를 골라주세요." };
  if (!setup.consents.religion) return { error: "종교 정보 동의 기록이 없어요. 운영자에게 알려주세요." };

  const admin = createAdminClient();

  const isNew = !setup.matchProfile;
  const filters: Filters = setup.matchProfile?.filters ?? defaultFilters({ birthYear: setup.birthYear, region }, kstYear());

  const { error } = await admin.from("match_profiles").upsert({
    user_id: userId,
    region,
    height,
    intro,
    religion,
    filters,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: "저장하지 못했어요. 다시 시도해주세요." };

  // 사진을 먼저 올렸다면 이때 조건이 갖춰진다: 그림 프로필 자동 만들기
  await startAutoIllustration(userId);
  if (isNew) redirect("/me/filters?first=1");
  return { error: null, saved: true };
}

// ---------------------------------------------------------------------------
// 원하는 상대 조건
// ---------------------------------------------------------------------------

async function currentMe(userId: string): Promise<{ me: MatchPerson; next: string } | null> {
  const setup = await loadMySetup(userId);
  if (!setup?.matchProfile) return null;
  const admin = createAdminClient();
  const { data: scoreRow } = await admin.from("test_scores").select("scores").eq("user_id", userId).maybeSingle();
  if (!scoreRow) return null;
  const s = scoreRow.scores as Scores;
  return {
    me: {
      id: userId,
      gender: setup.gender,
      birthYear: setup.birthYear,
      region: setup.matchProfile.region,
      height: setup.matchProfile.height,
      religion: setup.matchProfile.religion,
      smoking: s.dealbreakers.smoking,
      drinking: s.dealbreakers.drinking,
      marriage: s.dealbreakers.marriage,
      children: s.dealbreakers.children,
      filters: setup.matchProfile.filters,
    },
    next: nextSetupPath(setup, "filters"),
  };
}

/** 조건을 바꿀 때마다 "지금 조건에 맞는 사람 n명"을 다시 센다 */
export async function countMatches(draft: unknown): Promise<{ count: number } | { error: string }> {
  const userId = await getUserId();
  if (!userId) return { error: "로그인이 풀렸어요." };
  // 전체 후보를 읽는 무거운 계산이라 횟수를 제한한다
  if (!(await allow(`count:${userId}`, 40, 60))) return { error: TOO_MANY };
  const current = await currentMe(userId);
  if (!current) return { error: "내 정보를 먼저 입력해주세요." };
  const filters = sanitizeFilters(draft);
  if ("error" in filters) return { error: filters.error };
  const pool = await loadPool(createAdminClient());
  return { count: countMutualMatches({ ...current.me, filters }, pool) };
}

export async function saveFilters(draft: unknown): Promise<{ ok: true; next: string } | { ok: false; error: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "로그인이 풀렸어요. 다시 로그인해주세요." };
  if (!(await allow(`filters:${userId}`, 60, 3600))) return { ok: false, error: TOO_MANY };
  const current = await currentMe(userId);
  if (!current) return { ok: false, error: "내 정보를 먼저 입력해주세요." };
  const filters = sanitizeFilters(draft);
  if ("error" in filters) return { ok: false, error: filters.error };

  const { error } = await createAdminClient()
    .from("match_profiles")
    .update({ filters, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) return { ok: false, error: "저장하지 못했어요. 다시 시도해주세요." };
  return { ok: true, next: current.next };
}

// ---------------------------------------------------------------------------
// 연락처
// ---------------------------------------------------------------------------

export async function saveContact(_prev: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUser();
  if (!(await allow(`contact:${userId}`, 30, 3600))) return { error: TOO_MANY };
  const instagram = normalizeInstagram(String(formData.get("instagram") ?? ""));
  const kakao = normalizeKakao(String(formData.get("kakao") ?? ""));
  if (instagram === null) return { error: "인스타그램 아이디를 확인해주세요. 영문, 숫자, 마침표, 밑줄만 쓸 수 있어요." };
  if (kakao === null) return { error: "카카오톡 ID를 확인해주세요. 영문, 숫자, 마침표, 밑줄, 하이픈 4~20자예요." };
  if (!instagram && !kakao) return { error: "인스타그램과 카카오톡 중 하나 이상 입력해주세요." };

  let row: { user_id: string; instagram: string | null; kakao: string | null; updated_at: string };
  try {
    row = {
      user_id: userId,
      instagram: instagram ? encryptText(instagram) : null,
      kakao: kakao ? encryptText(kakao) : null,
      updated_at: new Date().toISOString(),
    };
  } catch (e) {
    console.error(e);
    return { error: "서버 설정 문제로 저장하지 못했어요. 운영자에게 알려주세요." };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("contacts").upsert(row);
  if (error) return { error: "저장하지 못했어요. 다시 시도해주세요." };
  // 인스타 아이디를 확인한 아이디와 다르게 바꾸거나 지우면 '인스타 확인됨'을 푼다
  await syncIgVerification(admin, userId, instagram);

  const setup = await loadMySetup(userId);
  redirect(setup ? nextSetupPath(setup, "contact") : "/match");
}

// ---------------------------------------------------------------------------
// 사진
// ---------------------------------------------------------------------------

const MAX_BYTES = 3 * 1024 * 1024;
const MIME_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export type UploadResult =
  | { ok: true; feedback: UserView }
  | { ok: false; error: string; rejected?: boolean };

export async function uploadPhoto(formData: FormData): Promise<UploadResult> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "로그인이 풀렸어요. 다시 로그인해주세요." };
  if (!(formData instanceof FormData)) return { ok: false, error: "잘못된 요청이에요." };
  if (!(await allow(`photo:${userId}`, 30, 3600))) return { ok: false, error: TOO_MANY };

  const slot = String(formData.get("slot") ?? "") as PhotoSlot;
  if (slot !== "face" && slot !== "body") return { ok: false, error: "사진 종류가 올바르지 않아요." };
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "사진을 골라주세요." };
  if (!MIME_EXT[file.type]) return { ok: false, error: "JPG, PNG, WEBP 사진만 올릴 수 있어요." };
  if (file.size > MAX_BYTES) return { ok: false, error: "사진이 너무 커요. 다시 찍어주세요." };

  const setup = await loadMySetup(userId);
  if (!setup) return { ok: false, error: "프로필을 먼저 만들어주세요." };

  const admin = createAdminClient();

  // 사진을 OpenAI로 보내는 동의(국외 이전)는 처음 정보 입력에서 받는다
  if (!setup.consents.photoOverseas) return { ok: false, error: "사진 AI 확인 동의 기록이 없어요. 운영자에게 알려주세요." };

  // 계정당 20번 제한 (평생, 얼굴·전신 합산, 거절된 사진 포함)
  const { data: attempts } = await admin
    .from("photo_attempts")
    .select("result")
    .eq("user_id", userId)
    .in("result", [...COUNTED_RESULTS]);
  if (remainingUploads((attempts ?? []).map((a) => a.result)) === 0) {
    return { ok: false, error: `사진은 계정당 ${PHOTO_UPLOADS_PER_ACCOUNT}번까지 올릴 수 있어요. 지금 등록된 사진은 그대로 쓸 수 있어요.` };
  }

  const image = Buffer.from(await file.arrayBuffer());
  // 확장자나 file.type은 바꿀 수 있으니 실제 파일 내용으로 형식을 확인한다
  const mimeType = sniffImage(image);
  if (!mimeType) return { ok: false, error: "사진 파일이 아니에요. 다시 찍어주세요." };
  const current = setup.photos[slot];
  const previous: Improvement[] = current?.feedback?.improvements ?? [];
  const result = await analyzePhoto({ image, mimeType, slot, gender: setup.gender, previous });

  // 시도 기록은 계정당 20번 제한에 쓰인다. 거절 사유·오류 내용은 관리자 회원 상세에서 본다
  const logAttempt = async (r: string, detail?: string) => {
    await admin.from("photo_attempts").insert({ user_id: userId, slot, result: r, detail: detail?.slice(0, 500) ?? null });
  };

  if (!result.ok) {
    await logAttempt("error", result.error);
    return { ok: false, error: `${result.error} 피드백 없이는 등록되지 않아요.` };
  }
  if (!result.valid) {
    await logAttempt("rejected", result.rejectReason);
    return { ok: false, rejected: true, error: result.rejectReason };
  }

  const path = `${userId}/${slot}-${randomUUID()}.${MIME_EXT[mimeType]}`;
  const { error: uploadError } = await admin.storage.from("photos").upload(path, image, { contentType: mimeType });
  if (uploadError) {
    await logAttempt("error", "사진 파일 저장 실패");
    return { ok: false, error: "사진을 저장하지 못했어요. 다시 시도해주세요." };
  }

  const now = new Date().toISOString();
  if (current) await admin.from("photos").update({ replaced_at: now }).eq("id", current.id);
  const { error: insertError } = await admin
    .from("photos")
    .insert({ user_id: userId, slot, path, feedback: result.userView, internal: result.internal, created_at: now });
  if (insertError) {
    // 되돌리기: 이전 사진을 다시 쓰고, 방금 올린 파일은 지운다
    if (current) await admin.from("photos").update({ replaced_at: null }).eq("id", current.id);
    await admin.storage.from("photos").remove([path]);
    await logAttempt("error", "사진 정보 저장 실패");
    return { ok: false, error: "사진을 저장하지 못했어요. 다시 시도해주세요." };
  }
  await logAttempt("registered");
  // 사진 2장이 갖춰지면 그림 프로필을 자동으로 그린다 (아직 다 그린 그림이 없을 때. 사진을 바꿔도 이미 있는 그림은 그대로)
  if (setup.photos[slot === "face" ? "body" : "face"]) await startAutoIllustration(userId);
  return { ok: true, feedback: result.userView };
}

// ---------------------------------------------------------------------------
// 매칭 쉬기
// ---------------------------------------------------------------------------

export async function setPaused(paused: boolean): Promise<{ ok: boolean }> {
  const userId = await getUserId();
  if (!userId || typeof paused !== "boolean") return { ok: false };
  const { error } = await createAdminClient()
    .from("match_profiles")
    .update({ paused, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  return { ok: !error };
}
