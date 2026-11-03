import { Tabs, type TabItem } from "@/components/ui/tabs";
import { BlockCallRecords } from "../BlockCallRecords";
import { BlockCrmRating, type CrmCatalogPayload } from "../BlockCrmRating";
import { BlockJourneyEvents } from "../BlockJourneyEvents";
import { BlockRecall } from "../BlockRecall";
import type { OrderRow } from "../order-types";

/** Khối tab cuối trang: hành vi mua hàng (gộp) vs lịch sử thao tác. */
export const TAB_BEHAVIOR = "behavior";
const TAB_JOURNEY = "journey";

type Props = {
  order: OrderRow;
  patch: (p: Partial<OrderRow>) => void;
  isReadOnly: boolean;
  isKoc: boolean;
  crmCatalog: CrmCatalogPayload | null;
  active: string;
  onChange: (key: string) => void;
  t: (k: string, f?: string) => string;
};

// Khối cuối: đánh giá + AI ghi nhận + cuộc gọi CSKH gộp 1 tab, tab còn lại là
// lịch sử thao tác. Khung tab đóng vai trò card nên các block bên trong dùng variant="plain".
export function OrderDetailBottomTabs({
  order,
  patch,
  isReadOnly,
  isKoc,
  crmCatalog,
  active,
  onChange,
  t,
}: Props) {
  const tabs: TabItem[] = [
    {
      key: TAB_BEHAVIOR,
      label: isKoc ? t("orders.recall.title") : "Hành vi mua hàng",
      content: (
        // `divide-y` bám DOM child: BlockCallRecords tự ẩn (null) lúc đang
        // tải sẽ không để lại gạch phân cách mồ côi.
        <div className="flex flex-col divide-y divide-border/60 px-4 py-4 [&>*+*]:pt-4 [&>*:not(:last-child)]:pb-4">
          {/* Cuộc gọi CSKH nằm NGOÀI fieldset để đơn đã hủy vẫn nghe/đọc được.
              Fieldset ở đây KHÔNG dùng `display:contents` — border của
              `divide-y` sẽ không được vẽ trên element không sinh box. */}
          <fieldset disabled={isReadOnly}>
            {isKoc ? (
              <BlockRecall order={order} patch={patch} variant="plain" />
            ) : (
              <BlockCrmRating order={order} patch={patch} crmCatalog={crmCatalog} variant="plain" />
            )}
          </fieldset>
          <BlockCallRecords orderId={order.id} variant="plain" />
        </div>
      ),
    },
    {
      key: TAB_JOURNEY,
      label: "Lịch sử thao tác",
      content: (
        <div className="px-4 py-4">
          <BlockJourneyEvents
            orderId={order.id}
            active={active === TAB_JOURNEY}
            crmCatalog={crmCatalog}
            variant="plain"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <Tabs tabs={tabs} active={active} onChange={onChange} />
    </div>
  );
}
