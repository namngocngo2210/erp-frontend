import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogoSpinnerOverlay } from "@/components/ui/logo-spinner";
import { PaginationPages } from "@/components/ui/pagination";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePermission } from "@/hooks/usePermission";
import { useI18n } from "@/i18n";
import { ClaimButton } from "@/features/floating-pool/components/ClaimButton";
import { FloatingPoolConfigDialog } from "@/features/floating-pool/components/FloatingPoolConfigDialog";
import {
  useClaimFloatingNumber,
  useFloatingPoolConfig,
  useFloatingPoolEntries,
} from "@/features/floating-pool/queries";
import { formatDateTimeVi } from "@/lib/format";

const PAGE_SIZE = 20;

export function FloatingPoolPage() {
  const { t } = useI18n();
  const can = usePermission();
  const canEdit = can("floating-pool:edit");
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [enteredFrom, setEnteredFrom] = useState("");
  const [enteredTo, setEnteredTo] = useState("");

  const params = useMemo(
    () => ({
      page,
      page_size: PAGE_SIZE,
      q: search,
      entered_from: enteredFrom,
      entered_to: enteredTo,
    }),
    [page, search, enteredFrom, enteredTo],
  );
  const { data, isLoading, isFetching } = useFloatingPoolEntries(params);
  const { data: config } = useFloatingPoolConfig();
  const claim = useClaimFloatingNumber();

  const quotaExhausted =
    !!data && data.daily_claim_limit > 0 && data.claimed_today >= data.daily_claim_limit;
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const runSearch = () => {
    setSearch(q);
    setPage(1);
  };

  const handleClaim = (entryId: number) => {
    claim.mutate(entryId, {
      onSuccess: (_resp) => {
        toast.success(
          t("floatingPool.toast.claimed", "Đã nhặt số về. Mở trang Đơn hàng để chăm sóc."),
        );
      },
      onError: (err: unknown) => {
        // fetchJson ném Error(message) với message đã lấy từ `detail` của response
        // (buildHttpErrorMessage trong services/http.ts), nên err.message ở đây
        // CHÍNH LÀ text lỗi 409 "Số đã có người nhặt" backend trả về — hiện thẳng.
        const msg = err instanceof Error ? err.message : "";
        toast.error(msg || t("floatingPool.toast.claimFailed", "Nhặt số thất bại."));
      },
    });
  };

  if (config && !config.enabled) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-lg font-semibold">
          {t("floatingPool.disabled.title", "Kho số thả nổi đang tắt")}
        </p>
        <p className="text-sm text-muted-foreground">
          {t(
            "floatingPool.disabled.desc",
            "Bật trong cấu hình để hệ thống bắt đầu quét đơn bỏ bê.",
          )}
        </p>
        {canEdit && <FloatingPoolConfigDialog />}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("floatingPool.title", "Kho số thả nổi")}
        description={
          data && data.daily_claim_limit > 0 ? (
            <>
              {t("floatingPool.quota", "Đã nhặt hôm nay")}: {data.claimed_today}/
              {data.daily_claim_limit}
            </>
          ) : null
        }
        actions={canEdit ? <FloatingPoolConfigDialog /> : null}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          className="sm:max-w-xs"
          placeholder={t("floatingPool.search", "Tên KH hoặc SĐT chính xác")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
        />
        <Input
          type="date"
          className="sm:w-40"
          value={enteredFrom}
          onChange={(e) => {
            setEnteredFrom(e.target.value);
            setPage(1);
          }}
        />
        <Input
          type="date"
          className="sm:w-40"
          value={enteredTo}
          onChange={(e) => {
            setEnteredTo(e.target.value);
            setPage(1);
          }}
        />
        <Button type="button" variant="outline" onClick={runSearch}>
          {t("common.search", "Tìm kiếm")}
        </Button>
      </div>

      <div className="relative overflow-x-auto rounded-lg border border-border">
        {(isLoading || isFetching) && <LogoSpinnerOverlay />}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("floatingPool.col.channel", "Nguồn")}</TableHead>
              <TableHead>{t("floatingPool.col.customer", "Khách hàng")}</TableHead>
              <TableHead>{t("floatingPool.col.phone", "Số điện thoại")}</TableHead>
              <TableHead>{t("floatingPool.col.type", "Loại khách")}</TableHead>
              <TableHead>{t("floatingPool.col.status", "Trạng thái gần nhất")}</TableHead>
              <TableHead>{t("floatingPool.col.prevStaff", "Sale trước đó")}</TableHead>
              <TableHead className="text-center">
                {t("floatingPool.col.rounds", "Số vòng")}
              </TableHead>
              <TableHead>{t("floatingPool.col.enteredAt", "Ngày vào kho")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.items ?? []).map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.channel_name}</TableCell>
                <TableCell className="font-medium">{item.customer_name || "-"}</TableCell>
                <TableCell className="tabular-nums">{item.phone}</TableCell>
                <TableCell>
                  {item.customer_is_new === null || item.customer_is_new === undefined ? (
                    "-"
                  ) : item.customer_is_new ? (
                    <Badge className="border-0 bg-sky-100 text-sky-700">Khách mới</Badge>
                  ) : (
                    <Badge className="border-0 bg-slate-100 text-slate-600">Khách cũ</Badge>
                  )}
                </TableCell>
                <TableCell>{item.sales_status_label ?? "-"}</TableCell>
                <TableCell>
                  {item.previous_staff_name ?? "-"}
                  {item.previous_staff_department ? (
                    <span className="block text-xs text-muted-foreground">
                      {item.previous_staff_department}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-center">{item.float_count}</TableCell>
                <TableCell>{formatDateTimeVi(item.entered_at)}</TableCell>
                <TableCell className="text-right">
                  <ClaimButton
                    customerName={item.customer_name || "-"}
                    phone={item.phone}
                    quotaExhausted={quotaExhausted}
                    pending={claim.isPending}
                    onConfirm={() => handleClaim(item.id)}
                  />
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && (data?.items ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                  {t("floatingPool.empty", "Kho số trống — chưa có đơn nào bị thả nổi.")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {t("common.total", "Tổng")}: {data?.total ?? 0}
        </p>
        <PaginationPages page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
