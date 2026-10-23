import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Improvement, UserView } from "@/lib/photo/feedback";
import type { Filters, Gender, Religion } from "@/lib/match/filters";
import { isDrawing, type IllustrationStatus } from "@/lib/illustration/rules";

export type PhotoRow = { id: string; slot: "face" | "body"; path: string; feedback: UserView; created_at: string };

export type MySetup = {
  userId: string;
  nickname: string;
  gender: Gender;
  birthYear: number;
  matchProfile: {
    region: string;
    height: number;
    intro: string;
    religion: Religion;
    filters: Filters;
    paused: boolean;
  } | null;
  photos: { face: PhotoRow | null; body: PhotoRow | null };
  /** instagramVerified = 한결 인스타 DM 코드로 인스타 계정을 확인함 (선택) */
  contact: { instagram: boolean; kakao: boolean; instagramVerified: boolean } | null;
  consents: { religion: boolean; photoOverseas: boolean; illustration: boolean };
  /** 그림 프로필 (매칭에 꼭 필요). done = 다 그린(지우지 않은) 그림이 있음, drawing = 지금 그리는 중 */
  illustration: { done: boolean; drawing: boolean };
  suspended: boolean;
  /** 친구 평가 수 ('친구가 보는 나') */
  friendCount: number;
};

/** 매칭 준비 상태. 서버에서 로그인 사용자를 확인한 뒤에만 부른다 */
export async function loadMySetup(userId: string): Promise<MySetup | null> {
  const admin = createAdminClient();
  const [profile, mp, photos, contact, consents, flag, friends, illus, igVerified] = await Promise.all([
    admin.from("profiles").select("nickname, gender, birth_year").eq("id", userId).maybeSingle(),
    admin
      .from("match_profiles")
      .select("region, height, intro, religion, filters, paused")
      .eq("user_id", userId)
      .maybeSingle(),
    admin.from("photos").select("id, slot, path, feedback, created_at").eq("user_id", userId).is("replaced_at", null),
    admin.from("contacts").select("instagram, kakao").eq("user_id", userId).maybeSingle(),
    admin.from("consents").select("kind").eq("user_id", userId),
    admin.from("user_flags").select("suspended_at").eq("user_id", userId).maybeSingle(),
    admin.from("friend_ratings").select("id", { count: "exact", head: true }).eq("user_id", userId),
    admin
      .from("illustrations")
      .select("status, created_at")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .in("status", ["done", "pending"]),
    admin.from("instagram_verifications").select("user_id").eq("user_id", userId).maybeSingle(),
  ]);
  if (!profile.data) return null;

  const rows = (photos.data ?? []) as PhotoRow[];
  const kinds = new Set((consents.data ?? []).map((c) => c.kind));
  return {
    userId,
    nickname: profile.data.nickname,
    gender: profile.data.gender,
    birthYear: profile.data.birth_year,
    matchProfile: mp.data ? { ...mp.data, filters: mp.data.filters as Filters } : null,
    photos: { face: rows.find((r) => r.slot === "face") ?? null, body: rows.find((r) => r.slot === "body") ?? null },
    contact: contact.data
      ? { instagram: Boolean(contact.data.instagram), kakao: Boolean(contact.data.kakao), instagramVerified: Boolean(igVerified.data) }
      : null,
    consents: { religion: kinds.has("religion"), photoOverseas: kinds.has("photo_overseas"), illustration: kinds.has("illustration") },
    illustration: {
      done: (illus.data ?? []).some((r) => r.status === "done"),
      drawing: (illus.data ?? []).some((r) => isDrawing(r as { status: IllustrationStatus; created_at: string })),
    },
    suspended: Boolean(flag.data?.suspended_at),
    friendCount: friends.count ?? 0,
  };
}

export type SetupStep = { id: "profile" | "filters" | "photos" | "contact" | "illustration"; label: string; href: string; done: boolean };

/**
 * 매칭 준비 단계. 친구 평가는 조건이 아니다(평가를 받으면 새로고침 쿠폰).
 * 그림 프로필은 사진 2장이 갖춰지면 알아서 그려지므로(1~2분) 연락처를 채우는 동안 끝나게 맨 뒤에 둔다
 */
export function setupSteps(s: MySetup): SetupStep[] {
  const drawing = s.illustration.drawing && !s.illustration.done;
  return [
    { id: "profile", label: "내 정보와 자기소개", href: "/me/profile", done: Boolean(s.matchProfile) },
    { id: "filters", label: "원하는 상대 조건", href: "/me/filters", done: Boolean(s.matchProfile) },
    { id: "photos", label: "사진 2장", href: "/me/photos", done: Boolean(s.photos.face && s.photos.body) },
    { id: "contact", label: "연락처 (인스타그램 또는 카카오톡)", href: "/me/contact", done: Boolean(s.contact) },
    { id: "illustration", label: drawing ? "그림 프로필 (그리는 중)" : "그림 프로필", href: "/me/illustration", done: s.illustration.done },
  ];
}

/** 그림 프로필이 아직 없어서 자동으로 그려볼 만한지 (조건은 startAutoIllustration이 다시 확인한다) */
export const needsIllustration = (s: MySetup) => !s.illustration.done && !s.illustration.drawing && !s.suspended;

export const isReady = (s: MySetup) => setupSteps(s).every((step) => step.done);

/** 다음으로 채울 단계. 다 채웠으면 null */
export function nextSetupStep(s: MySetup, after?: SetupStep["id"]): SetupStep | null {
  const steps = setupSteps(s);
  const start = after ? steps.findIndex((x) => x.id === after) + 1 : 0;
  return steps.slice(start).find((x) => !x.done) ?? null;
}

/** 다음으로 채울 화면. 다 채웠으면 추천 화면 */
export function nextSetupPath(s: MySetup, after?: SetupStep["id"]): string {
  return nextSetupStep(s, after)?.href ?? "/match";
}

/** 사진 서명 주소 (10분) */
export async function signedPhotoUrls(paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const admin = createAdminClient();
  const { data } = await admin.storage.from("photos").createSignedUrls(paths, 600);
  const out = new Map<string, string>();
  for (const d of data ?? []) if (d.path && d.signedUrl) out.set(d.path, d.signedUrl);
  return out;
}

export type { Improvement };
