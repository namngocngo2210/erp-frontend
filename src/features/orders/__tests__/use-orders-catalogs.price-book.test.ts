import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useOrdersCatalogs } from "@/features/orders/use-orders-catalogs";

const productPayload = (price: string) => [
  { id: 1, name: "SP", sku: "SKU-1", price, packages: [{ id: 1, quantity: 1, price }] },
];

describe("useOrdersCatalogs — cache theo bảng giá", () => {
  it("gửi price_book lên server và KHÔNG dùng chung cache giữa hai bảng giá", async () => {
    const fetchJson = vi
      .fn()
      .mockResolvedValueOnce(productPayload("100"))
      .mockResolvedValueOnce(productPayload("130"));
    const { result } = renderHook(() => useOrdersCatalogs(fetchJson));

    await act(async () => {
      await result.current.loadProducts({ priceBook: "facebook" });
    });
    expect(result.current.products[0].price).toBe("100");
    // `productsPriceBook` phải đi kèm ĐÚNG bảng vừa nạp — form đơn (Finding 1, code
    // review round 1) dùng nhãn này để biết `products` có thực sự thuộc bảng giá
    // đang cần hay còn là dữ liệu cũ, KHÔNG được suy đoán từ nơi khác.
    expect(result.current.productsPriceBook).toBe("facebook");

    await act(async () => {
      await result.current.loadProducts({ priceBook: "web" });
    });
    expect(result.current.products[0].price).toBe("130");
    expect(result.current.productsPriceBook).toBe("web");
    expect(fetchJson).toHaveBeenCalledTimes(2);
    expect(String(fetchJson.mock.calls[1][0])).toContain("price_book=web");
  });

  it("nạp lại cùng bảng giá thì dùng cache, không gọi server lần nữa", async () => {
    const fetchJson = vi.fn().mockResolvedValue(productPayload("100"));
    const { result } = renderHook(() => useOrdersCatalogs(fetchJson));

    await act(async () => {
      await result.current.loadProducts({ priceBook: "facebook" });
      await result.current.loadProducts({ priceBook: "facebook" });
    });
    expect(fetchJson).toHaveBeenCalledTimes(1);
  });

  it("request CŨ resolve SAU request MỚI không được ghi đè products (stale-write)", async () => {
    // Request đầu (bảng mặc định) cố tình treo lâu; request thứ hai (bảng "web") trả
    // lời ngay. Mô phỏng: mở section → nạp catalog mặc định, người dùng đổi kênh sang
    // "web" ngay lập tức trước khi request đầu kịp về.
    let resolveDefault!: (value: unknown) => void;
    const defaultRequest = new Promise((resolve) => {
      resolveDefault = resolve;
    });
    const fetchJson = vi
      .fn()
      .mockImplementationOnce(() => defaultRequest)
      .mockResolvedValueOnce(productPayload("130"));
    const { result } = renderHook(() => useOrdersCatalogs(fetchJson));

    let firstCall!: Promise<void>;
    act(() => {
      firstCall = result.current.loadProducts({ priceBook: "" });
    });

    await act(async () => {
      await result.current.loadProducts({ priceBook: "web" });
    });
    expect(result.current.products[0].price).toBe("130");
    expect(result.current.productsPriceBook).toBe("web");

    // Request cũ (bảng mặc định) giờ mới resolve — KHÔNG được phép ghi đè giá "web"
    // LẪN nhãn "productsPriceBook" (nếu không, `products` vẫn là "130" của bảng
    // "web" nhưng nhãn lại bị ghi đè về "" — chính kiểu bug Finding 1 mô tả, chỉ
    // khác là xảy ra ngay trong use-orders-catalogs.ts thay vì ở form).
    await act(async () => {
      resolveDefault(productPayload("100"));
      await firstCall;
    });
    expect(result.current.products[0].price).toBe("130");
    expect(result.current.productsPriceBook).toBe("web");
  });
});
