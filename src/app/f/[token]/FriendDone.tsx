// 친구 평가를 마친 친구에게: 짧은 고마움 + 한결을 써볼 이유 + 실제로 거칠 단계(이메일 가입을 숨기지 않는다)
import { IconCheck, IconFriends, IconGrain, IconLock } from "@/components/icons";
import { OpenInBrowserLink } from "@/components/OpenInBrowserLink";

const REASONS = [
  {
    Icon: IconGrain,
    title: "사진보다 결부터",
    body: "연락 스타일, 주말, 돈 쓰는 방식이 맞는 사람을 골라 왜 잘 맞는지까지 알려드려요.",
  },
  {
    Icon: IconLock,
    title: "사진은 서로 마음이 있을 때만",
    body: "둘 다 관심을 보내야 사진이 공개돼요. 외모로 넘겨보는 앱이 아니에요.",
  },
  {
    Icon: IconFriends,
    title: "친구가 보증하는 사람들",
    body: "모든 회원이 방금 같은 친구 평가를 1명 이상 받아야 소개를 받을 수 있어요.",
  },
];

const STEPS = [
  { title: "이메일로 가입", note: "1분", body: "메일로 받은 코드를 넣고 비밀번호를 만들어요." },
  { title: "가치관 검사", note: "11분", body: "끝나면 나의 연애 결 리포트를 바로 받아요." },
  { title: "매일 저녁 8시, 3명 소개", note: "무료", body: "사진과 친구 평가까지 마치면 소개가 시작돼요." },
];

export function FriendDone({ name }: { name: string }) {
  return (
    <div className="mt-2">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss text-white">
          <IconCheck size={20} strong />
        </span>
        <div>
          <p className="font-serif text-[1.45rem] font-bold leading-tight text-ink">답이 전달됐어요</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">
            고마워요. {name}님에게는 여러 친구의 답을 합친 평균만 보이고, 누가 어떻게 답했는지는 알 수 없어요.
          </p>
        </div>
      </div>

      <section className="mt-8 overflow-hidden rounded-[22px] bg-surface ring-1 ring-line/80">
        <div className="px-5 pt-6">
          <p className="text-[13.5px] font-semibold text-indigo">이번엔 나의 차례</p>
          <h2 className="mt-1.5 font-serif text-[1.5rem] font-bold leading-snug text-ink">
            결이 맞는 사람,
            <br />
            나도 소개받아 볼까요?
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
            한결은 가치관 검사로 나와 잘 맞는 사람을 매일 저녁 소개하는 무료 소개팅이에요. 진지한 연애를 원하는 사람만 모여요.
          </p>
        </div>

        <ul className="mt-5 divide-y divide-line/70 border-t border-line/70">
          {REASONS.map(({ Icon, title, body }) => (
            <li key={title} className="flex items-start gap-3.5 px-5 py-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mist text-ink">
                <Icon size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-ink">{title}</p>
                <p className="mt-0.5 text-[14px] leading-relaxed text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="px-1 text-[14px] font-semibold text-ink-soft">시작은 이렇게</h2>
        <ol className="mt-3 space-y-0">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative flex gap-3.5 pb-5 last:pb-0">
              {i < STEPS.length - 1 && <span aria-hidden className="absolute left-[13px] top-8 bottom-1 w-px bg-line" />}
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo text-[13px] font-semibold text-white">
                {i + 1}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-[15px] font-semibold text-ink">
                  {s.title} <span className="ml-1 text-[13px] font-normal text-muted">{s.note}</span>
                </p>
                <p className="mt-0.5 text-[14px] leading-relaxed text-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-8">
        {/* 카카오톡 안에서 열렸으면 기본 브라우저로 넘겨서 연다 (가입·로그인이 카카오톡 창에 묶이지 않게) */}
        <OpenInBrowserLink href="/start">무료로 시작하기</OpenInBrowserLink>
        <p className="mt-4 text-center">
          <OpenInBrowserLink href="/tour" variant="text">
            가입 없이 가상 매칭 먼저 둘러보기
          </OpenInBrowserLink>
        </p>
      </div>
    </div>
  );
}
