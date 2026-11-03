import type { ProductAudience } from "../../product-types";

import { Section } from "./Section";

/** Danh sách "cần hỏi ý kiến bác sĩ" là nội dung an toàn y tế (mang thai, máy
 * trợ tim, vết thương hở...) — không bao giờ được lược bỏ âm thầm, phải luôn
 * hiện khi có dữ liệu, tách rõ khỏi nhóm "phù hợp với". */
export function AudienceNote({ audience }: { audience: ProductAudience }) {
  const suitable = audience.suitable ?? [];
  const caution = audience.caution ?? [];
  if (suitable.length === 0 && caution.length === 0) return null;

  return (
    <Section title="Đối tượng sử dụng">
      <div className="grid gap-3 sm:grid-cols-2">
        {suitable.length > 0 ? (
          <div className="rounded-xl bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-800">Phù hợp với</p>
            <ul className="mt-2 space-y-1.5 text-sm text-emerald-900/80">
              {suitable.map((text, index) => (
                <li key={index}>· {text}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {caution.length > 0 ? (
          <div className="rounded-xl bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">
              Cần hỏi ý kiến bác sĩ trước khi dùng
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-amber-900/80">
              {caution.map((text, index) => (
                <li key={index}>· {text}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Section>
  );
}
