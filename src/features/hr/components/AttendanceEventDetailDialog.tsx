import { lazy, Suspense } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/i18n";

import type { AttendanceDayRow, AttendanceSub } from "../attendance-types";
import { AuthImage } from "./AuthImage";
import { formatDateTime } from "@/lib/format";

// Nạp leaflet (~150KB + CSS + marker PNG) chỉ khi dialog thực sự mở và bản ghi
// có toạ độ — giữ chunk trang HR gọn (mẫu như PortalScanButton với @zxing).
const AttendanceReadOnlyMap = lazy(() => import("./AttendanceReadOnlyMap"));

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: AttendanceDayRow | null;
}

/** HH:mm dd/MM/yyyy (utils.formatDateTime), chuỗi hỏng → "—". */
function formatEventTime(iso: string): string {
  return formatDateTime(iso) || "—";
}

/** Khung giữ chỗ cùng kích thước với bản đồ trong lúc chunk leaflet đang tải. */
function MapFallback() {
  return <div className="h-56 w-full animate-pulse rounded-md border bg-muted/30" />;
}

function SubSection({
  title,
  sub,
  alt,
  open,
}: {
  title: string;
  sub: AttendanceSub | null;
  alt: string;
  open: boolean;
}) {
  const { t } = useI18n();
  const labelClass = "text-xs font-medium uppercase tracking-wide text-muted-foreground";

  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {!sub ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t("hr.history.detail.notCheckedIn", "Chưa chấm")}
        </p>
      ) : (
        <>
          <div className="flex items-center justify-center rounded-md border bg-muted/30 p-2">
            {sub.photo_url ? (
              <AuthImage
                src={sub.photo_url}
                alt={alt}
                className="max-h-64 rounded object-contain"
              />
            ) : (
              <span className="py-10 text-sm text-muted-foreground">
                {t("hr.history.detail.noPhoto", "Không có ảnh")}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className={labelClass}>{t("hr.history.detail.datetime", "Thời gian")}</p>
              <p className="text-foreground">{formatEventTime(sub.occurred_at)}</p>
            </div>
            <div>
              <p className={labelClass}>{t("hr.history.detail.distance", "Khoảng cách")}</p>
              <p className="text-foreground">{sub.distance_m}m</p>
            </div>
            <div className="col-span-2">
              <p className={labelClass}>{t("hr.history.detail.location", "Điểm chấm công")}</p>
              <p className="text-foreground">{sub.location_name}</p>
            </div>
          </div>

          {open && sub.latitude != null && sub.longitude != null && (
            <Suspense fallback={<MapFallback />}>
              <AttendanceReadOnlyMap latitude={sub.latitude} longitude={sub.longitude} />
            </Suspense>
          )}
        </>
      )}
    </div>
  );
}

export function AttendanceEventDetailDialog({ open, onOpenChange, row }: Props) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid w-[calc(100%-2rem)] max-w-3xl gap-4 p-4">
        <DialogHeader>
          <DialogTitle>{t("hr.history.detail.title", "Chi tiết chấm công")}</DialogTitle>
          {row && (
            <DialogDescription>
              {row.employee_code} · {row.employee_name} · {row.work_date}
            </DialogDescription>
          )}
        </DialogHeader>

        {row && (
          <div className="grid gap-4 md:grid-cols-2">
            <SubSection
              title={t("hr.history.kind.check_in", "Vào")}
              sub={row.check_in ?? null}
              alt={row.employee_name}
              open={open}
            />
            <SubSection
              title={t("hr.history.kind.check_out", "Ra")}
              sub={row.check_out ?? null}
              alt={row.employee_name}
              open={open}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
