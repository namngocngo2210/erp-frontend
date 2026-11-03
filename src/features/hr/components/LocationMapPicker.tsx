import { lazy, Suspense, useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";

// Nạp leaflet (~150KB + CSS + marker PNG) chỉ khi form địa điểm mở —
// phần ô tìm kiếm bên dưới không cần leaflet (mẫu như PortalScanButton).
const LocationMapCanvas = lazy(() => import("./LocationMapCanvas"));

type Props = {
  latitude: number;
  longitude: number;
  radiusM: number;
  onChange: (lat: number, lng: number) => void;
};

export function LocationMapPicker({ latitude, longitude, radiusM, onChange }: Props) {
  const { t } = useI18n();

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    setNotFound(false);
    try {
      // eslint-disable-next-line no-restricted-globals -- external Nominatim API, not our backend; fetchJson targets internal endpoints only
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
      );
      const data = await res.json();
      if (data[0]) {
        onChange(parseFloat(data[0].lat), parseFloat(data[0].lon));
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleSearch();
            }
          }}
          placeholder={t("hr.location.map.searchPlaceholder", "Tìm địa chỉ...")}
        />
        <Button
          type="button"
          variant="outline"
          disabled={searching}
          onClick={() => void handleSearch()}
        >
          <Search className="mr-2 h-4 w-4" />
          {searching ? t("common.searching", "Đang tìm...") : t("common.search", "Tìm")}
        </Button>
      </div>
      {notFound && (
        <p className="text-xs text-action-danger">
          {t("hr.location.map.notFound", "Không tìm thấy địa chỉ.")}
        </p>
      )}
      <Suspense
        fallback={<div className="h-64 w-full animate-pulse rounded-md border bg-muted/30" />}
      >
        <LocationMapCanvas
          latitude={latitude}
          longitude={longitude}
          radiusM={radiusM}
          onChange={onChange}
        />
      </Suspense>
      <p className="text-xs text-muted-foreground">
        {t("hr.location.map.hint", "Nhấp hoặc kéo marker trên bản đồ để chọn vị trí.")}
      </p>
    </div>
  );
}
