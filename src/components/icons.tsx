// 한결 아이콘: 24px 격자, 1.75 선, 모서리 둥글게. 색은 글자색(currentColor)을 따른다.
import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number; strong?: boolean };

function Svg({ size = 22, strong = false, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strong ? 2.1 : 1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** 오늘의 추천: 반짝이는 별 */
export const IconToday = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z" />
    <path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
  </Svg>
);

export const IconHeart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 20s-7.2-4.5-9.1-8.8C1.6 8.1 3.6 4.8 7 4.8c2 0 3.4 1.1 5 2.9 1.6-1.8 3-2.9 5-2.9 3.4 0 5.4 3.3 4.1 6.4C19.2 15.5 12 20 12 20z" />
  </Svg>
);

export const IconChat = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 4.8h14a2 2 0 0 1 2 2v8.4a2 2 0 0 1-2 2h-8.5L6 20.6v-3.4H5a2 2 0 0 1-2-2V6.8a2 2 0 0 1 2-2z" />
    <path d="M8 10h8M8 13.2h5" />
  </Svg>
);

/** 내 결: 나란히 흐르는 결 세 줄 */
export const IconGrain = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 7.5c2.8-2 5.6 2 8.5 0s5.6-2 8.5 0" />
    <path d="M3.5 12c2.8-2 5.6 2 8.5 0s5.6-2 8.5 0" />
    <path d="M3.5 16.5c2.8-2 5.6 2 8.5 0s5.6-2 8.5 0" />
  </Svg>
);

export const IconUser = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8.2" r="3.7" />
    <path d="M4.5 20c1.3-3.6 4.2-5.4 7.5-5.4s6.2 1.8 7.5 5.4" />
  </Svg>
);

export const IconLetter = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
    <path d="M4.5 7l7.5 6 7.5-6" />
  </Svg>
);

export const IconBack = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.5 5.5L8 12l6.5 6.5" />
  </Svg>
);

export const IconChevron = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9.5 5.5L16 12l-6.5 6.5" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);

export const IconCamera = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 8h3l1.8-2.5h5.4L16.5 8h3a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <circle cx="12" cy="13.2" r="3.4" />
  </Svg>
);

export const IconSliders = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </Svg>
);

export const IconIdCard = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
    <circle cx="9" cy="11" r="2" />
    <path d="M6 15.5c.6-1.3 1.7-2 3-2s2.4.7 3 2M14.5 10h3M14.5 13h3" />
  </Svg>
);

export const IconLink = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3A4 4 0 0 0 13 5.3l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1" />
  </Svg>
);

export const IconFriends = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M3.5 19c1-3 3-4.6 5.5-4.6s4.5 1.6 5.5 4.6" />
    <path d="M15.5 5.6a3.2 3.2 0 0 1 0 6.1M17 14.6c1.8.5 3 1.9 3.6 4.4" />
  </Svg>
);

export const IconBrush = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <circle cx="9" cy="9.5" r="1.6" />
    <path d="M20.5 15.5l-4.5-4.5-7.5 8.5" />
  </Svg>
);

export const IconPause = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M10 9v6M14 9v6" />
  </Svg>
);

export const IconLock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="2" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </Svg>
);

export const IconDoc = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 3.5h7l4 4v13H7a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 7 3.5z" />
    <path d="M13.5 3.5V8H18M9 12h6M9 15.5h6" />
  </Svg>
);

export const IconExit = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4.5H6.5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1H14" />
    <path d="M10.5 12h10M17 8.5l3.5 3.5-3.5 3.5" />
  </Svg>
);

export const IconPlay = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M10.3 8.8l5 3.2-5 3.2z" />
  </Svg>
);

export const IconMoon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z" />
  </Svg>
);

// --- 관리자 화면 ---

export const IconGrid = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="7" height="7" rx="1.5" />
    <rect x="13" y="4" width="7" height="4.5" rx="1.5" />
    <rect x="13" y="10.5" width="7" height="9.5" rx="1.5" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" />
  </Svg>
);

export const IconTrend = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 19.5h16" />
    <path d="M5 15.5l4.5-4.5 3.5 3 6-6.5" />
    <path d="M15.5 7.5H19V11" />
  </Svg>
);

/** LPA: 점들이 몇 무리로 모인 모양 */
export const IconClusters = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="7.5" cy="8" r="3" />
    <circle cx="16.5" cy="7" r="2.3" />
    <circle cx="12" cy="16.5" r="3.5" />
  </Svg>
);

export const IconFlask = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9.5 3.5h5M10 3.5v6L5 18.2a1.5 1.5 0 0 0 1.3 2.3h11.4a1.5 1.5 0 0 0 1.3-2.3L14 9.5v-6" />
    <path d="M7.5 14.5h9" />
  </Svg>
);

export const IconDownload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5" />
    <path d="M5 19.5h14" />
  </Svg>
);

export const IconExternal = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13.5 4.5h6v6M19.5 4.5L11 13" />
    <path d="M17.5 14v4.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1H10" />
  </Svg>
);

export const IconFlag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.5 20.5v-16M5.5 4.5h11l-2 4 2 4h-11" />
  </Svg>
);

/** 새로고침 쿠폰: 가운데가 접힌 티켓 */
export const IconTicket = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7.5a1.5 1.5 0 0 1 1.5-1.5h13A1.5 1.5 0 0 1 20 7.5v2a2.5 2.5 0 0 0 0 5v2a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5v-2a2.5 2.5 0 0 0 0-5z" />
    <path d="M14.5 6.5v2M14.5 11v2M14.5 15.5v2" />
  </Svg>
);
