import { Info } from "lucide-react";

import { SectionCard } from "../order-detail-shared";
import type { OrderRow } from "../order-types";
import type { KiotVietOption } from "../use-orders-data";
import { GeneralInfoCustomerSection } from "./GeneralInfoCustomerSection";
import { GeneralInfoOrderSection } from "./GeneralInfoOrderSection";
import { GeneralInfoShippingSection } from "./GeneralInfoShippingSection";

type Props = {
  order: OrderRow;
  patch: (p: Partial<OrderRow>) => void;
  t: (k: string, f?: string) => string;
  kiotvietOptions: KiotVietOption[];
  channels?: Array<{ code: string; name: string }>;
  channelStaffByCode?: Record<string, Array<{ id: number; name: string }>>;
  warehouseOptions?: Array<{ value: string; label: string }>;
  /** Đơn đã xuất kho → ô kho chỉ đọc (đổi kho sau khi trừ tồn làm lệch sổ). */
  warehouseLocked?: boolean;
  /** Quyền `sale-assignment:edit` — thiếu thì ô "Nhân sự" chỉ đọc (cùng luật với inline edit). */
  canAssignSale?: boolean;
  className?: string;
};

/** Khối "Thông tin đơn hàng": 3 nhóm Đơn hàng / Khách hàng / Vận chuyển. */
export function BlockGeneralInfo({
  order,
  patch,
  t,
  kiotvietOptions,
  channels,
  channelStaffByCode = {},
  warehouseOptions = [],
  warehouseLocked = false,
  canAssignSale = false,
  className,
}: Props) {
  return (
    <SectionCard
      icon={<Info className="h-4 w-4" />}
      title="Thông tin đơn hàng"
      className={className}
    >
      <div className="flex h-full min-h-0 flex-col">
        <GeneralInfoOrderSection
          order={order}
          patch={patch}
          t={t}
          kiotvietOptions={kiotvietOptions}
          channels={channels}
          channelStaffByCode={channelStaffByCode}
          canAssignSale={canAssignSale}
        />
        <GeneralInfoCustomerSection order={order} patch={patch} t={t} />
        <GeneralInfoShippingSection
          order={order}
          patch={patch}
          t={t}
          warehouseOptions={warehouseOptions}
          warehouseLocked={warehouseLocked}
        />
      </div>
    </SectionCard>
  );
}
