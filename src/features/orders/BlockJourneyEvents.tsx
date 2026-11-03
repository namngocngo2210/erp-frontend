import { memo } from "react";
import { History } from "lucide-react";

import { LogoSpinner } from "@/components/ui/logo-spinner";
import type { CrmCatalogPayload } from "@/features/orders/BlockCrmRating";
import { fmtDate } from "@/features/orders/order-detail-format";
import { SectionCard, type SectionVariant } from "@/features/orders/order-detail-shared";
import { describeJourneyEvent, journeyActorName } from "@/features/orders/journey-event-format";
import { useOrderJourneyEvents } from "@/features/orders/queries";
import type { OrderJourneyEventRow } from "@/features/orders/order-types";

function JourneyEventRow({
  event,
  crmCatalog,
}: {
  event: OrderJourneyEventRow;
  crmCatalog?: CrmCatalogPayload | null;
}) {
  const { title, change } = describeJourneyEvent(event, crmCatalog);
  return (
    <li className="border-l-2 border-border pl-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
        <span className="font-medium text-foreground">{title}</span>
        <span className="text-muted-foreground">{fmtDate(event.created_at)}</span>
        <span className="text-muted-foreground">· {journeyActorName(event)}</span>
      </div>
      {change ? <div className="text-sm text-foreground">{change}</div> : null}
      {event.note ? (
        <div className="whitespace-pre-wrap text-sm text-muted-foreground">{event.note}</div>
      ) : null}
    </li>
  );
}

/**
 * Tab "Lịch sử thao tác" — timeline `order_journey_events` của 1 đơn, mới nhất
 * trước (backend đã sắp xếp). Read-only, chỉ fetch khi tab đang mở.
 */
function BlockJourneyEventsImpl({
  orderId,
  active,
  crmCatalog,
  variant,
}: {
  orderId: number | null | undefined;
  /** Tab đang được chọn — dùng làm cờ lazy-load. */
  active: boolean;
  crmCatalog?: CrmCatalogPayload | null;
  variant?: SectionVariant;
}) {
  const { data, isPending, isError } = useOrderJourneyEvents(orderId, active);
  const events = data ?? [];

  return (
    <SectionCard icon={<History className="h-4 w-4" />} title="Lịch sử thao tác" variant={variant}>
      {isPending ? (
        <div className="flex justify-center py-6">
          <LogoSpinner size={28} label="Đang tải..." className="mx-auto" />
        </div>
      ) : isError ? (
        <p className="py-2 text-sm text-destructive">Không tải được lịch sử thao tác.</p>
      ) : events.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">
          Chưa có thao tác nào được ghi nhận cho đơn này.
        </p>
      ) : (
        <ol className="flex flex-col gap-3 py-2">
          {events.map((event) => (
            <JourneyEventRow key={event.id} event={event} crmCatalog={crmCatalog} />
          ))}
        </ol>
      )}
    </SectionCard>
  );
}

export const BlockJourneyEvents = memo(BlockJourneyEventsImpl);
