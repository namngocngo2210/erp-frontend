import { useEffect, useRef } from "react";

import L from "./leaflet-setup";

/**
 * Bản đồ read-only đánh dấu toạ độ chấm công.
 *
 * Tách file riêng để lazy-load: leaflet chỉ được tải khi dialog chi tiết
 * chấm công thực sự mở (xem AttendanceEventDetailDialog).
 */
export default function AttendanceReadOnlyMap({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Map nằm trong dialog (animate/ẩn lúc mount) → cần invalidateSize sau khi hiện.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    const center: [number, number] = [latitude, longitude];
    const map = L.map(el).setView(center, 16);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    // Marker không kéo được, không có click handler → chỉ hiển thị.
    L.marker(center, { draggable: false }).addTo(map);

    const tid = setTimeout(() => map.invalidateSize(), 100);

    return () => {
      clearTimeout(tid);
      map.remove();
    };
  }, [latitude, longitude]);

  return <div ref={containerRef} className="h-56 w-full rounded-md overflow-hidden border" />;
}
