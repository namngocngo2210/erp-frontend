import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { useEffect } from "react";

import { ProductPageView } from "../components/product/ProductPageView";
import { portalErrorMessage } from "../error-message";
import { extractCodeFromPath, fetchProductPage } from "../product-page-api";

/**
 * Trang sản phẩm khi khách quét QR trên tem: `/sp/<mã>`.
 *
 * URL chứa mã bảo hành 8 ký tự (thứ nằm dưới lớp cào trên tem), nên trang phải
 * tự gắn `noindex` và `no-referrer`: để Google index là công khai hoá kho mã, và
 * không có `no-referrer` thì mã rò sang YouTube/fanpage qua header Referer.
 */
function useNoIndexMeta(): void {
  useEffect(() => {
    const tags = [
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ].map(({ name, content }) => {
      const el = document.createElement("meta");
      el.setAttribute("name", name);
      el.setAttribute("content", content);
      document.head.appendChild(el);
      return el;
    });
    return () => tags.forEach((el) => el.remove());
  }, []);
}

export default function ProductScanPage() {
  useNoIndexMeta();
  const code = extractCodeFromPath(window.location.pathname);
  const query = useQuery({
    queryKey: ["product-page", code],
    queryFn: () => fetchProductPage(code),
    enabled: code.length > 0,
    retry: false,
  });

  // Tách riêng khỏi trạng thái query: khi không có mã, query bị `enabled: false`
  // nên mãi mãi nằm ở `isPending` — phải chặn ở đây trước, không thì trang kẹt
  // ở màn "Đang tải…" vĩnh viễn.
  if (!code) {
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <ShieldAlert className="mx-auto size-10 text-rose-500" aria-hidden />
        <p className="mt-3 font-semibold text-rose-700">Đường dẫn không hợp lệ.</p>
      </main>
    );
  }

  if (query.isPending) {
    return <main className="p-6 text-center text-slate-500">Đang tải…</main>;
  }

  if (query.isError) {
    // Dùng chung `portalErrorMessage` với ActivateForm/TrackForm (scope "activate")
    // — 404 ở đây là mã tem sai, đúng nghĩa với câu cảnh báo hàng giả đã có sẵn.
    // Không tự viết câu lỗi riêng cho trang này.
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <ShieldAlert className="mx-auto size-10 text-rose-500" aria-hidden />
        <p className="mt-3 font-semibold text-rose-700">
          {portalErrorMessage(query.error, "activate")}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16">
      <ProductPageView data={query.data} />
    </main>
  );
}
