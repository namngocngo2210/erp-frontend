import { PORTAL_COLOR } from "../portal-theme";
import type { PortalJourneyEvent } from "../types";
import { formatDateTimeVi } from "@/lib/format";

function fmtDateTime(value: string): string {
  return formatDateTimeVi(value);
}

/**
 * Timeline hành trình vận chuyển — nhận thẳng `results` từ response
 * `POST /track` (một lần gọi API trả cả đơn lẫn hành trình, không còn hook
 * `usePortalJourney` theo `orderId`/token phiên như bản trước).
 */
export function OrderJourney({ results }: { results: PortalJourneyEvent[] }) {
  // Backend trả mốc CŨ → MỚI (order_by received_at). Đảo lại để mốc MỚI NHẤT
  // luôn hiện trên cùng — đúng thói quen đọc timeline vận chuyển của khách.
  const timeline = [...results].reverse();

  return (
    <div className="animate-in fade-in rounded-2xl border border-border/70 bg-white p-4 shadow-sm duration-500 sm:p-5">
      <h2 className="text-base font-semibold" style={{ color: PORTAL_COLOR.tealDeep }}>
        Hành trình đơn hàng
      </h2>

      <div className="mt-3">
        {timeline.length === 0 ? (
          <p className="text-sm" style={{ color: PORTAL_COLOR.grayText }}>
            Chưa có thông tin vận chuyển.
          </p>
        ) : (
          <ol className="space-y-5">
            {timeline.map((event, index) => {
              const latest = index === 0;
              return (
                <li key={`${event.group}-${event.at}-${index}`} className="relative flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className="mt-0.5 shrink-0 rounded-full"
                      style={
                        latest
                          ? {
                              width: 12,
                              height: 12,
                              backgroundColor: PORTAL_COLOR.tealDeep,
                              boxShadow: `0 0 0 4px ${PORTAL_COLOR.mint}`,
                            }
                          : { width: 8, height: 8, backgroundColor: "#C7D2CE" }
                      }
                    />
                    {index < timeline.length - 1 ? (
                      <span className="mt-1 w-px flex-1" style={{ backgroundColor: "#DCE7E2" }} />
                    ) : null}
                  </div>
                  <div className="flex-1 space-y-0.5 pb-1">
                    <div
                      className={latest ? "text-sm font-semibold" : "text-sm font-medium"}
                      style={{ color: latest ? PORTAL_COLOR.tealDeep : "#1f2a27" }}
                    >
                      {event.label}
                    </div>
                    <div className="text-xs" style={{ color: PORTAL_COLOR.grayText }}>
                      {fmtDateTime(event.at)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
