import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { MultiSelect } from "@/components/ui/multi-select";
import { PageHeader } from "@/components/ui/page-header";
import { TablePagination } from "@/components/ui/table-pagination";
import { useDebouncedValue } from "@/hooks/useDebounce";
import { useI18n } from "@/i18n";

import { mediaCan } from "../access";
import { MediaAccessGate } from "../components/MediaAccessGate";
import { ProposalFormDialog } from "../components/ProposalFormDialog";
import { ProposalRowActions } from "../components/ProposalRowActions";
import { ProposalTable } from "../components/ProposalTable";
import { PAGE_SIZE_OPTIONS } from "../filters";
import {
  proposalFiltersFromParams,
  proposalFiltersToParams,
  type ProposalFilters,
} from "../proposal-filters";
import { useAllTaxonomy, useProposals } from "../queries";
import { useProposalActions } from "../use-proposal-actions";

const STATUSES = ["pending", "in_progress", "done", "cancelled"] as const;

/**
 * Trang "Đề xuất nội dung": filter trên URL, thanh lọc (trạng thái/sản phẩm/tìm
 * kiếm), bảng danh sách + tạo/sửa/xoá đề xuất (task 18).
 */
export default function MediaProposalsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const filters = useMemo(() => proposalFiltersFromParams(sp), [sp]);
  const setFilters = useCallback(
    (next: ProposalFilters) => setSp(proposalFiltersToParams(next), { replace: true }),
    [setSp],
  );
  const [q, setQ] = useState(filters.q);
  const debouncedQ = useDebouncedValue(q, 300);
  // Giá trị q mà CHÍNH component này đã đẩy lên URL lần cuối — dùng để phân biệt
  // URL đổi do ta gõ (bỏ qua) với URL đổi từ ngoài (đồng bộ lại ô nhập).
  const lastPushedQ = useRef(filters.q);
  // filters/setFilters mới nhất, để debounce effect không phải phụ thuộc vào chúng
  // (phụ thuộc là mỗi lần đổi trang/lọc lại kích hoạt push q cũ → vòng lặp).
  const filtersRef = useRef({ filters, setFilters });
  useEffect(() => {
    filtersRef.current = { filters, setFilters };
  }, [filters, setFilters]);
  // Gõ xong (debounce) → đẩy q lên URL, reset trang.
  useEffect(() => {
    const { filters: current, setFilters: apply } = filtersRef.current;
    if (debouncedQ === current.q) return;
    lastPushedQ.current = debouncedQ;
    apply({ ...current, q: debouncedQ, page: 1 });
  }, [debouncedQ]);
  // URL đổi từ ngoài (không phải do ta đẩy) → đồng bộ lại ô nhập.
  useEffect(() => {
    if (filters.q === lastPushedQ.current) return;
    lastPushedQ.current = filters.q;
    setQ(filters.q);
  }, [filters.q]);
  const params = useMemo(() => proposalFiltersToParams(filters), [filters]);
  const { data, isLoading } = useProposals(params);
  const taxonomy = useAllTaxonomy();
  const actions = useProposalActions();

  return (
    <div className="space-y-4">
      <MediaAccessGate>
        {(me) => (
          <>
            <PageHeader
              title={t("topnav.tabs.mediaProposals")}
              actions={
                mediaCan(me.role, "proposal.create") ? (
                  <Button onClick={() => actions.setCreateOpen(true)}>
                    {t("media.proposals.add")}
                  </Button>
                ) : null
              }
            />
            <Card>
              <CardContent className="flex flex-wrap items-end gap-3 pt-6">
                <Input
                  placeholder={t("media.proposals.search")}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="h-9 w-64"
                />
                <MultiSelect
                  options={STATUSES.map((s) => ({
                    value: s,
                    label: t(`media.proposals.status.${s}`),
                  }))}
                  selected={filters.statuses}
                  onChange={(v) => setFilters({ ...filters, statuses: v, page: 1 })}
                  placeholder={t("media.proposals.filter.status")}
                  menuPortal
                />
                <MultiSelect
                  options={taxonomy.products.map((p) => ({
                    value: String(p.id),
                    label: p.code ? `${p.code} – ${p.name}` : p.name,
                  }))}
                  selected={filters.productIds}
                  onChange={(v) => setFilters({ ...filters, productIds: v, page: 1 })}
                  placeholder={t("media.proposals.filter.product")}
                  menuPortal
                />
              </CardContent>
            </Card>
            {isLoading || !data ? (
              <LogoSpinner />
            ) : (
              <>
                <ProposalTable
                  items={data.items}
                  onOpenContent={(id) => navigate(`/media/contents/${id}`)}
                  rowActions={(p) => (
                    <ProposalRowActions
                      proposal={p}
                      role={me.role}
                      onEdit={actions.setEditTarget}
                      onDelete={actions.remove}
                    />
                  )}
                />
                <TablePagination
                  total={data.total}
                  page={filters.page}
                  pageSize={filters.pageSize}
                  onPageChange={(page) => setFilters({ ...filters, page })}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  onPageSizeChange={(pageSize) => setFilters({ ...filters, pageSize, page: 1 })}
                />
              </>
            )}
            {actions.createOpen ? (
              <ProposalFormDialog
                key="create"
                open
                onOpenChange={actions.setCreateOpen}
                taxonomy={taxonomy}
                onSubmit={actions.submitCreate}
              />
            ) : null}
            {actions.editTarget ? (
              <ProposalFormDialog
                key={`edit-${actions.editTarget.id}`}
                open
                onOpenChange={(open) => {
                  if (!open) actions.setEditTarget(null);
                }}
                initial={actions.editTarget}
                taxonomy={taxonomy}
                onSubmit={actions.submitEdit}
              />
            ) : null}
          </>
        )}
      </MediaAccessGate>
    </div>
  );
}
