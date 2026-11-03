import { useMemo, useState } from "react";
import { NativeCellSelect } from "@/components/ui/native-cell-select";

// Multi-select inline cell — render comma-list khi không edit; double-click để
// mở native <select multiple>. Đơn giản nhưng đủ dùng, không cần kéo thêm
// dependency mới.
export function MultiSelectCell({
  values,
  options,
  canEdit,
  onChange,
}: {
  values: string[];
  options: Array<{ value: string; label: string }>;
  canEdit: boolean;
  onChange: (next: string[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const labels = useMemo(() => {
    const labelByValue = new Map(options.map((o) => [o.value, o.label]));
    return values.map((v) => labelByValue.get(v) ?? v).filter(Boolean);
  }, [values, options]);

  if (!editing) {
    return (
      <button
        type="button"
        className="block w-full max-w-[280px] truncate rounded border border-transparent px-1 py-0.5 text-left text-xs hover:border-border"
        title={labels.join(", ")}
        disabled={!canEdit}
        onClick={(e) => {
          e.stopPropagation();
          if (canEdit) setEditing(true);
        }}
      >
        {labels.length > 0 ? labels.join(", ") : "-"}
      </button>
    );
  }

  return (
    <NativeCellSelect
      multiple
      className="h-24 min-w-[140px] cursor-default"
      value={values}
      autoFocus
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onBlur={() => setEditing(false)}
      onChange={(e) => {
        const next = Array.from(e.target.selectedOptions).map((opt) => opt.value);
        onChange(next);
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </NativeCellSelect>
  );
}
