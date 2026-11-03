import { useEffect } from "react";

/**
 * Khoá cuộn của CỬA SỔ suốt thời gian shell CRM còn mounted.
 *
 * Shell tự quản chiều cao (`h-dvh` + `overflow-hidden`) và vùng cuộn thật là
 * `<main>`. Nhưng `overflow-hidden` của một thẻ con KHÔNG cắt được phần tử
 * `position: absolute` có khối chứa là khối chứa gốc — phần tử như vậy nằm cuối
 * một trang dài sẽ âm thầm kéo dài chiều cao document. Sau đó chỉ cần nó nhận
 * focus là trình duyệt "cuộn phần tử vào tầm nhìn", đẩy cả app ra khỏi màn hình:
 * người dùng thấy MÀN TRẮNG, DOM còn nguyên, không một lỗi console nào.
 *
 * Sự cố prod 2026-08-25: `<input class="sr-only">` bên trong `Switch`
 * (`components/ui/switch.tsx`) đúng là phần tử đó. Đo được `documentElement`
 * cao 19.991px trong khi viewport 905px; bấm công tắc ở cuối màn "Nội dung
 * trang sản phẩm" làm document cuộn 19.086px. Switch đã được vá bằng `relative`,
 * hook này là hàng rào để lỗi cùng loại không quay lại từ một component khác.
 *
 * CHỈ dùng cho shell đã đăng nhập (RootLayout). Trang public `/sp/<mã>`,
 * `/bao-hanh` và app mobile `/m` không đi qua đó và vẫn cuộn bằng cửa sổ.
 */
export function useLockWindowScroll(): void {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";

    // `overflow: hidden` KHÔNG đủ, đã đo: nó chặn người dùng cuộn nhưng phần tử
    // vẫn là vùng cuộn theo script, nên "cuộn phần tử đang focus vào tầm nhìn"
    // của trình duyệt vẫn kéo được cả trang đi (đo lại đúng 19.086px sau khi
    // tạm gỡ bản vá `relative` ở Switch). Kéo về 0 ngay khi phát hiện lệch:
    // nếu còn sót một phần tử absolute nào thoát khối chứa gốc thì hậu quả tệ
    // nhất chỉ là một nháy hình, thay vì màn trắng đứng luôn.
    const snapBack = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
    };
    window.addEventListener("scroll", snapBack, { passive: true });
    window.addEventListener("focusin", snapBack);

    return () => {
      root.style.overflow = previous;
      window.removeEventListener("scroll", snapBack);
      window.removeEventListener("focusin", snapBack);
    };
  }, []);
}
