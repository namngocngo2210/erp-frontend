import type { ProductUsageStep } from "../../product-types";

import { Section } from "./Section";

export function UsageSteps({ items }: { items: ProductUsageStep[] }) {
  if (items.length === 0) return null;
  return (
    <Section title="Hướng dẫn sử dụng">
      <ol className="space-y-4">
        {items.map((item, index) => (
          <li key={index} className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {index + 1}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="mt-0.5 text-sm whitespace-pre-line text-slate-600">{item.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}
