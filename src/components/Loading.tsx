/** 로그인 정보나 저장된 답을 읽는 동안 보여주는 자리 */
export function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <p className="sr-only">불러오는 중이에요</p>
      <div className="h-9 w-2/3 rounded-lg bg-mist" />
      <div className="h-4 w-full rounded bg-mist" />
      <div className="h-4 w-5/6 rounded bg-mist" />
    </div>
  );
}
