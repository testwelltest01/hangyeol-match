import { Shell } from "@/components/Shell";

// 1단계(매칭) 처리방침. 공개 전에 전문가 검토를 받는다.
// 항목이 바뀌면 시행일을 고치고, 시행 7일 전에 알린다.

const ROWS = [
  { purpose: "로그인과 계정 관리", items: "이메일, 비밀번호(복원할 수 없는 해시로 저장)", period: "탈퇴 시 파기" },
  { purpose: "만 19세 이상 확인, 추천 카드와 친구 평가 화면 표시", items: "닉네임, 성별, 출생연도", period: "탈퇴 시 파기" },
  { purpose: "리포트 제공과 매칭 추천, 서비스 개선을 위한 통계 분석", items: "검사 응답과 점수", period: "탈퇴 시 파기" },
  {
    purpose: "리포트의 '더 알아보기'(선택), 보여주기를 켠 경우 추천받은 상대에게 결과 요약 표시",
    items: "추가 검사 응답과 결과",
    period: "탈퇴 시 파기",
  },
  { purpose: "리포트의 '친구가 보는 나'", items: "친구가 입력한 평가 응답 (평가한 친구의 개인정보는 받지 않음)", period: "탈퇴 시 파기" },
  {
    purpose: "매칭 추천",
    items: "사는 지역(시·군·구), 키, 자기소개, 원하는 상대 조건, 추천·관심·수락 기록",
    period: "탈퇴 시 파기",
  },
  {
    purpose: "서로 관심을 보낸 상대에게 사진 공개, 사진 개선 안내",
    items: "얼굴 사진, 전신 사진, AI 피드백과 내부 점수, 사진 올리기 기록(등록되지 않은 사진은 파일 없이 거절 사유만)",
    period: "탈퇴 시 파기. 교체한 이전 사진은 신고 확인을 위해 1년 보관 후 파기",
  },
  {
    purpose: "그림 프로필 만들기와 추천 카드에 표시 (매칭에 필요)",
    items: "AI가 만든 그림, 그림에 쓴 정보 요약(성별·나이대·키·자기소개·성향 요약)",
    period: "지우거나 탈퇴 시 파기",
  },
  {
    purpose: "서로 수락한 두 사람의 대화",
    items: "대화 내용, 보낸 시각, 글자 수·순번 같은 대화 정보, 읽음 표시, 연락처 전달 요청 기록",
    period: "대화 내용은 마지막 대화 후 90일(확인 중인 신고가 있으면 처리가 끝날 때까지) 뒤 파기. 내용이 없는 대화 정보는 탈퇴 시 파기",
  },
  {
    purpose: "둘 다 '연락처 전달'을 누른 상대에게 연락처 공개",
    items: "인스타그램 아이디, 카카오톡 ID (암호화해 저장)",
    period: "삭제하거나 탈퇴 시 파기",
  },
  {
    purpose: "알림 보내기(선택): 매일 새 추천, 서로 관심, 대화방 열림, 새 메시지, 연락처 전달",
    items: "알림을 켠 기기의 브라우저 알림 주소와 암호화 키, 기기·브라우저 종류",
    period: "알림을 끄거나 로그아웃·탈퇴 시 파기",
  },
  { purpose: "안전한 이용 (신고, 차단, 만남 후 피드백)", items: "신고 내용, 차단 목록, 만남 후 피드백", period: "탈퇴 시 파기" },
  {
    purpose: "접속 관리, 부정 이용 방지, 이용 통계",
    items: "접속 로그, IP 주소, 브라우저 정보, 로그인 유지용 쿠키, 요청 횟수 기록",
    period: "접속 로그 3개월(「통신비밀보호법」), 요청 횟수 기록 1일",
  },
];

function H({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mt-10 scroll-mt-4 font-serif text-xl font-bold">
      {children}
    </h2>
  );
}

const P = ({ children }: { children: React.ReactNode }) => <p className="mt-3 text-ink-soft">{children}</p>;

