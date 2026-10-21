"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { PrimaryButton } from "@/components/buttons";
import { ErrorText, fieldClass } from "@/components/ui";
import {
  HEIGHT_TOLERANCE,
  MAX_AGE,
  MIN_AGE,
  RELIGION_LABEL,
  RELIGIONS,
  type Filters,
  type Religion,
} from "@/lib/match/filters";
import { PROVINCES, provinceKeys, regionKey, regionLabel } from "@/lib/regions";
import { countMatches, saveFilters } from "../actions";

const AGES = Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => MIN_AGE + i);
const HEIGHTS = Array.from({ length: 61 }, (_, i) => 140 + i);

function StrictToggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={`${label} 조건 강도`} className="inline-flex rounded-full border border-line bg-surface p-0.5 text-sm">
      {[
        { v: true, text: "꼭" },
        { v: false, text: "되도록" },
      ].map((o) => (
        <button
          key={o.text}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={`rounded-full px-3.5 py-1.5 ${value === o.v ? "bg-primary font-semibold text-white" : "text-muted"}`}
        >
          {o.text}
        </button>
      ))}
    </div>
  );
}

function Section({ title, toggle, children }: { title: string; toggle?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {toggle}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Radio<T extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((o) => (
        <label key={o.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 has-[:checked]:border-indigo has-[:checked]:bg-mist">
          <input
            type="radio"
            name={name}
            checked={value === o.id}
            onChange={() => onChange(o.id)}
            className="h-4 w-4 accent-[var(--color-indigo)]"
          />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}

/** 시·도별로 펼쳐서 시·군·구를 여러 개 고른다 */
function RegionMulti({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const selected = new Set(value);
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(PROVINCES.filter((p) => provinceKeys(p.id).some((k) => selected.has(k))).map((p) => p.id)),
  );

  function toggleKeys(keys: string[], on: boolean) {
    const next = new Set(selected);
    for (const k of keys) {
      if (on) next.add(k);
      else next.delete(k);
    }
    onChange([...next]);
  }

  return (
    <div className="divide-y divide-line rounded-xl border border-line bg-surface">
      {PROVINCES.map((p) => {
        const keys = provinceKeys(p.id);
        const count = keys.filter((k) => selected.has(k)).length;
        const all = count === keys.length;
        const isOpen = open.has(p.id);
        return (
          <div key={p.id}>
            <div className="flex items-center gap-3 px-4 py-3">
              <input
                type="checkbox"
                aria-label={`${p.label} 전체`}
                checked={all}
                ref={(el) => {
                  if (el) el.indeterminate = count > 0 && !all;
                }}
                onChange={(e) => toggleKeys(keys, e.target.checked)}
                className="h-5 w-5 accent-[var(--color-indigo)]"
              />
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => {
                  const next = new Set(open);
                  if (isOpen) next.delete(p.id);
                  else next.add(p.id);
                  setOpen(next);
                }}
                className="flex flex-1 items-center justify-between text-left"
              >
                <span className={count ? "font-semibold" : ""}>{p.label}</span>
                <span className="text-sm text-muted">
                  {count ? `${count}/${keys.length}` : ""} {keys.length > 1 ? (isOpen ? "접기" : "펼치기") : ""}
                </span>
              </button>
            </div>
            {isOpen && keys.length > 1 && (
              <div className="flex flex-wrap gap-2 px-4 pb-4">
                {p.districts.map((d) => {
                  const k = regionKey(p.id, d);
                  const on = selected.has(k);
                  return (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleKeys([k], !on)}
                      className={`rounded-full border px-3 py-1.5 text-sm ${on ? "border-indigo bg-indigo text-white" : "border-line text-ink-soft"}`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function FiltersForm({
  initial,
  me,
  year,
  first,
}: {
  initial: Filters;
  me: { age: number; height: number; religion: Religion; region: string };
  year: number;
  first: boolean;
}) {
  const router = useRouter();
  const [f, setF] = useState<Filters>(initial);
  const [count, setCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const requestId = useRef(0);

  // 조건이 바뀌면 잠깐 기다렸다가 맞는 사람 수를 다시 센다
  useEffect(() => {
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      setCounting(true);
      const res = await countMatches(f);
      if (id !== requestId.current) return;
      setCounting(false);
      if ("count" in res) setCount(res.count);
    }, 450);
    return () => clearTimeout(timer);
  }, [f]);

  function update<K extends keyof Filters>(key: K, patch: Partial<Filters[K]>) {
    setSaved(false);
    setF((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveFilters(f);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (first) router.push(res.next);
      else setSaved(true);
    });
  }

  const birthYears = (age: number) => year - age;
  const outsideMine = !f.regions.list.includes(me.region);

  return (
    <div className="mt-8 space-y-8 pb-4">
      <Section title="나이" toggle={<StrictToggle label="나이" value={f.age.strict} onChange={(v) => update("age", { strict: v })} />}>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <select aria-label="최소 나이" value={f.age.min} onChange={(e) => update("age", { min: Number(e.target.value) })} className={`${fieldClass} mt-0`}>
            {AGES.filter((a) => a <= f.age.max).map((a) => (
              <option key={a} value={a}>
                {a}세
              </option>
            ))}
          </select>
          <span className="text-muted">~</span>
          <select aria-label="최대 나이" value={f.age.max} onChange={(e) => update("age", { max: Number(e.target.value) })} className={`${fieldClass} mt-0`}>
            {AGES.filter((a) => a >= f.age.min).map((a) => (
              <option key={a} value={a}>
                {a}세
              </option>
            ))}
          </select>
        </div>
        <p className="mt-2 text-sm text-muted">
          {birthYears(f.age.max)}~{birthYears(f.age.min)}년생 (올해 {me.age}세 기준, 출생연도로 계산해요)
        </p>
      </Section>

      <Section
        title="만날 수 있는 지역"
        toggle={<StrictToggle label="지역" value={f.regions.strict} onChange={(v) => update("regions", { strict: v })} />}
      >
        <p className="mb-3 text-sm text-muted">
          양쪽 모두 적용돼요. 상대가 고른 지역에도 내 지역({regionLabel(me.region)})이 들어 있어야 추천돼요.
        </p>
        <RegionMulti value={f.regions.list} onChange={(list) => update("regions", { list })} />
        <p className="mt-2 text-sm text-muted">{f.regions.list.length}곳 선택{outsideMine ? " · 내 지역이 빠져 있어요" : ""}</p>
      </Section>

      <Section
        title="키"
        toggle={
          f.height.mode !== "any" ? (
            <StrictToggle label="키" value={f.height.strict} onChange={(v) => update("height", { strict: v })} />
          ) : undefined
        }
      >
        <Radio
          name="height"
          value={f.height.mode}
          onChange={(mode) => update("height", { mode })}
          options={[
            { id: "any", label: "상관없음" },
            { id: "taller", label: `나보다 크면 좋음 (나: ${me.height}cm)` },
            { id: "shorter", label: `나보다 작으면 좋음 (나: ${me.height}cm)` },
            { id: "range", label: "직접 범위 정하기" },
          ]}
        />
        {f.height.mode === "range" && (
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <select aria-label="최소 키" value={f.height.min} onChange={(e) => update("height", { min: Number(e.target.value) })} className={`${fieldClass} mt-0`}>
              {HEIGHTS.filter((h) => h <= f.height.max).map((h) => (
                <option key={h} value={h}>
                  {h}cm
                </option>
              ))}
            </select>
            <span className="text-muted">~</span>
            <select aria-label="최대 키" value={f.height.max} onChange={(e) => update("height", { max: Number(e.target.value) })} className={`${fieldClass} mt-0`}>
              {HEIGHTS.filter((h) => h >= f.height.min).map((h) => (
                <option key={h} value={h}>
                  {h}cm
                </option>
              ))}
            </select>
          </div>
        )}
        {f.height.mode !== "any" && (
          <p className="mt-2 text-sm text-muted">스스로 적은 키라서 경계에 ±{HEIGHT_TOLERANCE}cm 여유를 두고 비교해요.</p>
        )}
      </Section>

      <Section
        title="흡연"
        toggle={
          f.smoking.mode !== "any" ? (
            <StrictToggle label="흡연" value={f.smoking.strict} onChange={(v) => update("smoking", { strict: v })} />
          ) : undefined
        }
      >
        <Radio
          name="smoking"
          value={f.smoking.mode}
          onChange={(mode) => update("smoking", { mode })}
          options={[
            { id: "any", label: "상관없음" },
            { id: "no_cigarette", label: "전자담배까지는 괜찮음" },
            { id: "none_only", label: "피우지 않는 사람만" },
          ]}
        />
      </Section>

      <Section
        title="음주"
        toggle={
          f.drinking.mode !== "any" ? (
            <StrictToggle label="음주" value={f.drinking.strict} onChange={(v) => update("drinking", { strict: v })} />
          ) : undefined
        }
      >
        <Radio
          name="drinking"
          value={f.drinking.mode}
          onChange={(mode) => update("drinking", { mode })}
          options={[
            { id: "any", label: "상관없음" },
            { id: "not_often", label: "주 3번 이상만 아니면 괜찮음" },
            { id: "rarely_or_less", label: "가끔(한 달에 1~2번) 이하로 마시는 사람" },
            { id: "none_only", label: "마시지 않는 사람만" },
          ]}
        />
      </Section>

      <Section
        title="결혼·자녀 생각"
        toggle={<StrictToggle label="결혼·자녀" value={f.family.strict} onChange={(v) => update("family", { strict: v })} />}
      >
        <p className="text-ink-soft">
          결혼이나 자녀에 대해 &quot;원함&quot;과 &quot;원하지 않음&quot;으로 생각이 정반대인 사람을 걸러요. &quot;아직 모르겠다&quot;는
          누구와도 걸리지 않아요.
        </p>
      </Section>

      <Section
        title="종교"
        toggle={
          f.religion.mode !== "any" ? (
            <StrictToggle label="종교" value={f.religion.strict} onChange={(v) => update("religion", { strict: v })} />
          ) : undefined
        }
      >
        <>
            <Radio
              name="religion"
              value={f.religion.mode}
              onChange={(mode) => update("religion", { mode })}
              options={[
                { id: "any", label: "상관없음" },
                { id: "same", label: `같은 종교만 (나: ${RELIGION_LABEL[me.religion]})` },
                { id: "specific", label: "특정 종교만 고르기" },
              ]}
            />
            {f.religion.mode === "specific" && (
              <div className="mt-3 flex flex-wrap gap-2">
                {RELIGIONS.map((r) => {
                  const on = f.religion.list.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        update("religion", { list: on ? f.religion.list.filter((x) => x !== r.id) : [...f.religion.list, r.id] })
                      }
                      className={`rounded-full border px-4 py-2 ${on ? "border-indigo bg-indigo text-white" : "border-line bg-surface text-ink-soft"}`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            )}
        </>
      </Section>

      <div className="sticky bottom-0 -mx-5 border-t border-line bg-paper/95 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur">
        <p className="mb-3 text-center text-[15px]" aria-live="polite">
          {count === null
            ? "조건에 맞는 사람을 세는 중이에요"
            : `지금 조건에 서로 맞는 사람 ${count}명${counting ? " · 다시 세는 중" : ""}`}
        </p>
        {count === 0 && (
          <p className="mb-3 text-center text-sm text-muted">매칭이 막 열려서 사람이 늘어나는 중이에요. 조건을 조금 넓히면 더 빨리 만날 수 있어요.</p>
        )}
        <ErrorText>{error}</ErrorText>
        {saved && <p className="mb-2 text-center text-moss">저장했어요.</p>}
        <PrimaryButton onClick={save} disabled={pending}>
          {pending ? "저장하는 중" : first ? "저장하고 사진 올리기" : "저장하기"}
        </PrimaryButton>
      </div>
    </div>
  );
}
