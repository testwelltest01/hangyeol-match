"use client";

import { ErrorScreen } from "@/components/ErrorScreen";

/** 화면을 그리다 실패했을 때 (루트 레이아웃은 그대로). Next 기본 영어 화면 대신 */
export default function Error({ error }: { error: unknown; retry: () => void }) {
  return <ErrorScreen error={error} />;
}
