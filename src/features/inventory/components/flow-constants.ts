// Tách khỏi flow-shared.tsx (audit 2026-07-24): file vừa export component vừa
// export hằng số làm hỏng Fast Refresh — mỗi lần sửa hằng số, React refresh phải
// remount cả cây component thay vì hot-swap.

// Số dòng/trang mặc định; người dùng đổi được qua ô chọn ở thanh lọc.
export const PAGE_SIZE = 50;
export { PAGE_SIZE_OPTIONS_WIDE as PAGE_SIZE_OPTIONS } from "@/lib/constants/pagination";
