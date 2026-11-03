import { useMemo } from "react";
import { Calendar, RefreshCw, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ResaleTrackingFacets } from "@/lib/api/customers";
import { ALL, CONTACT_STATUS, contactStatusLabel, daysFilterLabel } from "../resale-format";
import type { ResaleTrackingFilters } from "./use-resale-tracking-list";

type Props = {
  filters: ResaleTrackingFilters;
  facets: ResaleTrackingFacets;
};

export function ResaleFilterBar({ filters, facets }: Props) {
  const {
    query,
    setQuery,
    saleFilter,
    setSaleFilter,
    segmentFilter,
    setSegmentFilter,
    statusFilter,
    setStatusFilter,
    daysFilter,
    setDaysFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
  } = filters;

  // Options lấy từ facets do backend trả (đủ trên toàn phạm vi ngày), không chỉ trang
  // hiện tại — nên chọn 1 sale/phân khúc vẫn chuyển qua lựa chọn khác được.
  const saleOptions = facets.sales;
  const segmentOptions = facets.segments;
  const selectedSaleLabel = useMemo(() => {
    if (saleFilter === ALL) return "Tất cả sale";
    return saleOptions.find((sale) => String(sale.id) === saleFilter)?.name ?? "Tất cả sale";
  }, [saleFilter, saleOptions]);
  const selectedSegmentLabel = useMemo(() => {
    if (segmentFilter === ALL) return "Tất cả phân khúc";
    const match = segmentOptions.find((seg) => seg.code === segmentFilter);
    return match ? `${match.code} - ${match.name}` : segmentFilter;
  }, [segmentFilter, segmentOptions]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="flex min-w-60 flex-1 items-center text-base font-medium text-foreground">
        <RefreshCw className="mr-2 h-4 w-4 text-primary" />
        Theo dõi resale - khách cũ
      </h2>
      <div className="relative min-w-[230px] flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm tên, SĐT, mã đơn"
          className="h-9 pl-9"
        />
      </div>
      <div className="flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-2.5">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <input
          type="date"
          value={dateFrom}
          max={dateTo || undefined}
          onChange={(event) => setDateFrom(event.target.value)}
          className="bg-transparent text-sm outline-hidden"
          aria-label="Giao thành công từ ngày"
        />
        <span className="text-muted-foreground">–</span>
        <input
          type="date"
          value={dateTo}
          min={dateFrom || undefined}
          onChange={(event) => setDateTo(event.target.value)}
          className="bg-transparent text-sm outline-hidden"
          aria-label="Giao thành công đến ngày"
        />
      </div>
      <Select value={saleFilter} onValueChange={setSaleFilter}>
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue>{selectedSaleLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Tất cả sale</SelectItem>
          {saleOptions.map((sale) => (
            <SelectItem key={sale.id} value={String(sale.id)}>
              {sale.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={segmentFilter} onValueChange={setSegmentFilter}>
        <SelectTrigger className="h-9 w-45">
          <SelectValue>{selectedSegmentLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Tất cả phân khúc</SelectItem>
          {segmentOptions.map((seg) => (
            <SelectItem key={seg.code} value={seg.code}>
              {seg.code} - {seg.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="h-9 w-[155px]">
          <SelectValue>{contactStatusLabel(statusFilter)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={CONTACT_STATUS.all}>Tất cả trạng thái</SelectItem>
          <SelectItem value={CONTACT_STATUS.none}>Chưa liên hệ</SelectItem>
          <SelectItem value={CONTACT_STATUS.contacted}>Đã liên hệ</SelectItem>
          <SelectItem value={CONTACT_STATUS.completed}>Đủ 3 lần</SelectItem>
        </SelectContent>
      </Select>
      <Select value={daysFilter} onValueChange={setDaysFilter}>
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue>{daysFilterLabel(daysFilter)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Tất cả</SelectItem>
          <SelectItem value="30">Quá 30 ngày</SelectItem>
          <SelectItem value="60">Quá 60 ngày</SelectItem>
          <SelectItem value="180">Ngủ đông +180 ngày</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
