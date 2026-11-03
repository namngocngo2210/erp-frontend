import { useEffect, useRef } from "react";
import type { Circle, LeafletMouseEvent, Map as LeafletMap, Marker } from "leaflet";

import L from "./leaflet-setup";

// Hồ Chí Minh City — dùng khi chưa có toạ độ.
const DEFAULT_CENTER: [number, number] = [10.776, 106.7];

type Props = {
  latitude: number;
  longitude: number;
  radiusM: number;
  onChange: (lat: number, lng: number) => void;
};

const sameCoord = (a: number, b: number) => Math.abs(a - b) < 1e-7;

/**
 * Canvas leaflet của LocationMapPicker (marker kéo được + vòng geofence).
 *
 * Tách file riêng để lazy-load: leaflet chỉ được tải khi form địa điểm mở
 * (xem LocationMapPicker — phần ô tìm kiếm không cần leaflet).
 */
export default function LocationMapCanvas({ latitude, longitude, radiusM, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const circleRef = useRef<Circle | null>(null);
  // Tránh vòng lặp feedback: bỏ qua effect đồng bộ ngay sau khi map tự phát onChange.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    // Latest-ref qua effect (ghi ref trong thân render làm React Compiler bail out).
    // Chỉ đọc trong handler dragend/click của Leaflet — không đọc trong render.
    onChangeRef.current = onChange;
  }, [onChange]);

  // Khởi tạo map một lần.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const hasCoord =
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      (latitude !== 0 || longitude !== 0);
    const center: [number, number] = hasCoord ? [latitude, longitude] : DEFAULT_CENTER;

    const map = L.map(el).setView(center, 16);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker(center, { draggable: true }).addTo(map);
    const circle = L.circle(center, { radius: radiusM > 0 ? radiusM : 100 }).addTo(map);

    const apply = (lat: number, lng: number) => {
      marker.setLatLng([lat, lng]);
      circle.setLatLng([lat, lng]);
      onChangeRef.current(lat, lng);
    };

    marker.on("dragend", () => {
      const { lat, lng } = marker.getLatLng();
      apply(lat, lng);
    });
    map.on("click", (e: LeafletMouseEvent) => {
      apply(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;
    circleRef.current = circle;

    // Map nằm trong dialog (đã ẩn/animate) → Leaflet tính sai kích thước nếu không invalidate.
    const tid = setTimeout(() => map.invalidateSize(), 100);

    return () => {
      clearTimeout(tid);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cập nhật bán kính geofence.
  useEffect(() => {
    if (radiusM > 0) circleRef.current?.setRadius(radiusM);
  }, [radiusM]);

  // Đồng bộ khi lat/lng thay đổi từ bên ngoài (nút "vị trí hiện tại", tìm kiếm, nhập tay).
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    const circle = circleRef.current;
    if (!map || !marker || !circle) return;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    if (latitude === 0 && longitude === 0) return;

    const cur = marker.getLatLng();
    if (sameCoord(cur.lat, latitude) && sameCoord(cur.lng, longitude)) return;

    marker.setLatLng([latitude, longitude]);
    circle.setLatLng([latitude, longitude]);
    map.setView([latitude, longitude], map.getZoom());
  }, [latitude, longitude]);

  return <div ref={containerRef} className="h-64 w-full rounded-md overflow-hidden border" />;
}
