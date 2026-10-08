"use client";

import { MAX_TAGS_PER_GROUP, TAG_GROUPS, TAG_GROUP_LABELS } from "@/lib/admin/candidateInput";
import type { CandidateTags, TagCatalog, TagGroup } from "@/lib/admin/types";

export function TagPicker({
  catalog,
  value,
  disabled,
  onChange,
}: {
  catalog: TagCatalog;
  value: CandidateTags;
  disabled: boolean;
  onChange: (next: CandidateTags) => void;
}) {
  function toggle(group: TagGroup, name: string) {
    const selected = value[group];
    if (!selected.includes(name) && selected.length >= MAX_TAGS_PER_GROUP) return;
    const next = selected.includes(name) ? selected.filter((item) => item !== name) : [...selected, name];
    onChange({ ...value, [group]: next });
  }

  return (
    <div className="space-y-4">
      {TAG_GROUPS.map((group) => (
        <fieldset key={group} disabled={disabled} className="min-w-0">
          <legend className="mb-2 text-xs font-medium text-[#f4f1ff]/60">
            {TAG_GROUP_LABELS[group]}
            {group !== "situations" && <span className="ml-1 text-[#ffd9a8]">*</span>}
            <span className="ml-2 text-[#f4f1ff]/40">{value[group].length}개 선택</span>
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {catalog[group].map((name) => {
              const active = value[group].includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggle(group, name)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors disabled:opacity-50 ${
                    active
                      ? "border-[#ffd9a8] bg-[#ffd9a8]/20 text-[#ffd9a8]"
                      : "border-white/15 text-[#f4f1ff]/75 hover:bg-white/10"
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
