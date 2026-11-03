import { memo } from "react";
import { ERow } from "@/features/orders/order-detail-shared";
import { AiFilledBadge, type AiFilledMap } from "@/features/orders/components/AiFilledBadge";
import { MultiSelect } from "@/components/ui/multi-select";

export type DynamicFieldDef = {
  code: string;
  label: string;
  kind: "single_choice" | "multi_choice" | "text" | "number" | "bool";
  options: Array<{ code: string; label: string }>;
  sort_order: number;
};

export type DynamicFieldValue = string | string[] | number | boolean | null;

const BOOL_OPTIONS = [
  { value: "yes", label: "Có" },
  { value: "no", label: "Không" },
];

// Render section các trường đánh giá động (định nghĩa trong assessment_field_defs,
// backend Task 1-6). Mỗi def render 1 row theo `kind`, tái dùng ERow/SectionCard
// pattern sẵn có của BlockCrmRating. Code mồ côi (không còn trong `options` do bị
// xoá khỏi catalog) vẫn hiển thị raw code thay vì crash hay ẩn đi.
function DynamicAssessmentFieldsImpl({
  defs,
  values,
  aiFilled,
  onPatch,
}: {
  defs: DynamicFieldDef[];
  values: Record<string, DynamicFieldValue>;
  aiFilled?: AiFilledMap;
  onPatch: (code: string, value: DynamicFieldValue) => void;
}) {
  if (defs.length === 0) return null;
  const sorted = [...defs].sort((a, b) => a.sort_order - b.sort_order);
  return (
    <>
      {sorted.map((def) => {
        const value = values[def.code];
        const badge = <AiFilledBadge info={aiFilled?.[def.code]} />;

        if (def.kind === "single_choice") {
          const opts = def.options.map((o) => ({ value: o.code, label: o.label }));
          const current = typeof value === "string" ? value : "";
          return (
            <ERow
              key={def.code}
              label={def.label}
              labelAdornment={badge}
              rawValue={current}
              display={
                <span className="text-sm font-medium">
                  {opts.find((o) => o.value === current)?.label || current || "—"}
                </span>
              }
              type="select"
              options={opts}
              onSave={(v) => onPatch(def.code, v ? String(v) : null)}
            />
          );
        }

        if (def.kind === "multi_choice") {
          const opts = def.options.map((o) => ({ value: o.code, label: o.label }));
          const codes = Array.isArray(value) ? value : [];
          // Code mồ côi (đã bị xoá khỏi catalog) vẫn phải hiện được — thêm option
          // tổng hợp dùng chính code làm label thay vì để MultiSelect âm thầm bỏ qua.
          const orphanOpts = codes
            .filter((c) => !opts.some((o) => o.value === c))
            .map((c) => ({ value: c, label: c }));
          return (
            <div key={def.code} className="py-2 border-b border-border/40">
              <span className="mb-2 block text-sm text-muted-foreground">
                {def.label}
                {badge}
              </span>
              <MultiSelect
                options={[...opts, ...orphanOpts]}
                selected={codes}
                onChange={(values) => onPatch(def.code, values)}
                placeholder="Chọn một hoặc nhiều"
                menuPortal
              />
            </div>
          );
        }

        if (def.kind === "bool") {
          const current = value == null ? "" : value ? "yes" : "no";
          return (
            <ERow
              key={def.code}
              label={def.label}
              labelAdornment={badge}
              rawValue={current}
              display={
                <span className="text-sm font-medium">
                  {value == null ? "—" : value ? "Có" : "Không"}
                </span>
              }
              type="select"
              options={BOOL_OPTIONS}
              onSave={(v) => onPatch(def.code, v === "yes" ? true : v === "no" ? false : null)}
            />
          );
        }

        if (def.kind === "number") {
          const current = value == null ? "" : String(value);
          return (
            <ERow
              key={def.code}
              label={def.label}
              labelAdornment={badge}
              rawValue={current}
              onSave={(v) => {
                const trimmed = String(v).trim();
                const parsed = Number(trimmed);
                onPatch(def.code, trimmed === "" || Number.isNaN(parsed) ? null : parsed);
              }}
            />
          );
        }

        // text
        return (
          <ERow
            key={def.code}
            label={def.label}
            labelAdornment={badge}
            rawValue={typeof value === "string" ? value : ""}
            onSave={(v) => onPatch(def.code, String(v) || null)}
          />
        );
      })}
    </>
  );
}

export const DynamicAssessmentFields = memo(DynamicAssessmentFieldsImpl);
