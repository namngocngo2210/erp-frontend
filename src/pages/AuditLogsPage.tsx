import React, { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import {
  validateSearchWindow,
  type AuditLogsParams,
  type SearchWindowViolation,
} from "@/lib/api/audit-logs";
import { useAuditLogs } from "@/features/audit/queries";
import { useExportJobs } from "@/features/exports/ExportJobsProvider";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { PageHeader } from "@/components/ui/page-header";
import { ResponsiveList } from "@/components/ui/responsive-list";
import { AuditLogCard } from "@/features/audit/components/AuditLogCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaginationPages } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AuditLogsPage = () => {
  const { t } = useI18n();
  const { startExport } = useExportJobs();
  const [filters, setFilters] = useState({
    actionType: "",
    entityType: "",
    source: "",
    search: "",
  });
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  // Vi phạm luật bounded-scan của ô tìm kiếm (BE trả 400 cho cùng luật):
  // search bắt buộc có "Từ ngày" và cửa sổ tối đa 31 ngày.
  const [searchViolation, setSearchViolation] = useState<SearchWindowViolation | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // The applied params only update when the user clicks "Áp dụng"
  const [appliedParams, setAppliedParams] = useState<AuditLogsParams>({});

  // Phân trang server-side: limit/offset đi kèm query key để lật trang refetch.
  const queryParams = useMemo<AuditLogsParams>(
    () => ({
      ...appliedParams,
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
    }),
    [appliedParams, pageSize, currentPage],
  );

  const { data, isLoading, isFetching, error } = useAuditLogs(queryParams, hasSearched);
  const rows = data?.items ?? [];
  const total = data?.total ?? 0;

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const handleApply = () => {
    // Chặn từ client theo đúng luật BE: search không có "Từ ngày" hoặc cửa sổ
    // quá 31 ngày sẽ nhận 400 — báo ngay thay vì bắn request hỏng.
    const violation = validateSearchWindow(filters.search, dateFrom, dateTo);
    setSearchViolation(violation);
    if (violation) return;
    setAppliedParams({
      actionType: filters.actionType || undefined,
      entityType: filters.entityType || undefined,
      source: filters.source || undefined,
      search: filters.search.trim() || undefined,
      timestampGte: dateFrom || undefined,
      // Input chỉ chọn NGÀY, backend so trên datetime: gửi trần cuối ngày để
      // "Đến ngày" bao trọn cả ngày đó (lte nửa đêm sẽ loại hết log trong ngày).
      timestampLte: dateTo ? `${dateTo}T23:59:59` : undefined,
    });
    setHasSearched(true);
    setCurrentPage(1);
  };

  // Debounce ô tìm kiếm: sau lần "Áp dụng" đầu tiên, gõ tiếp sẽ tự áp lại sau
  // 400ms (không phải bấm lại nút). Vẫn đi qua validateSearchWindow — gõ khi
  // chưa chọn khoảng ngày hợp lệ chỉ hiện lỗi, không bắn request.
  useEffect(() => {
    if (!hasSearched) return undefined;
    const handle = window.setTimeout(() => {
      const nextSearch = filters.search.trim() || undefined;
      if (appliedParams.search === nextSearch) return;
      const violation = validateSearchWindow(filters.search, dateFrom, dateTo);
      setSearchViolation(violation);
      if (violation) return;
      setAppliedParams((prev) => ({
        ...prev,
        search: nextSearch,
        timestampGte: dateFrom || undefined,
        timestampLte: dateTo ? `${dateTo}T23:59:59` : undefined,
      }));
      setCurrentPage(1);
    }, 400);
    return () => window.clearTimeout(handle);
  }, [filters.search, hasSearched, dateFrom, dateTo, appliedParams.search]);

  const actionTypeLabels: Record<string, string> = {
    CREATE: t("audit.actionTypes.create", "Tạo mới"),
    UPDATE: t("audit.actionTypes.update", "Cập nhật"),
    DELETE: t("audit.actionTypes.delete", "Xóa"),
    READ: t("audit.actionTypes.read", "Đọc"),
    LOGIN: t("audit.actionTypes.login", "Đăng nhập"),
    LOGOUT: t("audit.actionTypes.logout", "Đăng xuất"),
    API_REQUEST: t("audit.actionTypes.apiRequest", "API Request"),
    KIOTVIET_REQUEST: t("audit.actionTypes.kiotvietRequest", "KiotViet Request"),
    SYSTEM: t("audit.actionTypes.system", "Hệ thống"),
  };

  const entityTypeLabels: Record<string, string> = {
    PRODUCT: t("audit.entityTypes.product", "Sản phẩm"),
    ORDER: t("audit.entityTypes.order", "Đơn hàng"),
    CUSTOMER: t("audit.entityTypes.customer", "Khách hàng"),
    CHANNEL: t("audit.entityTypes.channel", "Kênh"),
    USER: t("audit.entityTypes.user", "Người dùng"),
    KIOTVIET: t("audit.entityTypes.kiotviet", "KiotViet"),
  };

  const sourceLabels: Record<string, string> = {
    WEB: t("audit.sources.web", "Web"),
    MOBILE: t("audit.sources.mobile", "Mobile"),
    API: t("audit.sources.api", "API"),
    KIOTVIET: t("audit.sources.kiotviet", "KiotViet"),
    SYSTEM: t("audit.sources.system", "Hệ thống"),
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({ actionType: "", entityType: "", source: "", search: "" });
    setDateFrom("");
    setDateTo("");
    setSearchViolation(null);
    setAppliedParams({});
    setHasSearched(false);
    setCurrentPage(1);
  };

  const searchViolationMessages: Record<SearchWindowViolation, string> = {
    "missing-from": t(
      "audit.filters.searchNeedsDateFrom",
      "Chọn 'Từ ngày' trước khi tìm kiếm (khoảng tối đa 31 ngày)",
    ),
    "too-wide": t(
      "audit.filters.searchWindowTooWide",
      "Khoảng thời gian tìm kiếm tối đa 31 ngày — thu hẹp Từ ngày/Đến ngày",
    ),
  };

  // Task 17: chạy nền qua job export thay vì tải CSV đồng bộ. Chỉ gửi 3 khoá này —
  // `AuditLogsExport.validate()` (apps/audit/exports_definitions.py) chỉ nhặt đúng
  // `filterset_fields` của AuditLogViewSet (user/action_type/entity_type/entity_id/
  // source/timestamp, exact-match, KHÔNG có lookup __gte/__lte hay `search`), nên
  // `search`/khoảng ngày trên UI vốn đã không lọc được ở endpoint export đồng bộ cũ
  // (không phải regression mới do đổi API ở đây) — giữ nguyên hành vi, không bịa
  // thêm khoá mà backend không đọc.
  const handleExport = () => {
    void startExport("audit_logs", {
      action_type: filters.actionType,
      entity_type: filters.entityType,
      source: filters.source,
    });
  };

  if (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch audit logs";
    return <div className="p-4 text-action-danger">Lỗi: {errorMessage}</div>;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("audit.title", "Nhật ký hoạt động")}
        description={t("audit.description", "Xem lịch sử hoạt động hệ thống")}
      />

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(280px,2.2fr)_minmax(170px,1fr)_minmax(170px,1fr)_minmax(150px,0.8fr)_minmax(170px,1fr)_minmax(170px,1fr)] xl:flex-1">
              <div className="xl:min-w-70">
                <Input
                  placeholder={t(
                    "audit.filters.searchPlaceholder",
                    "Tìm theo ID đối tượng, user, IP...",
                  )}
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  aria-invalid={searchViolation !== null}
                />
                <p
                  className={
                    searchViolation
                      ? "mt-1 text-xs text-destructive"
                      : "mt-1 text-xs text-muted-foreground"
                  }
                >
                  {searchViolation
                    ? searchViolationMessages[searchViolation]
                    : t(
                        "audit.filters.searchHint",
                        "Tìm kiếm cần chọn 'Từ ngày' — khoảng tối đa 31 ngày",
                      )}
                </p>
              </div>
              <div className="xl:min-w-[170px]">
                <Select
                  value={filters.actionType}
                  onValueChange={(value: string) => handleFilterChange("actionType", value)}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("audit.filters.actionTypeLabel", "Loại hành động")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("audit.filters.all", "Tất cả")}</SelectItem>
                    {Object.entries(actionTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="xl:min-w-[170px]">
                <Select
                  value={filters.entityType}
                  onValueChange={(value: string) => handleFilterChange("entityType", value)}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("audit.filters.entityTypeLabel", "Loại đối tượng")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("audit.filters.all", "Tất cả")}</SelectItem>
                    {Object.entries(entityTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="xl:min-w-[150px]">
                <Select
                  value={filters.source}
                  onValueChange={(value: string) => handleFilterChange("source", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("audit.filters.sourceLabel", "Nguồn")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("audit.filters.all", "Tất cả")}</SelectItem>
                    {Object.entries(sourceLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="xl:min-w-[170px]">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  aria-label={t("audit.filters.dateFromLabel", "Từ ngày")}
                />
              </div>
              <div className="xl:min-w-[170px]">
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  aria-label={t("audit.filters.dateToLabel", "Đến ngày")}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 xl:justify-end xl:pl-3">
              <Button onClick={handleApply}>{t("audit.filters.apply", "Áp dụng")}</Button>
              <Button onClick={handleResetFilters} variant="outline">
                {t("audit.filters.reset", "Đặt lại")}
              </Button>
              <Button onClick={handleExport} variant="outline">
                {t("audit.filters.export", "Xuất file")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("audit.table.title", "Danh sách log")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasSearched ? (
            <div className="py-8 text-center text-muted-foreground">
              {t("audit.searchHint", "Nhập điều kiện và bấm Áp dụng để hiển thị dữ liệu")}
            </div>
          ) : isLoading ? (
            <div className="flex justify-center py-12">
              <LogoSpinner label="Đang tải..." />
            </div>
          ) : (
            <ResponsiveList
              items={rows}
              getKey={(log) => log.id}
              emptyText={t("audit.empty", "Không có nhật ký nào")}
              renderCard={(log) => (
                <AuditLogCard
                  log={log}
                  actionTypeLabels={actionTypeLabels}
                  entityTypeLabels={entityTypeLabels}
                  sourceLabels={sourceLabels}
                />
              )}
              table={
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("audit.table.timestamp", "Thời gian")}</TableHead>
                      <TableHead>{t("audit.table.user", "Người dùng")}</TableHead>
                      <TableHead>{t("audit.table.action", "Hành động")}</TableHead>
                      <TableHead>{t("audit.table.entity", "Đối tượng")}</TableHead>
                      <TableHead>{t("audit.table.duration", "Thời gian xử lý")}</TableHead>
                      <TableHead>{t("audit.table.source", "Nguồn")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                        <TableCell>{log.user || t("audit.table.system", "Hệ thống")}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {actionTypeLabels[log.action_type] || log.action_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {entityTypeLabels[log.entity_type] || log.entity_type}
                          {log.entity_id && ` (#${log.entity_id})`}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              log.action_type === "KIOTVIET_REQUEST" ? "destructive" : "default"
                            }
                          >
                            {log.duration_ms ? `${log.duration_ms}ms` : t("audit.table.na", "N/A")}
                          </Badge>
                        </TableCell>
                        <TableCell>{sourceLabels[log.source] || log.source}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              }
            />
          )}
          {hasSearched && !isLoading && total === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {t("audit.empty", "Không có nhật ký nào")}
            </div>
          )}
          {hasSearched && !isLoading && total > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {t("audit.pagination.summary", "Tổng số bản ghi: {{count}}").replace(
                  "{{count}}",
                  String(total),
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {t("audit.pagination.pageSize", "Mỗi trang")}
                </span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[90px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                  </SelectContent>
                </Select>
                <PaginationPages
                  page={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  disabled={isFetching}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogsPage;
