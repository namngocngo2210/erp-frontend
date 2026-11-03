import type { ProductSpec } from "../../product-types";

import { Section } from "./Section";

export function SpecTable({ items }: { items: ProductSpec[] }) {
  if (items.length === 0) return null;
  return (
    <Section title="Thông số kỹ thuật">
      <dl className="divide-y divide-slate-100 rounded-xl bg-slate-50/60">
        {items.map((item, index) => (
          <div key={index} className="flex gap-4 px-4 py-2.5 text-sm">
            <dt className="w-2/5 shrink-0 text-slate-500">{item.label}</dt>
            <dd className="font-medium text-slate-900">{item.value}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
