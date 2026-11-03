import { useMemo } from "react";

import { SearchableSelect } from "@/components/ui/searchable-select";
import { useAllProductOptions } from "@/features/products/queries";
import { useI18n } from "@/i18n";

type DigitalProductFilterProps = {
  value: string;
  onChange: (value: string) => void;
  id: string;
};

/**
 * Ô lọc sản phẩm của 2 tab digital. Rỗng = "Tất cả sản phẩm" (số y hệt trước khi có
 * bộ lọc này).
 *
 * Dùng `useAllProductOptions` chứ KHÔNG phải endpoint catalog mặc định: endpoint đó
 * chỉ nạp 1.000 SP đầu nên mọi SKU xếp sau (TMS*…) sẽ tìm không ra.
 */
export function DigitalProductFilter({ value, onChange, id }: DigitalProductFilterProps) {
  const { t } = useI18n();
  const productsQuery = useAllProductOptions(true);
  const options = useMemo(
    () =>
      (productsQuery.data ?? []).map((product) => ({
        value: String(product.id),
        label: product.sku || product.name,
        keywords: product.name,
      })),
    [productsQuery.data],
  );

  return (
    <div className="flex flex-col gap-1">
      {/* SearchableSelect không nhận prop `id`; dùng id cho vùng bọc để label vẫn
          trỏ đúng ô khi có 2 bộ lọc sản phẩm trên cùng trang. */}
      <span id={id} className="text-xs font-medium text-muted-foreground">
        {t("adsReport.productFilterLabel", "Sản phẩm")}
      </span>
      <SearchableSelect
        options={options}
        value={value}
        onChange={onChange}
        placeholder={t("adsReport.allProducts", "Tất cả sản phẩm")}
        className="w-full sm:w-72"
      />
    </div>
  );
}

/**
 * Dòng chú thích dưới bảng: phần chi phí chưa quy được về sản phẩm nào.
 *
 * CỐ Ý là dòng chú thích chứ không phải một dòng của bảng: mỗi dòng trong bảng là một
 * KÊNH và các kênh đã cộng đủ thành tổng, thêm một dòng nữa vào đó là cộng trùng.
 * Chỉ hiện ở chế độ "Tất cả sản phẩm" — khi đã lọc 1 SP thì con số này vô nghĩa.
 */
export function UnassignedCostNote({
  totalCost,
  assignedCost,
  formatCurrency,
}: {
  totalCost: number;
  assignedCost: string | undefined;
  formatCurrency: (value: number) => string;
}) {
  if (assignedCost === undefined) return null;
  const unassigned = totalCost - Number(assignedCost);
  if (!(unassigned > 0)) return null;
  const share = totalCost > 0 ? (unassigned / totalCost) * 100 : 0;

  return (
    <p className="mt-3 text-xs text-muted-foreground">
      Trong tổng chi phí có{" "}
      <span className="font-semibold text-foreground tabular-nums">
        {formatCurrency(unassigned)}
      </span>{" "}
      ({share.toFixed(1)}%) chưa gán được về sản phẩm nào — gán ở tab &quot;Gán sản phẩm&quot; để
      con số này về 0.
    </p>
  );
}
