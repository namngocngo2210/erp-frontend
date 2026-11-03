import { Check } from "lucide-react";

import type { ProductHighlight } from "../../product-types";

import { Section } from "./Section";

export function HighlightList({ items }: { items: ProductHighlight[] }) {
  if (items.length === 0) return null;
  return (
    <Section title="Điểm nổi bật">
      <ul className="space-y-3">
        {items.map((item, index) => (
          <li key={index} className="flex gap-3">
            <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              {item.detail ? (
                <p className="mt-0.5 text-sm whitespace-pre-line text-slate-600">{item.detail}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
