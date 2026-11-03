import { ChevronDown } from "lucide-react";
import { useState } from "react";

import type { ProductFaq } from "../../product-types";

import { Section } from "./Section";

export function FaqAccordion({ items }: { items: ProductFaq[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  if (items.length === 0) return null;

  return (
    <Section title="Câu hỏi thường gặp">
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {items.map((item, index) => (
          <div key={index}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-slate-900"
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              aria-expanded={openIndex === index}
            >
              {item.question}
              <ChevronDown
                className={`size-4 shrink-0 transition ${openIndex === index ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
            {openIndex === index ? (
              <p className="px-4 pb-3 text-sm whitespace-pre-line text-slate-600">{item.answer}</p>
            ) : null}
          </div>
        ))}
      </div>
    </Section>
  );
}
