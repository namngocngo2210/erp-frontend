import type { ProductTrouble } from "../../product-types";

import { Section } from "./Section";

export function TroubleshootTable({ items }: { items: ProductTrouble[] }) {
  if (items.length === 0) return null;
  return (
    <Section title="Xử lý sự cố">
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">{item.symptom}</p>
            {item.cause ? (
              <p className="mt-1.5 text-sm whitespace-pre-line text-slate-500">
                Nguyên nhân: {item.cause}
              </p>
            ) : null}
            {item.fix ? (
              <p className="mt-1 text-sm whitespace-pre-line text-emerald-700">
                Cách xử lý: {item.fix}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </Section>
  );
}
