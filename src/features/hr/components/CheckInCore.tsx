import { useMemo, useState } from "react";
import { CameraOff, CheckCircle2, Fingerprint, MapPin, MapPinOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";

import { useCamera } from "../hooks/useCamera";
import { useGeolocation } from "../hooks/useGeolocation";
import { compressDataUrl } from "../lib/compress-image";
import { useAttendanceConfig, useCheckIn } from "../queries";
import type { AttendanceConfig, CheckInResult } from "../attendance-types";
import { formatTimeVi } from "@/lib/format";

/** Vị trí trong payload config (đã lọc active ở BE; lat/long có thể null). */
type ConfigLocation = AttendanceConfig["locations"][number];

/** Khoảng cách Haversine (mét) giữa 2 điểm WGS84. */
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** "HH:mm" từ ISO datetime (rỗng nếu không parse được). */
function formatTime(iso: string | null | undefined): string {
  return formatTimeVi(iso, { fallback: "" });
}

/**
 * Widget chấm công tự chứa (camera + GPS + khoảng cách + submit). Không phụ thuộc
 * chrome của ERP app-shell nên dùng lại được ở cả desktop lẫn mobile ESS shell.
 */
export function CheckInCore() {
  const { t } = useI18n();
  const { data: config } = useAttendanceConfig();
  const { coords, error: geoError } = useGeolocation();
  const { videoRef, ready: cameraReady, error: cameraError, capture } = useCamera();
  const checkInMutation = useCheckIn();

  const [result, setResult] = useState<CheckInResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Vị trí gần nhất (chỉ xét location đang active) + có nằm trong bán kính không.
  const { nearest, distance, inside } = useMemo(() => {
    // BE chỉ trả location đang active (CompanyLocationRepository.active()).
    const locations = config?.locations ?? [];
    if (!coords || locations.length === 0) {
      return {
        nearest: null as ConfigLocation | null,
        distance: null as number | null,
        inside: false,
      };
    }
    let best: ConfigLocation | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const loc of locations) {
      if (loc.latitude == null || loc.longitude == null) continue;
      const d = haversineMeters(coords.latitude, coords.longitude, loc.latitude, loc.longitude);
      if (d < bestDist) {
        bestDist = d;
        best = loc;
      }
    }
    return {
      nearest: best,
      distance: bestDist,
      inside: best != null && bestDist <= best.radius_m,
    };
  }, [config?.locations, coords]);

  const today = config?.today;
  const statusText = today?.check_out
    ? t("hr.checkin.status.checkedOut", "Đã ra {time}").replace(
        "{time}",
        formatTime(today.check_out),
      )
    : today?.check_in
      ? t("hr.checkin.status.checkedIn", "Đã vào {time}").replace(
          "{time}",
          formatTime(today.check_in),
        )
      : t("hr.checkin.status.none", "Chưa chấm công");

  const disabled = !coords || !cameraReady || !inside || checkInMutation.isPending;

  const handleCheckIn = async () => {
    if (!coords) return;
    setSubmitError(null);
    setResult(null);
    const raw = capture();
    if (!raw) {
      setSubmitError(t("hr.checkin.error.capture", "Không chụp được ảnh. Hãy thử lại."));
      return;
    }
    const photo = await compressDataUrl(raw);
    checkInMutation.mutate(
      { latitude: coords.latitude, longitude: coords.longitude, photo },
      {
        onSuccess: (res) => setResult(res),
        onError: (err) =>
          setSubmitError(
            err instanceof Error
              ? err.message
              : t("hr.checkin.error.generic", "Chấm công thất bại."),
          ),
      },
    );
  };

  const resultText = result
    ? (result.kind === "check_out"
        ? t("hr.checkin.result.checkedOut", "Đã chấm công RA lúc {time}")
        : t("hr.checkin.result.checkedIn", "Đã chấm công VÀO lúc {time}")
      ).replace("{time}", formatTime(result.occurred_at))
    : null;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 pb-4">
      <header className="flex items-center gap-2">
        <Fingerprint className="h-6 w-6 text-primary" />
        <h1 className="text-lg font-semibold text-foreground">
          {t("hr.checkin.title", "Chấm công")}
        </h1>
      </header>

      {/* Trạng thái hôm nay */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {t("hr.checkin.todayLabel", "Hôm nay")}
        </p>
        <p className="mt-1 text-base font-medium text-foreground">{statusText}</p>
      </div>

      {/* Camera preview — container tỉ lệ cố định + video phủ tuyệt đối object-cover.
          Để <video> tự quyết kích thước (w-full + cao auto) khiến tỉ lệ stream camera
          trước (thường dọc) bị letterbox và lộ nền đen. Khung cố định inset-0 fix triệt để. */}
      <div className="relative mx-auto aspect-3/4 w-full max-w-xs overflow-hidden rounded-xl border border-border bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
        />
      </div>

      {/* Vị trí / khoảng cách */}
      <div className="rounded-xl border border-border bg-card p-4">
        {geoError ? (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <MapPinOff className="h-4 w-4" /> {geoError}
          </p>
        ) : inside ? (
          <p className="flex items-center gap-2 text-sm font-medium text-action-success">
            <MapPin aria-hidden="true" className="h-4 w-4" />
            {t("hr.checkin.inside", "Trong khu vực")}
            {nearest ? ` — ${nearest.name}` : ""}
          </p>
        ) : (
          <p className="flex items-center gap-2 text-sm font-medium text-action-warning">
            <MapPinOff aria-hidden="true" className="h-4 w-4" />
            {distance != null && nearest
              ? t("hr.checkin.outside", "Ngoài khu vực (cách {dist}m, cần ≤ {radius}m)")
                  .replace("{dist}", String(Math.round(distance)))
                  .replace("{radius}", String(nearest.radius_m))
              : t("hr.checkin.noLocation", "Chưa xác định được vị trí.")}
          </p>
        )}
      </div>

      {/* Lỗi camera */}
      {cameraError && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <CameraOff className="h-4 w-4" /> {cameraError}
        </p>
      )}

      {/* Kết quả / lỗi submit */}
      {resultText && (
        <p className="flex items-center gap-2 rounded-xl border border-action-success/30 bg-action-success/10 p-3 text-sm font-medium text-action-success">
          <CheckCircle2 className="h-4 w-4" /> {resultText}
        </p>
      )}
      {submitError && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {submitError}
        </p>
      )}

      {/* Nút chấm công — sticky footer để luôn với tới được trên mobile */}
      <div className="sticky bottom-0 mt-auto rounded-xl border border-border bg-background/90 p-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] backdrop-blur-sm supports-backdrop-filter:bg-background/75">
        <Button
          type="button"
          size="lg"
          className="h-14 w-full text-base"
          disabled={disabled}
          onClick={handleCheckIn}
        >
          <Fingerprint className="mr-2 h-5 w-5" />
          {checkInMutation.isPending
            ? t("hr.checkin.submitting", "Đang chấm công...")
            : t("hr.checkin.button", "Chấm công")}
        </Button>
      </div>
    </div>
  );
}
