import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ProductScanPage from "../pages/ProductScanPage";
import { extractCodeFromPath } from "../product-page-api";

const BASE = {
  code: "A8K2M4P9QX",
  serial: "DX-000123",
  authentic: true,
  scan: { count: 3, first_at: "2026-08-10T09:00:00+07:00" },
  product: null,
  warranty: null,
  company: {
    name: "Công ty CP Desi Global",
    address: "",
    tax_code: "",
    hotline: "1900xxxx",
    zalo_url: "",
    facebook_url: "",
  },
};

/** Đặt URL trước khi render — trang đọc mã trực tiếp từ `window.location.pathname`. */
function enterAt(path: string) {
  window.history.replaceState(null, "", path);
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ProductScanPage />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  document.querySelector('meta[name="robots"]')?.remove();
  document.querySelector('meta[name="referrer"]')?.remove();
});

describe("extractCodeFromPath", () => {
  it("lấy mã từ /sp/<mã>", () => {
    expect(extractCodeFromPath("/sp/A8K2M4P9QX")).toBe("A8K2M4P9QX");
  });

  it("bỏ dấu / thừa và chuẩn hoá hoa", () => {
    expect(extractCodeFromPath("/sp/a8k2m4p9qx/")).toBe("A8K2M4P9QX");
  });

  it("trả rỗng khi không có mã", () => {
    expect(extractCodeFromPath("/sp/")).toBe("");
  });
});

describe("ProductScanPage", () => {
  beforeEach(() => {
    enterAt(`/sp/${BASE.code}`);
  });

  it("hiện dấu xác thực và serial khi mã hợp lệ", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(BASE), { status: 200 })),
    );

    renderPage();

    expect(await screen.findByText(/DX-000123/)).toBeInTheDocument();
    expect(screen.getByText(/chính hãng/i)).toBeInTheDocument();
  });

  it("hiện số lần quét", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(BASE), { status: 200 })),
    );

    renderPage();

    expect(await screen.findByText(/3 lần/)).toBeInTheDocument();
  });

  it("báo mã không hợp lệ khi API trả 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "Mã không hợp lệ.", code: "not_found" }), {
          status: 404,
        }),
      ),
    );

    renderPage();

    expect(await screen.findByText(/Mã không hợp lệ/)).toBeInTheDocument();
  });

  it("hiện dòng đang cập nhật khi lô chưa gắn sản phẩm", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(BASE), { status: 200 })),
    );

    renderPage();

    expect(await screen.findByText(/đang cập nhật thông tin/i)).toBeInTheDocument();
  });

  it("vẫn hiện khối kích hoạt bảo hành khi lô chưa gắn sản phẩm", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(BASE), { status: 200 })),
    );

    renderPage();

    expect(await screen.findByRole("button", { name: /Kích hoạt bảo hành/ })).toBeInTheDocument();
  });

  it("hiện thẻ bảo hành trong khối kích hoạt khi lô chưa gắn sản phẩm nhưng mã đã kích hoạt", async () => {
    const withWarranty = {
      ...BASE,
      warranty: {
        serial: "DX-000123",
        code: BASE.code,
        product_sku: "BNC02",
        product_name: "Bồn ngâm chân",
        activated_at: "2026-08-10T09:00:00+07:00",
        expires_at: "2028-08-10",
        days_left: 730,
        months: 24,
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(withWarranty), { status: 200 })),
    );

    renderPage();

    expect(await screen.findByText(/Thẻ bảo hành điện tử/)).toBeInTheDocument();
  });

  it("gắn thẻ noindex và no-referrer, gỡ khi unmount", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(BASE), { status: 200 })),
    );

    const view = renderPage();
    await waitFor(() => {
      expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toContain(
        "noindex",
      );
      expect(document.querySelector('meta[name="referrer"]')?.getAttribute("content")).toBe(
        "no-referrer",
      );
    });

    view.unmount();

    expect(document.querySelector('meta[name="robots"]')).toBeNull();
  });
});
