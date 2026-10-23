import Link from "next/link";
import { IconCheck } from "@/components/icons";
import { OpenInBrowserLink } from "@/components/OpenInBrowserLink";

const POINTS = [
  "다툴 때, 연락이 뜸할 때, 화해할 때처럼 장면마다 나는 어떤지",
  "상대에게는 어떻게 보일 수 있는지와 아쉬운 대화·좋은 대화 예시",
  "타고난 기질과 다듬어 온 성격을 함께 읽은 나의 연애 결",
];

/**
 * 공유받은 보고서 화면(/love/s/열쇠) 아래: '나도 검사해보기'로 가입 없는 검사(/love)에 연결하고, 한결을 짧게 소개한다.
 * 앱 안 브라우저(카카오톡 등)면 검사는 밖의 브라우저에서 하도록 넘겨 연다 (임시 저장한 답이 앱 창에 묶이지 않게)
 */
export function TryInvite({ title = "나는 연애에서 어떤 사람일까?" }: { title?: string }) {
  return (
    <section className="mt-12 overflow-hidden rounded-[22px] bg-surface ring-1 ring-line/80">
      <div aria-hidden className="h-1 bg-gradient-to-r from-strand-a to-strand-b" />
      <div className="px-5 pb-6 pt-6">
        <p className="text-sm font-semibold text-indigo">나도 검사해보기</p>
        <h2 className="mt-1 font-serif text-[1.4rem] font-bold leading-snug text-ink">{title}</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">10분이면 나만의 연애 상황 보고서를 받아요. 가입하지 않아도 되고 무료예요.</p>
        <ul className="mt-4 space-y-2.5">
          {POINTS.map((p) => (
            <li key={p} className="flex gap-3 text-[15px] leading-relaxed text-ink">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-moss text-white">
                <IconCheck size={12} strong />
              </span>
              {p}
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <OpenInBrowserLink href="/love">나도 검사해보기</OpenInBrowserLink>
        </div>
        <p className="mt-5 text-center text-[13.5px] leading-relaxed text-muted">
          한결은 이런 결을 보고 맞는 사람을 소개하는 무료 소개팅이에요.{" "}
          <Link href="/" className="font-semibold text-indigo underline underline-offset-4">
            한결 둘러보기
          </Link>
        </p>
      </div>
    </section>
  );
}
