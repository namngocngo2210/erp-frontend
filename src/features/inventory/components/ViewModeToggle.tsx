export type ViewMode = "order" | "sku";

const OPTIONS: { key: ViewMode; label: string }[] = [
  { key: "order", label: "Theo đơn" },
  { key: "sku", label: "Theo SKU" },
];

export function ViewModeToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-border p-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={[
            "rounded px-3 py-1 text-sm transition-colors",
            value === o.key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
