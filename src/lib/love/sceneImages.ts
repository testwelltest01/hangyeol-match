import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { after } from "next/server";
import { imageModel } from "@/lib/illustration/generate";
import { SITUATIONS, type SituationId } from "@/lib/love/prompt";
import { SCENE_PROMPT_VERSION, scenePath, scenePrompt } from "@/lib/love/scenes";
import { createAdminClient } from "@/lib/supabase/admin";
import { logApiUsage } from "@/lib/usage/server";
import { parseImageUsage, type Usage } from "@/lib/usage/usage";

// 연애 상황 보고서의 장면 사진 만들기·불러오기. 관리자 화면에서만 만든다(비용이 들어서 회원 화면에서는 만들지 않는다).
// OpenAI Images Generations(그림 프로필과 같은 OPENAI_IMAGE_MODEL), 가로 1536x1024 webp → 공개 버킷 'scenes'

type Admin = SupabaseClient;
const BUCKET = "scenes";

export type SceneRow = {
  scene: SituationId;
  status: "pending" | "done" | "failed";
  path: string | null;
  model: string | null;
  prompt_version: string;
  error: string | null;
  started_at: string;
  updated_at: string;
};

/** 이만큼 지나도 '만드는 중'이면 멈춘 것으로 본다 */
const STALE_MS = 6 * 60_000;
const TIMEOUT_MS = 240_000;
/** 한꺼번에 만들 때 동시에 부르는 수 (이미지 API 분당 한도에 걸리지 않게) */
const CONCURRENCY = 3;

const isScene = (v: unknown): v is SituationId => SITUATIONS.some((s) => s.id === v);

export const publicSceneUrl = (admin: Admin, path: string) => admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

/** 장면 사진 기록 (관리자 화면). 멈춘 '만드는 중'은 실패로 정리한다 */
export async function loadSceneRows(admin: Admin): Promise<SceneRow[]> {
  const { data } = await admin.from("love_scene_images").select("scene, status, path, model, prompt_version, error, started_at, updated_at");
  const rows = ((data ?? []) as SceneRow[]).filter((r) => isScene(r.scene));
  for (const r of rows) {
    if (r.status === "pending" && Date.now() - new Date(r.started_at).getTime() > STALE_MS) {
      const error = "너무 오래 걸려서 멈췄어요. 다시 만들어 주세요.";
      await admin.from("love_scene_images").update({ status: "failed", error, updated_at: new Date().toISOString() }).eq("scene", r.scene).eq("status", "pending");
      Object.assign(r, { status: "failed", error });
    }
  }
  return rows;
}

/**
 * 보고서에 넣을 장면 사진 주소 (장면 id → 공개 주소). 다 만든 것만.
 * 이전에 다 만든 사진이 있으면 다시 만드는 중·실패여도 그 사진을 쓴다(path가 남아 있다). 표가 없거나 읽지 못하면 빈 값(사진 없이 보여준다)
 */
export async function loadSceneImageUrls(admin: Admin): Promise<Partial<Record<SituationId, string>>> {
  try {
    const { data, error } = await admin.from("love_scene_images").select("scene, path").not("path", "is", null);
    if (error || !data) return {};
    const out: Partial<Record<SituationId, string>> = {};
    for (const r of data as { scene: string; path: string }[]) if (isScene(r.scene)) out[r.scene] = publicSceneUrl(admin, r.path);
    return out;
  } catch {
    return {};
  }
}

