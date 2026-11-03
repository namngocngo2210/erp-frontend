import { CalendarClock, PhoneCall, ShoppingCart } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ResaleTrackingRow } from "@/lib/api/customers";
import { contactCount } from "../resale-format";

export function ResaleStatusBadge({ row }: { row: ResaleTrackingRow }) {
  const count = contactCount(row);
  if (count >= 3)
    return (
      <Badge className="border-transparent bg-action-success/10 text-action-success">
        Đã liên hệ đủ
      </Badge>
    );
  if (count > 0)
    return (
      <Badge className="border-transparent bg-action-info/10 text-action-info">Đã liên hệ</Badge>
    );
  return <Badge className="border-transparent bg-stone-100 text-stone-600">Chưa liên hệ</Badge>;
}

export type ResaleRowHandlers = {
  savingKey: string | null;
  onContact: (row: ResaleTrackingRow) => void;
  onAppointment: (row: ResaleTrackingRow) => void;
  onResale: (row: ResaleTrackingRow) => void;
};

/** 3 nút hành động của một dòng — dùng chung cho bảng và card mobile (wrapper do nơi gọi đặt). */
export function ResaleRowActions({
  row,
  savingKey,
  onContact,
  onAppointment,
  onResale,
}: ResaleRowHandlers & { row: ResaleTrackingRow }) {
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 px-2 text-xs"
        disabled={savingKey?.startsWith(`${row.order_id}:`)}
        onClick={() => onContact(row)}
      >
        <PhoneCall className="mr-1 h-3.5 w-3.5" />
        Ghi liên hệ
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 px-2 text-xs"
        onClick={() => onAppointment(row)}
      >
        <CalendarClock className="mr-1 h-3.5 w-3.5" />
        Đặt hẹn
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 border-teal-200 px-2 text-xs text-teal-700 hover:bg-teal-50"
        onClick={() => onResale(row)}
      >
        <ShoppingCart className="mr-1 h-3.5 w-3.5" />
        Resale
      </Button>
    </>
  );
}
