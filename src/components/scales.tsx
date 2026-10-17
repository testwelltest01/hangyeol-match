"use client";

import type { BipolarItem, ImportanceItem, LikertItem, Option, SingleItem } from "@/lib/items";
import { IMPORTANCE_OPTIONS, LIKERT_OPTIONS } from "@/lib/items";

type ValueProps<T> = { value: T | undefined; onChange: (v: T) => void };

const BIPOLAR_SIZES = [38, 30, 22, 22, 30, 38];
const BIPOLAR_LABELS = [
  "위 문장에 매우 가까움",
  "위 문장에 가까움",
  "위 문장에 약간 가까움",
  "아래 문장에 약간 가까움",
  "아래 문장에 가까움",
  "아래 문장에 매우 가까움",
];

/**
 * 양극 문항: 위 문장과 아래 문장 사이에 6개의 구슬이 한 줄로 놓인다.
 * 바깥쪽 구슬일수록 크게 그려서 "얼마나 가까운지"가 손끝에서 느껴지게 한다.
 */
export function BipolarScale({ item, value, onChange }: { item: BipolarItem } & ValueProps<number>) {
  return (
    <fieldset>
      <legend className="sr-only">
        {item.left} / {item.right}
      </legend>
      <p className="max-w-[28ch] font-serif text-[1.15rem] leading-snug text-ink">{item.left}</p>
      <div className="relative my-5 flex items-center justify-between px-1">
        <span aria-hidden className="absolute inset-x-3 top-1/2 h-px -translate-y-1/2 bg-line" />
        {BIPOLAR_SIZES.map((size, i) => {
          const v = i + 1;
          const selected = value === v;
          return (
            <label key={v} className="relative z-10 flex h-12 w-12 cursor-pointer items-center justify-center">
              <input
                type="radio"
                name={item.id}
                value={v}
                checked={selected}
                onChange={() => onChange(v)}
                aria-label={BIPOLAR_LABELS[i]}
                className="peer sr-only"
              />
              <span
                style={{ width: size, height: size }}
                className={`block rounded-full border-2 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo ${
                  selected ? "border-indigo bg-indigo" : "border-ink-soft/40 bg-paper hover:border-indigo"
                }`}
              />
            </label>
          );
        })}
      </div>
      <p className="ml-auto max-w-[28ch] text-right font-serif text-[1.15rem] leading-snug text-ink">{item.right}</p>
    </fieldset>
  );
}

/** 성격 문항: 같은 크기 구슬 5개, 양 끝에만 글자를 붙인다. */
export function LikertScale({
  text,
  name,
  value,
  onChange,
  options = LIKERT_OPTIONS,
}: { text: string; name: string; options?: Option[] } & ValueProps<number>) {
  return (
    <fieldset>
      <legend className="font-serif text-[1.1rem] leading-snug text-ink">{text}</legend>
      <div className="relative mt-4 flex items-center justify-between">
        <span aria-hidden className="absolute inset-x-5 top-1/2 h-px -translate-y-1/2 bg-line" />
        {options.map((o) => {
          const selected = value === o.value;
          return (
            <label key={o.value} className="relative z-10 flex h-11 w-11 cursor-pointer items-center justify-center">
              <input
                type="radio"
                name={name}
                checked={selected}
                onChange={() => onChange(o.value as number)}
                aria-label={o.label}
                className="peer sr-only"
              />
              <span
                className={`block h-7 w-7 rounded-full border-2 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo ${
                  selected ? "border-indigo bg-indigo" : "border-ink-soft/40 bg-paper hover:border-indigo"
                }`}
              />
            </label>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted">
        <span>{options[0].label}</span>
        <span>{options[options.length - 1].label}</span>
      </div>
    </fieldset>
  );
}

/** 선택지 목록. 선택지가 짧으면 한 줄 격자로, 길면 세로로 놓는다. */
export function ChoiceGroup({
  name,
  question,
  options,
  optional,
  value,
  onChange,
}: {
  name: string;
  question: string;
  options: Option[];
  optional?: boolean;
} & ValueProps<number | string>) {
  const compact = options.length <= 5 && options.every((o) => o.label.length <= 6);
  const cols =
    !compact ? "grid-cols-1" : options.length === 4 ? "grid-cols-2 sm:grid-cols-4" : options.length === 5 ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-3";

  return (
    <fieldset>
      <legend className="font-serif text-[1.1rem] leading-snug text-ink">
        {question}
        {optional && <span className="ml-2 font-sans text-sm text-muted">선택</span>}
      </legend>
      <div className={`mt-3 grid gap-2 ${cols}`}>
        {options.map((o) => {
          const selected = value === o.value;
          return (
            <label key={String(o.value)} className="cursor-pointer">
              <input
                type="radio"
                name={name}
                checked={selected}
                onChange={() => onChange(o.value)}
                className="peer sr-only"
              />
              <span
                className={`block rounded-xl border px-3 py-3 text-[15px] transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo ${
                  compact ? "text-center" : ""
                } ${selected ? "border-indigo bg-mist font-semibold text-ink" : "border-line bg-surface text-ink-soft hover:border-indigo"}`}
              >
                {o.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function SingleQuestion({ item, value, onChange }: { item: SingleItem } & ValueProps<number | string>) {
  return (
    <ChoiceGroup
      name={item.id}
      question={item.question}
      options={item.options}
      optional={!item.required}
      value={value}
      onChange={onChange}
    />
  );
}

export function ImportanceQuestion({ item, value, onChange }: { item: ImportanceItem } & ValueProps<number>) {
  return (
    <div className="rounded-2xl bg-mist px-4 py-5">
      <ChoiceGroup
        name={item.id}
        question={item.text}
        options={IMPORTANCE_OPTIONS}
        value={value}
        onChange={(v) => onChange(v as number)}
      />
    </div>
  );
}

export function LikertQuestion({ item, value, onChange }: { item: LikertItem } & ValueProps<number>) {
  return <LikertScale name={item.id} text={item.text} value={value} onChange={onChange} />;
}
