import { Search } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { formatCurrency } from "@/lib/format";
import { SEARCH_MIN_LENGTH, type CustomerSearchHit } from "@/lib/api/customer-profile";
import { useCustomerSearch } from "@/features/customer-profile/queries";
import { eraLabel } from "@/features/customer-profile/profile-labels";

/** Ô tìm khách của màn Hồ sơ 360.
 *
 * Danh sách gợi ý hiện luôn số đơn và tổng chi tiêu: với những cái tên trùng
 * nhau (rất nhiều trong 473k khách), tên một mình không đủ để chọn đúng người.
 */
export function CustomerSearchBox({
  onSelect,
  selectedId,
}: {
  onSelect: (hit: CustomerSearchHit) => void;
  selectedId: number | null;
}) {
  const [term, setTerm] = useState("");
  const { data: hits, isFetching } = useCustomerSearch(term);
  const tooShort = term.trim().length > 0 && term.trim().length < SEARCH_MIN_LENGTH;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Tìm theo tên, mã khách, hoặc số điện thoại"
          className="pl-9"
          aria-label="Tìm khách hàng"
        />
      </div>

      {tooShort && (
        <p className="text-xs text-muted-foreground">
          Nhập ít nhất {SEARCH_MIN_LENGTH} ký tự để tìm.
        </p>
      )}

      {isFetching && !hits && (
        <div className="flex justify-center py-4">
          <LogoSpinner />
        </div>
      )}

      {hits && hits.length === 0 && !tooShort && term.trim() && (
        <p className="text-sm text-muted-foreground">
          Không tìm thấy khách nào đã từng mua hàng khớp với &ldquo;{term.trim()}&rdquo;.
        </p>
      )}

      {hits && hits.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {hits.map((hit) => (
            <li key={hit.customer_id}>
              <button
                type="button"
                onClick={() => onSelect(hit)}
                aria-current={hit.customer_id === selectedId}
                className={
                  "flex w-full items-center justify-between gap-4 px-4 py-2.5 text-left text-sm hover:bg-accent" +
                  (hit.customer_id === selectedId ? " bg-accent" : "")
                }
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {hit.full_name || "(không có tên)"}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[hit.code, hit.segment_name, eraLabel(hit.era)].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="shrink-0 text-right text-xs text-muted-foreground">
                  <span className="block tabular-nums">{hit.orders_gtc} đơn</span>
                  <span className="block tabular-nums">
                    {formatCurrency(hit.total_spent, { style: "suffix" })}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
