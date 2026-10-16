"use client";

import { useState } from "react";
import { PROVINCES, provinceOf, regionKey } from "@/lib/regions";
import { fieldClass } from "@/components/ui";

/** 시·도를 먼저 고르고 시·군·구를 고르는 두 칸짜리 선택 */
export function RegionSelect({ name, defaultValue }: { name: string; defaultValue?: string }) {
  const [province, setProvince] = useState(defaultValue ? provinceOf(defaultValue) : "");
  const [value, setValue] = useState(defaultValue ?? "");
  const districts = PROVINCES.find((p) => p.id === province)?.districts ?? [];

  return (
    <div className="grid grid-cols-2 gap-3">
      <input type="hidden" name={name} value={value} />
      <select
        aria-label="시·도"
        value={province}
        onChange={(e) => {
          setProvince(e.target.value);
          const p = PROVINCES.find((x) => x.id === e.target.value);
          setValue(p && p.districts.length === 1 ? regionKey(p.id, p.districts[0]) : "");
        }}
        className={fieldClass}
      >
        <option value="" disabled>
          시·도
        </option>
        {PROVINCES.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <select
        aria-label="시·군·구"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={!province}
        className={fieldClass}
      >
        <option value="" disabled>
          시·군·구
        </option>
        {districts.map((d) => (
          <option key={d} value={regionKey(province, d)}>
            {d}
          </option>
        ))}
      </select>
    </div>
  );
}
