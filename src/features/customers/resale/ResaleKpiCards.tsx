import { formatShortCurrency } from "../resale-format";

type Props = {
  total: number;
  kpis: { needContact: number; contacted: number; revenue: number };
};

export function ResaleKpiCards({ total, kpis }: Props) {
  return (
    <div className="grid gap-2 md:grid-cols-4">
      <div className="rounded-md bg-muted/50 px-3.5 py-3">
        <div className="text-xs text-muted-foreground">Tổng KH cần chăm</div>
        <div className="mt-1 text-2xl font-medium text-foreground">{total}</div>
        <div className="text-xs text-muted-foreground">Có lịch sử mua hàng</div>
      </div>
      <div className="rounded-md bg-muted/50 px-3.5 py-3">
        <div className="text-xs text-muted-foreground">Cần liên hệ</div>
        <div className="mt-1 text-2xl font-medium text-action-danger">{kpis.needContact}</div>
        <div className="text-xs text-muted-foreground">Chưa ghi lần liên hệ nào</div>
      </div>
      <div className="rounded-md bg-muted/50 px-3.5 py-3">
        <div className="text-xs text-muted-foreground">Đã liên hệ</div>
        <div className="mt-1 text-2xl font-medium text-teal-700">{kpis.contacted}</div>
        <div className="text-xs text-muted-foreground">Có ít nhất 1 lần chăm sóc</div>
      </div>
      <div className="rounded-md bg-muted/50 px-3.5 py-3">
        <div className="text-xs text-muted-foreground">Giá trị đơn gốc</div>
        <div className="mt-1 text-2xl font-medium text-teal-700">
          {formatShortCurrency(kpis.revenue)}
        </div>
        <div className="text-xs text-muted-foreground">Tổng đơn trong bảng hiện tại</div>
      </div>
    </div>
  );
}