export default function PrivacyPage() {
  return (
    <Shell back={{ href: "/", label: "뒤로", history: true }}>
      <h1 className="font-serif text-[1.65rem] font-bold leading-tight">개인정보처리방침</h1>
      <P>
        한결(이하 &quot;서비스&quot;)은 「개인정보 보호법」 제30조에 따라 이용자의 개인정보를 어떻게 처리하는지 알리기 위해 이
        처리방침을 둡니다.
      </P>

      <H>1. 처리 목적, 항목, 보유기간</H>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="py-2 pr-3 font-semibold">목적</th>
              <th className="py-2 pr-3 font-semibold">항목</th>
              <th className="py-2 font-semibold">보유기간</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.purpose} className="border-b border-line align-top">
                <td className="py-3 pr-3">{r.purpose}</td>
                <td className="py-3 pr-3">{r.items}</td>
                <td className="py-3">{r.period}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <P>
        검사 응답은 서비스 안에서 리포트와 추천에만 쓰며, 외부 AI 모델의 학습에는 제공하지 않습니다. 건강·질병 정보와 우울·불안
        같은 정신건강 검사 결과는 수집하지 않습니다.
      </P>

      <H>2. 민감정보 (종교)</H>
      <P>
        종교는 「개인정보 보호법」 제23조의 민감정보입니다. 가입 후 처음 정보를 입력할 때 다른 동의와 구분해 별도로 동의를 받고,
        매칭 정보에서 입력합니다. 종교 조건에 맞는 상대를 추천하는 데만 쓰고, 상대에게 그대로 보여주지 않으며, 탈퇴하면 바로
        지웁니다.
      </P>

      <H>3. 이용자 사이의 공개</H>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-soft">
        <li>
          추천 카드: 닉네임, 출생연도, 시·군·구, 키, 자기소개, 검사 결과 요약과 추천 이유, 그림 프로필(여러 장이면 이용자가 고른 그림).
          실제 사진과 연락처는 보이지 않습니다.
        </li>
        <li>추가 검사(선택)를 하고 &quot;상대에게 보여주기&quot;를 켠 경우: 그 결과 요약과 두 사람의 공통점. 문항별 응답은 보이지 않습니다.</li>
        <li>서로 관심을 보낸 경우: 서로의 사진 2장.</li>
        <li>서로 수락한 경우: 두 사람만 보는 대화방이 열립니다 (한 사람당 메시지 49개까지).</li>
        <li>둘 다 &quot;연락처 전달&quot;을 누른 경우: 서로의 인스타그램 아이디 또는 카카오톡 ID.</li>
      </ul>
      <P>각 단계는 이용자가 직접 관심·수락·연락처 전달을 눌러야 진행되며, 그 전에는 어떤 화면에서도 다음 단계 정보가 보이지 않습니다.</P>
      <P>
        운영자는 신고가 접수된 두 사람 사이의 대화만 신고 확인을 위해 열람합니다. 서비스 개선과 통계에는 대화 내용이 아닌 대화 정보(보낸
        시각, 글자 수, 순번, 응답까지 걸린 시간 등)만 이용합니다.
      </P>

      <H>4. 자동화된 결정 (추천)</H>
      <P>
        추천은 검사 응답, 원하는 상대 조건, 서비스 안의 행동 기록(관심·수락, 만남 후 피드백)을 이용해 자동으로 이루어집니다. 추천
        카드에는 추천 이유를 항상 표시합니다. 사진의 AI 점수는 사진 개선 안내에만 쓰고 추천 순위에는 쓰지 않습니다. 추천 방식에
        대한 설명을 요구하거나 이의를 제기하려면 아래 이메일로 알려주세요.
      </P>

      <H>5. 제3자 제공</H>
      <P>
        서비스는 위 3번(이용자가 직접 선택한 공개) 외에는 개인정보를 제3자에게 제공하지 않습니다. 법령에 따른 요구가 있는 경우는
        예외로 합니다.
      </P>

      <H>6. 처리 위탁</H>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-soft">
        <li>Supabase, Inc.: 회원 정보, 검사 결과, 사진 저장과 로그인 처리 (서울 리전)</li>
        <li>Vercel Inc.: 웹 호스팅과 서버 기능 실행 (서울 리전)</li>
      </ul>

      <H id="overseas">7. 국외 이전 (사진 AI 피드백, 그림 프로필)</H>
      <p className="mt-3 font-semibold text-ink">사진 AI 피드백</p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-soft">
        <li>이전받는 자: OpenAI, L.L.C. (미국)</li>
        <li>이전 항목: 등록하는 사진, 성별 (이름, 이메일, 검사 결과는 보내지 않음)</li>
        <li>목적: 사진이 등록 기준에 맞는지 확인하고 더 좋은 사진을 찍는 방법 안내</li>
        <li>일시와 방법: 사진을 등록할 때마다 암호화된 통신(HTTPS)으로 전송</li>
        <li>보유기간: OpenAI 정책에 따라 남용 감시 목적으로 최대 30일 보관 후 삭제되며, AI 학습에 쓰이지 않음</li>
        <li>
          동의 시점과 거부 시 불이익: 가입 후 처음 정보를 입력할 때 동의를 받습니다. 사진 확인 없이는 사진을 등록할 수 없어 동의하지
          않으면 서비스를 시작할 수 없습니다. OpenAI는 API로 받은 데이터를 모델 학습에 쓰지 않습니다(
          <a
            href="https://openai.com/ko-KR/policies/how-your-data-is-used-to-improve-model-performance/"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4"
          >
            OpenAI 안내
          </a>
          ).
        </li>
      </ul>
      <p className="mt-5 font-semibold text-ink">그림 프로필</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
        <li>이전받는 자: OpenAI, L.L.C. (미국)</li>
        <li>
          이전 항목: 등록한 얼굴·전신 사진 2장, 성별, 나이대, 키, 자기소개, 검사 결과 중 성격·생활 성향·꾸밈 정도 요약, 더 알아보기 결과
          요약 (닉네임, 이메일, 사는 곳, 종교, 연락처는 보내지 않음)
        </li>
        <li>목적: 추천 카드에 실제 사진 대신 보여줄 그림 프로필(AI 그림) 만들기</li>
        <li>
          일시와 방법: 사진 2장과 내 정보가 갖춰졌을 때 자동으로(실패하면 잠시 뒤 다시), 그 뒤에는 이용자가 &quot;새로 그리기&quot;를 누를
          때마다 암호화된 통신(HTTPS)으로 전송
        </li>
        <li>보유기간: OpenAI 정책에 따라 남용 감시 목적으로 최대 30일 보관 후 삭제되며, AI 학습에 쓰이지 않음</li>
        <li>
          동의 시점과 거부 시 불이익: 가입 후 처음 정보를 입력할 때 동의를 받습니다(그 전에 가입한 회원은 그림 프로필 화면에서). 그림
          프로필이 있어야 추천을 주고받을 수 있어 동의하지 않으면 매칭을 이용할 수 없습니다.
        </li>
      </ul>
      <p className="mt-5 font-semibold text-ink">알림 (선택)</p>
      <P>
        알림을 켠 경우, 알림은 이용자가 쓰는 브라우저 회사(구글, 애플, 모질라 등)의 푸시 서버를 거쳐 기기로 전달됩니다. 알림 내용은
        암호화되어 이 회사들이 읽을 수 없고, 알림에는 상대 닉네임만 들어가며 대화 내용·사진·연락처는 넣지 않습니다. 내 정보에서
        알림을 끄면 더 이상 보내지 않습니다.
      </P>
      <P>그 밖의 개인정보는 국외로 이전하지 않습니다.</P>

      <H>8. 파기</H>
      <P>
        탈퇴하거나 보유기간이 끝나면 지체 없이 복구할 수 없는 방법으로 삭제합니다. 탈퇴하면 사진 파일을 포함한 모든 정보가 바로
        지워집니다. 법령에 따라 보관해야 하는 접속 로그는 다른 정보와 분리해 보관하고 기간이 끝나면 파기합니다.
      </P>

      <H>9. 정보주체의 권리</H>
      <P>
        이용자는 언제든 개인정보 열람, 정정·삭제, 처리정지, 동의 철회를 요구할 수 있습니다. &quot;내 정보&quot; 화면에서 정보를
        고치거나 매칭을 쉴 수 있고, &quot;탈퇴하고 내 정보 지우기&quot;로 모든 정보를 바로 지울 수 있습니다. 그 밖의 요구는 아래
        이메일로 보내면 법령이 정한 기간 안에 조치하고 결과를 알립니다.
      </P>

      <H>10. 안전성 확보조치</H>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-soft">
        <li>개인정보 접근 권한을 운영자 본인으로 제한</li>
        <li>사진, 연락처, 종교, 추천 기록은 브라우저에서 직접 조회할 수 없고 서버가 본인 확인 후에만 처리</li>
        <li>연락처는 암호화(AES-256)해 저장</li>
        <li>사진은 비공개 저장소에 두고, 볼 수 있는 사람에게만 10분 동안 유효한 주소로 표시</li>
        <li>전 구간 HTTPS 전송, 보안 헤더 적용, 요청 횟수 제한으로 무차별 시도 차단</li>
        <li>친구 평가는 3명 이상 모였을 때 평균만 보여주고 개별 응답은 공개하지 않음</li>
      </ul>

      <H>11. 쿠키</H>
      <P>
        로그인 유지를 위한 쿠키만 쓰며, 맞춤형 광고나 행태정보 수집은 하지 않습니다. 브라우저 설정에서 쿠키를 거부할 수 있지만,
        거부하면 로그인이 유지되지 않습니다.
      </P>

      <H>12. 개인정보 보호책임자</H>
      <P>성명 최현석 (대표), 이메일 testwelltest01@gmail.com</P>

      <H>13. 권익침해 구제</H>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-soft">
        <li>개인정보분쟁조정위원회: 1833-6972, www.kopico.go.kr</li>
        <li>개인정보침해신고센터: 국번 없이 118, privacy.kisa.or.kr</li>
        <li>대검찰청: 국번 없이 1301</li>
        <li>경찰청: 국번 없이 182</li>
      </ul>

      <H>14. 시행일</H>
      <P>이 처리방침은 2026년 10월 21일부터 적용합니다. 내용이 바뀌면 시행 7일 전에 알립니다.</P>
    </Shell>
  );
}
