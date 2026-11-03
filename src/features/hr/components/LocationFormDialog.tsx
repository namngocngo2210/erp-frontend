import { useEffect, useState } from "react";
import { LocateFixed } from "lucide-react";
import { toast } from "sonner";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FormDialogShell, FormGrid } from "@/components/ui/form-dialog-content";
import { useI18n } from "@/i18n";

import type { AttendanceLocation, LocationPayload } from "../attendance-types";
import { LocationMapPicker } from "./LocationMapPicker";

interface LocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Khi có giá trị: chế độ sửa; null/undefined: chế độ tạo mới. */
  location?: AttendanceLocation | null;
  isPending: boolean;
  onSubmit: (payload: LocationPayload) => void;
}

export function LocationFormDialog({
  open,
  onOpenChange,
  location,
  isPending,
  onSubmit,
}: LocationFormDialogProps) {
  const { t } = useI18n();
  const labelClass = "mb-1 block text-sm font-medium text-muted-foreground";
  const isEdit = Boolean(location);

  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("100");
  const [isActive, setIsActive] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(location?.name ?? "");
    setLatitude(location ? String(location.latitude) : "");
    setLongitude(location ? String(location.longitude) : "");
    setRadius(location ? String(location.radius_m) : "100");
    setIsActive(location?.is_active ?? true);
    setLocating(false);
    setError("");
  }, [open, location]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error(t("hr.location.geo.unsupported", "Trình duyệt không hỗ trợ định vị."));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(String(pos.coords.latitude));
        setLongitude(String(pos.coords.longitude));
        setLocating(false);
      },
      () => {
        toast.error(t("hr.location.geo.failed", "Không lấy được vị trí hiện tại."));
        setLocating(false);
      },
    );
  };

  const handleMapChange = (lat: number, lng: number) => {
    setLatitude(String(lat));
    setLongitude(String(lng));
  };

  const handleSubmit = () => {
    if (isPending) return;
    const lat = Number(latitude);
    const lng = Number(longitude);
    const radiusM = Number(radius);
    if (!name.trim()) {
      setError(t("hr.location.errors.nameRequired", "Vui lòng nhập tên vị trí."));
      return;
    }
    if (!latitude.trim() || !longitude.trim() || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError(t("hr.location.errors.coordsRequired", "Vui lòng nhập vĩ độ và kinh độ hợp lệ."));
      return;
    }
    if (!Number.isFinite(radiusM) || radiusM <= 0) {
      setError(t("hr.location.errors.radiusPositive", "Bán kính phải lớn hơn 0."));
      return;
    }
    onSubmit({
      name: name.trim(),
      latitude: lat,
      longitude: lng,
      radius_m: radiusM,
      is_active: isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogShell
        title={
          isEdit
            ? t("hr.location.edit.title", "Sửa vị trí chấm công")
            : t("hr.location.create.title", "Thêm vị trí chấm công")
        }
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel", "Hủy")}
            </Button>
            <Button type="button" disabled={isPending} onClick={handleSubmit}>
              {isPending
                ? t("common.saving", "Đang lưu...")
                : isEdit
                  ? t("common.save", "Lưu")
                  : t("common.create", "Tạo")}
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <FormGrid>
            <div className="lg:col-span-2">
              <label htmlFor="location-name" className={labelClass}>
                {t("hr.location.field.name", "Tên vị trí")}
              </label>
              <Input id="location-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            {open && (
              <div className="lg:col-span-2">
                <LocationMapPicker
                  latitude={Number(latitude)}
                  longitude={Number(longitude)}
                  radiusM={Number(radius) || 100}
                  onChange={handleMapChange}
                />
              </div>
            )}
            <div>
              <label htmlFor="location-lat" className={labelClass}>
                {t("hr.location.field.latitude", "Vĩ độ")}
              </label>
              <Input
                id="location-lat"
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="location-lng" className={labelClass}>
                {t("hr.location.field.longitude", "Kinh độ")}
              </label>
              <Input
                id="location-lng"
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
            </div>
            <div className="lg:col-span-2">
              <Button
                type="button"
                variant="outline"
                disabled={locating}
                onClick={handleUseCurrentLocation}
              >
                <LocateFixed className="mr-2 h-4 w-4" />
                {locating
                  ? t("hr.location.geo.locating", "Đang lấy vị trí...")
                  : t("hr.location.geo.useCurrent", "Lấy vị trí hiện tại")}
              </Button>
            </div>
            <div>
              <label htmlFor="location-radius" className={labelClass}>
                {t("hr.location.field.radius", "Bán kính (m)")}
              </label>
              <Input
                id="location-radius"
                type="number"
                min={1}
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch id="location-active" checked={isActive} onCheckedChange={setIsActive} />
              <label htmlFor="location-active" className="text-sm font-medium text-foreground">
                {t("hr.location.field.active", "Đang hoạt động")}
              </label>
            </div>
          </FormGrid>
          {error && <p className="mt-3 text-xs text-action-danger">{error}</p>}
          <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
        </form>
      </FormDialogShell>
    </Dialog>
  );
}
