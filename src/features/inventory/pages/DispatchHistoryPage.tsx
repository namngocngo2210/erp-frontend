import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { DateFilter, getDateRange, type DateFilterValue } from "@/components/ui/date-filter";
import { fetchJson } from "@/services/http";
import { useDebouncedValue } from "@/hooks/useDebounce";
import type { WarehouseListResponse } from "@/lib/api/warehouses";
import { useAllProductOptions } from "@/features/products/queries";

import { AwaitingReturnTab } from "../components/AwaitingReturnTab";
import { FlowSummaryTiles } from "../components/FlowSummaryTiles";
import { IssueTab } from "../components/IssueTab";
import { ReturnTab } from "../components/ReturnTab";
import { ViewModeToggle, type ViewMode } from "../components/ViewModeToggle";
import { PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../components/flow-constants";
import type { FlowFilters, MatchFilter } from "../issue-history-queries";

const ALL_CARRIER = "all";

// Mirror CARRIER_LABELS + OTHER_CARRIER của backend (carrier_rules.py).
const CARRIER_OPTIONS = [
  "GHN",
  "GHTK",
  "Viettel Post",
  "J&T Express",
  "Best Express",
  "SPX Express",
  "Ninja Van",
  "VNPost",
  "EMS",
  "Khác",
];

export default function DispatchHistoryPage() {
  const initialRange = getDateRange("this_month");
  const [date, setDate] = useState<DateFilterValue>({
    option: "this_month",
    from: initialRange.from,
    to: initialRange.to,
  });
  // Mảng rỗng = tất cả kho — không có mục "Tất cả kho" giả trong danh sách.
  const [warehouseIds, setWarehouseIds] = useState<string[]>([]);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [carrier, setCarrier] = useState<string>(ALL_CARRIER);
  const [order, setOrder] = useState("");
  const [matchFilter, setMatchFilter] = useState<MatchFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("order");
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE);
  const [tab, setTab] = useState("issue");

  // Debounce ô tìm chữ — tránh remount/refetch toàn bộ tab ở MỖI keystroke.
  const debouncedOrder = useDebouncedValue(order, 300);

  const filters: FlowFilters = useMemo(
    () => ({
      dateFrom: date.from ?? "",
      dateTo: date.to ?? "",
      warehouseIds,
      // Lọc SP giờ dùng MultiSelect theo id; ô free-text (product) giữ "" để
      // tương thích shape FlowFilters.
      product: "",
      productIds,
      order: debouncedOrder,
      carrier: carrier === ALL_CARRIER ? "" : carrier,
    }),
    [date.from, date.to, warehouseIds, productIds, debouncedOrder, carrier],
  );

  const { data: whData } = useQuery({
    queryKey: ["warehouses", "list"],
    queryFn: () =>
      fetchJson("/api/warehouses?limit=200&offset=0") as Promise<WarehouseListResponse>,
    staleTime: 60_000,
  });
  // Ô chọn kho: MultiSelect có ô tìm sẵn (lọc phía client) — danh mục kho nhỏ,
  // đã tải sẵn 200 bản ghi nên không cần tìm phía server.
  const warehouseOptions = useMemo(
    () => (whData?.items ?? []).map((w) => ({ value: String(w.id), label: w.name })),
    [whData?.items],
  );

  // Danh mục sản phẩm cho MultiSelect lọc theo SP (label = SKU, tìm được theo tên).
  // Phải nạp TOÀN BỘ catalog (hook phân trang lặp): ô tìm lọc phía client, nạp
  // 1 trang 1.000 SP là mọi SKU xếp sau đó (vd "TMS01") không bao giờ ra kết quả.
  const { data: productData } = useAllProductOptions(true);
  const productOptions = useMemo(
    () =>
      // Guard shape: endpoint khác envelope (hoặc mock trong test) thì bỏ qua.
      (Array.isArray(productData) ? productData : []).map((item) => ({
        value: String(item.id),
        label: item.sku || String(item.id),
        keywords: item.name || undefined,
      })),
    [productData],
  );

  const tabs: TabItem[] = [
    {
      key: "issue",
      label: "Xuất hàng ra",
      content: (
        <IssueTab
          filters={filters}
          matchFilter={matchFilter}
          viewMode={viewMode}
          pageSize={pageSize}
        />
      ),
    },
    {
      key: "return",
      label: "Nhập hàng hoàn về",
      content: (
        <ReturnTab
          filters={filters}
          matchFilter={matchFilter}
          viewMode={viewMode}
          pageSize={pageSize}
        />
      ),
    },
    {
      // Đơn huỷ sau khi đã xuất kho: hàng đang trên đường về, tồn vẫn đang bị trừ.
      // Chỉ lọc theo kho — ngày huỷ của đơn không liên quan tới khoảng lọc ngày
      // xuất/nhập của hai tab kia.
      key: "awaiting",
      label: "Chờ hàng hoàn về",
      content: <AwaitingReturnTab warehouseIds={warehouseIds} pageSize={pageSize} />,
    },
  ];

  return (
    <div className="space-y-4 p-3 sm:p-4">
      <PageHeader title="Lịch sử nhập xuất" />

      {/* Mobile: lưới 2 cột. Xếp dọc full-width thì 7 ô lọc chiếm gần trọn màn hình
          điện thoại, phải cuộn hết mới nhìn thấy dữ liệu. Ô ngày và ô tìm giữ trọn
          hàng vì nội dung không vừa nửa bề ngang. */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:flex-wrap sm:items-center">
        <div className="col-span-2 sm:col-auto">
          <DateFilter value={date} onChange={setDate} inline />
        </div>
        <MultiSelect
          className="w-full sm:w-48"
          options={warehouseOptions}
          selected={warehouseIds}
          onChange={setWarehouseIds}
          placeholder="Tất cả kho"
          menuPortal
        />
        <MultiSelect
          className="w-full sm:w-56"
          options={productOptions}
          selected={productIds}
          onChange={setProductIds}
          placeholder="Tất cả sản phẩm"
          menuPortal
        />
        <Select value={carrier} onValueChange={setCarrier}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Tất cả ĐVVC" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CARRIER}>Tất cả ĐVVC</SelectItem>
            {CARRIER_OPTIONS.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className="col-span-2 w-full sm:col-auto sm:w-48"
          placeholder="Tìm mã hóa đơn / mã vận đơn"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
        />
        <Select value={matchFilter} onValueChange={(v) => setMatchFilter(v as MatchFilter)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Trạng thái khớp" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="unmatched">Chưa khớp</SelectItem>
            <SelectItem value="matched">Đã khớp</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center">
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
        </div>
        <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} dòng/trang
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <FlowSummaryTiles filters={filters} tab={tab} />

      <Tabs tabs={tabs} active={tab} onChange={setTab} />
    </div>
  );
}
