import type { ReactNode } from "react";

/** Wrapper tiêu đề dùng chung cho các khối nội dung sản phẩm — mỗi khối tự
 * gọi (hoặc bỏ qua) `Section`, chưa bao giờ render tiêu đề nếu không có nội
 * dung (điều đó do component gọi tự kiểm tra trước, không phải `Section`). */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
