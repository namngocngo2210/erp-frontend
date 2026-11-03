import { PlayCircle } from "lucide-react";

import type { ProductVideo } from "../../product-types";

import { Section } from "./Section";

/** `target="_blank"` luôn kèm `rel="noopener noreferrer"` — trang đã tự gắn
 * meta `no-referrer` để mã bảo hành trong URL không rò sang YouTube qua
 * header Referer, `rel` này là lớp phòng thủ thứ hai ở chính thẻ `<a>`. */
export function VideoLinks({ items }: { items: ProductVideo[] }) {
  if (items.length === 0) return null;
  return (
    <Section title="Video hướng dẫn">
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index}>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-emerald-700 underline-offset-2 hover:underline"
            >
              <PlayCircle className="size-4" aria-hidden />
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </Section>
  );
}
