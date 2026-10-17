import "server-only";
import { after } from "next/server";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

/** 같은 사람의 방문은 이 간격(초)에 한 번만 남긴다 */
const VISIT_GAP_SECONDS = 30 * 60;

let warned = false;

/**
 * 로그인한 회원의 활동을 응답을 보낸 뒤에 기록한다(화면을 늦추지 않는다).
 * 한 요청에서 여러 번 불려도 cache로 한 번만 예약하고, 간격은 DB 함수(log_visit)가 지킨다.
 * 0003 SQL을 실행하기 전이거나 오류가 나도 서비스에는 영향을 주지 않는다.
 */
export const trackVisit = cache((userId: string) => {
  after(async () => {
    const { error } = await createAdminClient().rpc("log_visit", { p_user: userId, p_gap_seconds: VISIT_GAP_SECONDS });
    if (error && !warned) {
      warned = true;
      console.warn("visit log skipped:", error.message);
    }
  });
});
