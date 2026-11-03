import { BadgeCheck } from "lucide-react";

import type { ProductPageResponse } from "../../product-types";

import { AudienceNote } from "./AudienceNote";
import { CompanyFooter } from "./CompanyFooter";
import { FaqAccordion } from "./FaqAccordion";
import { HighlightList } from "./HighlightList";
import { InlineActivateBlock } from "./InlineActivateBlock";
import { ProductGallery } from "./ProductGallery";
import { SpecTable } from "./SpecTable";
import { TroubleshootTable } from "./TroubleshootTable";
import { UsageSteps } from "./UsageSteps";
import { VideoLinks } from "./VideoLinks";
import { formatDateVi } from "@/lib/format";

/**
 * Thân trang `/sp/<mã>`, tách khỏi `ProductScanPage` để màn "Xem trước" trong
 * CRM dựng lại đúng thứ khách nhìn thấy thay vì vẽ một bản mô phỏng thứ hai —
 * bản mô phỏng sẽ lệch dần khỏi trang thật mà không ai phát hiện, và biên tập
 * viên thì tin nó.
 *
 * `ProductScanPage` giữ phần vỏ (meta noindex, tra mã, trạng thái tải/lỗi);
 * component này chỉ nhận dữ liệu đã có và render.
 */
export function ProductPageView({
  data,
  canActivate = true,
}: {
  data: ProductPageResponse;
  /**
   * `false` cho màn xem trước trong CRM: khối kích hoạt vẫn hiện đúng bố cục
   * nhưng bị `inert` nên không gõ/không submit được. Nếu để nguyên, một cú bấm
   * nhầm trong lúc xem trước sẽ kích hoạt bảo hành THẬT cho mã mẫu.
   */
  canActivate?: boolean;
}) {
  const scannedAt = data.scan.first_at ? formatDateVi(data.scan.first_at) : null;

  return (
    <>
      <header className="py-5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
          <BadgeCheck className="size-4" aria-hidden />
          Sản phẩm chính hãng Delax
        </span>
        <p className="mt-2 font-mono text-lg tracking-widest text-slate-700">{data.serial}</p>
        <p className="text-xs text-slate-500">
          Đã quét {data.scan.count} lần
          {scannedAt ? ` · lần đầu ${scannedAt}` : ""}
        </p>
      </header>

      {data.product === null ? (
        <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          Sản phẩm đã được xác thực. Chúng tôi đang cập nhật thông tin chi tiết cho mã này.
        </p>
      ) : (
        <>
          <ProductGallery images={data.product.images} />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">{data.product.name}</h1>
          {data.product.short_description ? (
            <p className="mt-1 text-sm whitespace-pre-line text-slate-600">
              {data.product.short_description}
            </p>
          ) : null}
          <HighlightList items={data.product.highlights} />
          <SpecTable items={data.product.specs} />
          <AudienceNote audience={data.product.audience} />
          <UsageSteps items={data.product.usage_steps} />
          <TroubleshootTable items={data.product.troubleshooting} />
          <FaqAccordion items={data.product.faqs} />
          <VideoLinks items={data.product.videos} />
        </>
      )}

      {canActivate ? (
        <InlineActivateBlock code={data.code} warranty={data.warranty} />
      ) : (
        <div inert>
          <InlineActivateBlock code={data.code} warranty={data.warranty} />
        </div>
      )}

      <CompanyFooter company={data.company} />
    </>
  );
}
