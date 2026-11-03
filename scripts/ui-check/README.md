# ui-check

Chụp màn hình + đo overflow các trang chính ở 375/768/1024/1280/1920 trên bản build `dist/`,
API **mock** bằng request interception (không cần backend, không dùng tài khoản thật).

## Chạy

Máy host không có node — mọi bước chạy qua docker, luôn giới hạn tài nguyên.

```bash
cd frontend

# 1. Build image (một lần)
docker build -t desi-ui-check scripts/ui-check

# 2. Build app
docker run --rm --cpus=2 --memory=3g -u $(id -u):$(id -g) -e HOME=/tmp \
  -v $PWD:/repo/frontend -w /repo/frontend node:22-alpine sh -c "npx vite build"

# 3. Chụp + đo (≈6–8 phút cho 18 trang × 5 độ rộng)
docker run --rm --cpus=2 --memory=3g -u $(id -u):$(id -g) -e HOME=/tmp \
  -e LABEL=baseline -v $PWD:/repo/frontend desi-ui-check node /repo/frontend/scripts/ui-check/run.mjs
```

Kết quả: `frontend/.ui-check/<LABEL>/` — `report.md` (bảng trang × độ rộng + top vi phạm),
`report.json`, PNG viewport mỗi trang/độ rộng (+ `_full.png` ở 375). Thư mục đã gitignore.

## Biến môi trường

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `LABEL` | `baseline` | Tên thư mục output |
| `PAGES` | 18 trang chính (xem `run.mjs`) | Danh sách path, phân cách dấu phẩy |
| `WIDTHS` | `375,768,1024,1280,1920` | Độ rộng viewport |
| `SETTLE_MS` | `1200` | Chờ thêm sau `networkidle0` |
| `SCROLL_X` | `0` | >0: chụp thêm `_scrollx.png` sau khi cuộn ngang mọi vùng cuộn N px (kiểm cột sticky) |

## Chỉ số

- **tràn**: phần tử ngoài cùng có `getBoundingClientRect` vượt viewport, không nằm trong vùng cuộn
  ngang hợp lệ (wrapper `overflow-x-auto`/`overflow-auto`). `<main overflow-y-auto>` không tính là vùng cuộn ngang.
  Phần tử nằm hẳn ngoài viewport (drawer ẩn bằng transform) bị bỏ qua.
- **cắt**: container `overflow-x: hidden|clip` có `scrollWidth > clientWidth` (nội dung bị giấu),
  trừ truncate có chủ đích (`text-overflow: ellipsis`, `line-clamp`).
- 💥 trong bảng = trang rơi vào ErrorBoundary (thường do fixture sai shape) — sửa `fixtures.mjs`.
- **mainRatio** ("nội dung chính"): chiều cao hiển thị trong viewport của phần tử `[data-main-content]`
  (vùng list/bảng chính mà trang gắn attribute) / chiều cao viewport (375/768 → 812px, còn lại 900px).
  Mục tiêu điện thoại ≥ 0,6. Trang chưa gắn attribute ghi `—`.

## Fixture

`fixtures.mjs`: user superuser **có quyền sửa field đơn** (`editable_order_fields` — để ô select bảng đơn render dạng select, không phải badge chỉ đọc) (localStorage `desi_cached_user` + `/api/users/token/refresh` trả JWT giả
+ `/api/users/me`), dữ liệu dài cho các trang danh sách. Endpoint chưa có fixture trả `[]` (path dạng
danh sách) hoặc `{}` và được liệt kê cuối `report.md`. WebSocket được thay bằng stub, mọi request ra
ngoài origin (Sentry…) bị chặn.
