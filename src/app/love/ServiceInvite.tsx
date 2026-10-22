import { IconCheck } from "@/components/icons";
import { OpenInBrowserLink } from "@/components/OpenInBrowserLink";

const POINTS = [
  "연락·돈·다툰 뒤·주말처럼 생활 장면에서 결이 맞는 사람을 골라요.",
  "왜 잘 맞는지와 어디서 부딪힐 수 있는지까지 미리 알려 드려요.",
  "사진보다 결을 먼저 봐요. 서로 관심을 보내야 사진이 보여요.",
];

/**
 * 가입 전 결과 화면 아래: 한결 소개와 가입 버튼. 가입 버튼은 /love/claim?t=열쇠 → (쿠키) → 가입 → /start가 이 검사를 계정으로 옮긴다.
 * 앱 안 브라우저면 밖의 브라우저로 넘겨 연다(OpenInBrowserLink, 열쇠가 주소에 있어서 브라우저가 바뀌어도 이어진다)
 */
export function ServiceInvite({ token }: { token: string }) {
  return (
    <section className="mt-12 overflow-hidden rounded-[22px] bg-surface ring-1 ring-line/80">
      <div aria-hidden className="h-1 bg-gradient-to-r from-strand-a to-strand-b" />
      <div className="px-5 pb-6 pt-6">
        <p className="text-sm font-semibold text-indigo">한결</p>
        <h2 className="mt-1 font-serif text-[1.4rem] font-bold leading-snug text-ink">이 결이 맞는 사람, 한결이 찾아 드릴게요</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          한결은 결이 맞는 사람을 소개하는 무료 소개팅이에요. 기본 검사로 서로의 결을 보고, 매일 저녁 8시에 맞는 사람을 소개해요.
        </p>
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
        <p className="mt-5 rounded-xl bg-mist px-4 py-3 text-[14px] leading-relaxed text-ink-soft">
          이메일 가입 1분 → 기본 검사 11분 → 내 정보·사진 → 매일 저녁 8시 소개. 가입하면 방금 받은 보고서가 내 계정에 그대로 저장돼요.
        </p>
        <div className="mt-5">
          <OpenInBrowserLink href={`/love/claim?t=${token}`} plain>
            무료로 가입하고 소개받기
          </OpenInBrowserLink>
        </div>
        <div className="mt-4 text-center">
          <OpenInBrowserLink href="/tour" variant="text">
            가입 없이 가상 매칭 먼저 해보기
          </OpenInBrowserLink>
        </div>
      </div>
    </section>
  );
}
