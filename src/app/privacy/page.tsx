import { Shell } from "@/components/Shell";

// 0단계(검사·리포트·친구 평가)용 처리방침. 1단계(사진, 본인인증, 매칭)를 열 때 기획서의 전체 초안으로 바꾼다.
// 공개 전에 시행일과 보호책임자 성명을 채우고, 전문가 검토를 받는다.

const ROWS = [
  { purpose: "로그인과 계정 관리", items: "이메일", period: "탈퇴 시 파기" },
  { purpose: "만 19세 이상 확인, 친구 평가 화면 표시", items: "닉네임, 성별, 출생연도", period: "탈퇴 시 파기" },
  { purpose: "리포트 제공, 이후 매칭 추천", items: "검사 응답과 점수", period: "탈퇴 시 파기" },
  { purpose: "리포트의 '친구가 보는 나'", items: "친구가 입력한 평가 응답 (평가한 친구의 개인정보는 받지 않음)", period: "탈퇴 시 파기" },
  { purpose: "접속 관리, 부정 접속 방지", items: "접속 로그, IP 주소, 브라우저 정보, 로그인 유지용 쿠키", period: "「통신비밀보호법」에 따라 접속 로그 3개월" },
];

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 font-serif text-xl font-bold">{children}</h2>;
}

export default function PrivacyPage() {
  return (
    <Shell>
      <h1 className="font-serif text-3xl font-bold">개인정보처리방침</h1>
      <p className="mt-3 text-ink-soft">
        한결(이하 &quot;서비스&quot;)은 「개인정보 보호법」 제30조에 따라 이용자의 개인정보를 어떻게 처리하는지 알리기 위해 이
        처리방침을 둡니다. 지금은 검사와 리포트만 제공하고 있으며, 매칭 기능을 열 때 처리방침을 개정하고 미리
        알립니다.
      </p>

      <H>1. 처리 목적, 항목, 보유기간</H>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-left text-sm">
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
      <p className="mt-4 text-ink-soft">
        검사 응답은 서비스 안에서 리포트와 추천 품질을 높이는 데 쓰며, 외부 AI 모델의 학습에는 제공하지 않습니다. 건강·질병
        정보와 우울·불안 같은 정신건강 검사 결과는 수집하지 않습니다.
      </p>

      <H>2. 제3자 제공</H>
      <p className="mt-3 text-ink-soft">서비스는 개인정보를 제3자에게 제공하지 않습니다. 법령에 따른 요구가 있는 경우는 예외로 합니다.</p>

      <H>3. 처리 위탁</H>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-soft">
        <li>Supabase, Inc.: 회원 정보와 검사 결과 저장, 로그인 처리 (서울 리전)</li>
        <li>Vercel Inc.: 웹 호스팅과 서버 기능 실행 (서울 리전)</li>
      </ul>
      <p className="mt-3 text-ink-soft">현재 개인정보를 국외로 이전하지 않습니다.</p>

      <H>4. 파기</H>
      <p className="mt-3 text-ink-soft">
        탈퇴하거나 보유기간이 끝나면 지체 없이 복구할 수 없는 방법으로 삭제합니다. 법령에 따라 보관해야 하는 접속 로그는
        다른 정보와 분리해 보관하고 기간이 끝나면 파기합니다.
      </p>

      <H>5. 정보주체의 권리</H>
      <p className="mt-3 text-ink-soft">
        이용자는 언제든 개인정보 열람, 정정·삭제, 처리정지, 동의 철회를 요구할 수 있습니다. 리포트 화면 맨 아래의
        &quot;탈퇴하고 내 정보 지우기&quot;로 모든 정보를 바로 지울 수 있고, 그 밖의 요구는 아래 이메일로 보내면 법령이 정한
        기간 안에 조치하고 결과를 알립니다.
      </p>

      <H>6. 안전성 확보조치</H>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-soft">
        <li>개인정보 접근 권한을 운영자 본인으로 제한</li>
        <li>데이터베이스 행 단위 접근 제어(RLS)로 본인 정보만 조회</li>
        <li>전 구간 HTTPS 전송</li>
        <li>친구 평가는 3명 이상 모였을 때 평균만 보여주고 개별 응답은 공개하지 않음</li>
      </ul>

      <H>7. 쿠키</H>
      <p className="mt-3 text-ink-soft">
        로그인 유지를 위한 쿠키만 쓰며, 맞춤형 광고나 행태정보 수집은 하지 않습니다. 브라우저 설정에서 쿠키를 거부할 수
        있지만, 거부하면 로그인이 유지되지 않습니다.
      </p>

      <H>8. 개인정보 보호책임자</H>
      <p className="mt-3 text-ink-soft">성명 최현석(대표), 이메일 testwelltest01@gmail.com</p>

      <H>9. 권익침해 구제</H>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-soft">
        <li>개인정보분쟁조정위원회: 1833-6972, www.kopico.go.kr</li>
        <li>개인정보침해신고센터: 국번 없이 118, privacy.kisa.or.kr</li>
        <li>대검찰청: 국번 없이 1301</li>
        <li>경찰청: 국번 없이 182</li>
      </ul>

      <H>10. 시행일</H>
      <p className="mt-3 text-ink-soft">이 처리방침은 2026년 10월 17일부터 적용합니다. 내용이 바뀌면 시행 7일 전에 알립니다.</p>
    </Shell>
  );
}
