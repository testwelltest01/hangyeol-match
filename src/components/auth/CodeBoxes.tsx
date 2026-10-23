"use client";

import { useEffect, useRef } from "react";

/** 이메일 인증 코드 자릿수. Supabase Auth 설정(이메일 OTP 길이, 6~10자리만 가능)과 같아야 한다 */
export const OTP_LENGTH = 6;

/**
 * 인증 코드를 칸마다 한 숫자씩 보여주는 입력. 실제 입력칸은 하나라서(칸 위에 투명하게 덮음)
 * 붙여넣기와 메일 코드 자동 채우기(one-time-code)가 그대로 된다. 다 채우면 onComplete
 */
export function CodeBoxes({
  value,
  onChange,
  onComplete,
  disabled = false,
  id = "email-code",
  label = "인증 코드",
  autoFocus = true,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete: (v: string) => void;
  disabled?: boolean;
  id?: string;
  label?: string;
  /** false면 처음에는 포커스를 주지 않는다(다른 입력이 있는 화면). 한 번 쓰기 시작한 뒤 비워지면 다시 포커스 */
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const typed = useRef(false);
  const active = Math.min(value.length, OTP_LENGTH - 1);

  // 틀려서 비워졌거나 확인이 끝나 다시 쓸 수 있게 되면 바로 이어서 칠 수 있게
  useEffect(() => {
    if (value) typed.current = true;
    else if (!disabled && (autoFocus || typed.current)) ref.current?.focus();
  }, [disabled, value, autoFocus]);

  return (
    // 입력칸에 포커스가 있을 때만 지금 칠 칸을 강조한다 (group-focus-within)
    <div className="group relative" onClick={() => ref.current?.focus()}>
      <div aria-hidden className="grid grid-cols-6 gap-2">
        {Array.from({ length: OTP_LENGTH }, (_, i) => {
          const digit = value[i] ?? "";
          const here = i === active;
          return (
            <span
              key={i}
              className={`flex h-14 items-center justify-center rounded-xl bg-surface font-serif text-[1.6rem] font-bold text-ink transition-shadow ${
                digit ? "ring-1 ring-ink/30" : "ring-1 ring-line"
              } ${here ? "group-focus-within:ring-2 group-focus-within:ring-primary" : ""}`}
            >
              {digit ||
                (here ? <span className="hidden h-6 w-0.5 animate-pulse rounded-full bg-primary group-focus-within:block motion-reduce:animate-none" /> : null)}
            </span>
          );
        })}
      </div>
      <input
        ref={ref}
        id={id}
        aria-label={`${label} ${OTP_LENGTH}자리`}
        required
        autoFocus={autoFocus}
        autoComplete="one-time-code"
        inputMode="numeric"
        pattern={`[0-9]{${OTP_LENGTH}}`}
        disabled={disabled}
        value={value}
        // maxLength는 두지 않는다: "123 456"처럼 띄어 쓴 코드를 붙여넣으면 숫자가 잘린다. 숫자만 골라 6자리로 자른다
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH);
          onChange(next);
          if (next.length === OTP_LENGTH && next !== value) onComplete(next);
        }}
        // 글자와 커서는 숨기고 칸이 대신 보여준다. 글자 크기 16px 이상이라 iPhone이 확대하지 않는다
        className="absolute inset-0 h-full w-full bg-transparent text-base text-transparent caret-transparent outline-none selection:bg-transparent"
        // 전역 :focus-visible 테두리 대신 지금 칠 칸의 강조로 포커스를 보여준다
        style={{ outline: "none" }}
      />
    </div>
  );
}