async function generate(prompt: string): Promise<{ ok: true; image: Buffer; model: string } | { ok: false; error: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, error: "AI 설정(OPENAI_API_KEY)이 없어요." };
  const model = imageModel();
  // 관리자 'API 사용량' 기록 (용도·토큰·시간)
  const started = Date.now();
  const log = (ok: boolean, usage: Usage | null, usedModel: string, error?: string) =>
    logApiUsage({ purpose: "scene_image", endpoint: "image_generate", model: usedModel, ok, usage, durationMs: Date.now() - started, error });
  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        size: "1536x1024",
        quality: process.env.OPENAI_IMAGE_QUALITY || "medium",
        output_format: "webp",
        output_compression: 82,
        n: 1,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const json = (await res.json().catch(() => null)) as {
      model?: string;
      usage?: unknown;
      data?: { b64_json?: string }[];
      error?: { code?: string; message?: string };
    } | null;
    if (!res.ok) {
      const msg = `${res.status} ${json?.error?.code ?? ""} ${json?.error?.message ?? ""}`.trim();
      console.error("scene image failed", msg.slice(0, 300));
      await log(false, null, model, `${res.status} ${json?.error?.code ?? ""}`.trim());
      return { ok: false, error: `사진을 만들지 못했어요 (${msg.slice(0, 160)})` };
    }
    await log(true, parseImageUsage(json?.usage), json?.model ?? model);
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) return { ok: false, error: "사진을 받지 못했어요." };
    return { ok: true, image: Buffer.from(b64, "base64"), model };
  } catch (e) {
    await log(false, null, model, (e as Error).name === "TimeoutError" || (e as Error).name === "AbortError" ? "timeout" : "network");
    if ((e as Error).name === "TimeoutError" || (e as Error).name === "AbortError") return { ok: false, error: "너무 오래 걸렸어요. 다시 만들어 주세요." };
    return { ok: false, error: "사진을 만들지 못했어요." };
  }
}

/** 한 장 만들기: 만들고 → 올리고 → 표에 기록, 예전 파일은 지운다. 실패하면 기록만 (예전 사진은 그대로 쓴다) */
async function runScene(admin: Admin, id: SituationId): Promise<void> {
  const now = () => new Date().toISOString();
  const fail = (error: string) => admin.from("love_scene_images").update({ status: "failed", error, updated_at: now() }).eq("scene", id);
  try {
    const { data: before } = await admin.from("love_scene_images").select("path").eq("scene", id).maybeSingle();
    const res = await generate(scenePrompt(id));
    if (!res.ok) return void (await fail(res.error));
    const path = scenePath(id, Date.now());
    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, res.image, { contentType: "image/webp", cacheControl: "31536000", upsert: true });
    if (upErr) return void (await fail(`저장하지 못했어요 (${upErr.message})`));
    await admin
      .from("love_scene_images")
      .update({ status: "done", path, model: res.model, prompt_version: SCENE_PROMPT_VERSION, error: null, updated_at: now() })
      .eq("scene", id);
    if (before?.path && before.path !== path) await admin.storage.from(BUCKET).remove([before.path]);
  } catch (e) {
    console.error("scene run failed", (e as Error).message);
    await fail("사진을 만들지 못했어요.");
  }
}

/**
 * 장면 사진 만들기를 시작한다: 표에 '만드는 중'을 먼저 남기고(화면에 바로 보이게), 응답 뒤 after()에서 동시에 3장씩 만든다.
 * 부르는 화면은 maxDuration 300 (10장이 3장씩이면 보통 2~3분)
 */
export async function startSceneImages(admin: Admin, ids: SituationId[]): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!ids.length) return { ok: true };
  const now = new Date().toISOString();
  const { error } = await admin
    .from("love_scene_images")
    .upsert(ids.map((scene) => ({ scene, status: "pending", prompt_version: SCENE_PROMPT_VERSION, error: null, started_at: now, updated_at: now })), {
      onConflict: "scene",
    });
  if (error) return { ok: false, error: `기록하지 못했어요 (${error.code ?? ""} ${error.message}). 0005_love_scenes.sql을 실행했는지 확인해 주세요.` };
  after(async () => {
    const worker = createAdminClient();
    const queue = [...ids];
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
        for (let id = queue.shift(); id; id = queue.shift()) await runScene(worker, id);
      }),
    );
  });
  return { ok: true };
}

export { isScene };
