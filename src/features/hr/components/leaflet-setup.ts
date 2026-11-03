import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Cấu hình icon mặc định dùng chung cho mọi bản đồ leaflet trong HR.
// File này CHỈ được import từ các chunk lazy (AttendanceReadOnlyMap,
// LocationMapCanvas) — giữ leaflet (~150KB + CSS + PNG) ngoài entry bundle.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export default L;
