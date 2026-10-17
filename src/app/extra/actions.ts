"use server";

import { findExtraTest, scoreExtra, validateExtra } from "@/lib/extra/tests";
import { getProgress } from "@/lib/progress";
import { allow, TOO_MANY } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

/** 추가 검사 저장. 점수는 서버에서 다시 계산한다 */
export async function saveExtra(testId: string, answers: unknown, share: boolean): Promise<Result> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "로그인이 풀렸어요. 다시 로그인해주세요." };
  if ((await getProgress(userId)) !== "report") return { ok: false, error: "기본 검사를 먼저 마쳐주세요." };
  const test = findExtraTest(testId);
  if (!test || typeof share !== "boolean") return { ok: false, error: "잘못된 요청이에요." };
  const valid = validateExtra(test, answers);
  if (!valid) return { ok: false, error: "모든 문항에 답해주세요." };
  if (!(await allow(`extra:${userId}`, 30, 3600))) return { ok: false, error: TOO_MANY };

  const { error } = await createAdminClient()
    .from("extra_results")
    .upsert({
      user_id: userId,
      test_id: test.id,
      version: test.version,
      answers: valid,
      scores: scoreExtra(test, valid),
      share,
      completed_at: new Date().toISOString(),
    });
  if (error) return { ok: false, error: "저장하지 못했어요. 잠시 후 다시 시도해주세요." };
  return { ok: true };
}
