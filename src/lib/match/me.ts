import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Improvement, UserView } from "@/lib/photo/feedback";
import type { Filters, Gender, Religion } from "@/lib/match/filters";
import { MIN_FRIENDS_FOR_MATCHING } from "@/lib/match/rules";

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
    religion: Religion | null;
    filters: Filters;
    paused: boolean;
  } | null;
  photos: { face: PhotoRow | null; body: PhotoRow | null };
  contact: { instagram: boolean; kakao: boolean } | null;
  consents: { religion: boolean; photoOverseas: boolean };
  suspended: boolean;
  /** 친구 평가 수 ('친구가 보는 나') */
  friendCount: number;
};

/** 매칭 준비 상태. 서버에서 로그인 사용자를 확인한 뒤에만 부른다 */
export async function loadMySetup(userId: string): Promise<MySetup | null> {
  const admin = createAdminClient();
  const [profile, mp, photos, contact, consents, flag, friends] = await Promise.all([
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
  ]);
  if (!profile.data) return null;

  const rows = (photos.data ?? []) as PhotoRow[];
  const kinds = new Set((consents.data ?? []).map((c) => c.kind));
  return {
    userId,
    nickname: profile.data.nickname,
    gender: profile.data.gender,
    birthYear: profile.data.birth_year,
    matchProfile: mp.data ?? null,
    photos: { face: rows.find((r) => r.slot === "face") ?? null, body: rows.find((r) => r.slot === "body") ?? null },
    contact: contact.data ? { instagram: Boolean(contact.data.instagram), kakao: Boolean(contact.data.kakao) } : null,
    consents: { religion: kinds.has("religion"), photoOverseas: kinds.has("photo_overseas") },
    suspended: Boolean(flag.data?.suspended_at),
    friendCount: friends.count ?? 0,
  };
}

export type SetupStep = { id: "friends" | "profile" | "filters" | "photos" | "contact"; label: string; href: string; done: boolean };

export function setupSteps(s: MySetup): SetupStep[] {
  return [
    {
      id: "friends",
      label: `친구 평가 ${MIN_FRIENDS_FOR_MATCHING}명 이상 받기`,
      href: "/report#friends",
      done: s.friendCount >= MIN_FRIENDS_FOR_MATCHING,
    },
    { id: "profile", label: "내 정보와 자기소개", href: "/me/profile", done: Boolean(s.matchProfile) },
    { id: "filters", label: "원하는 상대 조건", href: "/me/filters", done: Boolean(s.matchProfile) },
    { id: "photos", label: "사진 2장", href: "/me/photos", done: Boolean(s.photos.face && s.photos.body) },
    { id: "contact", label: "연락처 (인스타그램 또는 카카오톡)", href: "/me/contact", done: Boolean(s.contact) },
  ];
}

export const isReady = (s: MySetup) => setupSteps(s).every((step) => step.done);

/** 다음으로 채울 화면. 다 채웠으면 추천 화면 */
export function nextSetupPath(s: MySetup, after?: SetupStep["id"]): string {
  const steps = setupSteps(s);
  const start = after ? steps.findIndex((x) => x.id === after) + 1 : 0;
  return steps.slice(start).find((x) => !x.done)?.href ?? "/match";
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
