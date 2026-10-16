/**
 * 메인 화면의 결 무늬.
 * 쪽빛 결과 이끼색 결이 서로 다른 높이에서 출발해, 오른쪽에서 나란히 맞물린다.
 */
const INDIGO_STARTS = [8, 22, 36, 50, 64];
const MOSS_STARTS = [96, 110, 124, 138, 152];

function path(y0: number, y1: number, sway: number) {
  return `M0 ${y0} C 110 ${y0 + sway}, 190 ${y1 - sway}, 340 ${y1}`;
}

export function GrainMark() {
  return (
    <svg viewBox="0 0 340 160" className="h-auto w-full" role="img" aria-label="서로 다른 결이 나란히 맞물리는 그림">
      {INDIGO_STARTS.map((y0, i) => (
        <path
          key={`i${i}`}
          className="grain-line"
          d={path(y0, 52 + i * 14, 26 - i * 3)}
          fill="none"
          stroke="var(--color-indigo)"
          strokeWidth={1.4}
          strokeLinecap="round"
          style={{ animationDelay: `${i * 90}ms` }}
        />
      ))}
      {MOSS_STARTS.map((y0, i) => (
        <path
          key={`m${i}`}
          className="grain-line"
          d={path(y0, 59 + i * 14, -(26 - i * 3))}
          fill="none"
          stroke="var(--color-moss)"
          strokeWidth={1.4}
          strokeLinecap="round"
          style={{ animationDelay: `${120 + i * 90}ms` }}
        />
      ))}
    </svg>
  );
}
