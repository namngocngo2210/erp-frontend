type Option = { id: number; label: string };

type Props = {
  idPrefix: string;
  options: Option[];
  selected: number[];
  onChange: (next: number[]) => void;
  emptyText?: string;
};

/**
 * Multi-select bằng checkbox (không phụ thuộc shadcn primitive vắng mặt).
 * Dùng cho gán nhiều phòng ban / nhiều role cho user.
 */
export function MultiSelectCheckboxes({ idPrefix, options, selected, onChange, emptyText }: Props) {
  const toggle = (id: number) => {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  if (options.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText ?? "—"}</p>;
  }

  return (
    <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
      {options.map((opt) => {
        const inputId = `${idPrefix}-${opt.id}`;
        return (
          <label key={opt.id} htmlFor={inputId} className="flex items-center gap-2 text-sm">
            <input
              id={inputId}
              type="checkbox"
              checked={selected.includes(opt.id)}
              onChange={() => toggle(opt.id)}
            />
            <span>{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}
