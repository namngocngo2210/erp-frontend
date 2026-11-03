import { describe, expect, it } from "vitest";

import { packageFormToPayload, sortedPackageForms } from "@/features/products/package-form";

describe("packageFormToPayload", () => {
  it("chỉ gửi giá của bảng giá đã nhập, bỏ ô trống", () => {
    const payload = packageFormToPayload({
      quantity: 1,
      prices: { facebook: 100000, web: "" },
      weight: 0.25,
      length: "",
      width: "",
      height: "",
    });
    expect(payload.prices).toEqual({ facebook: 100000 });
  });

  it("giữ nguyên nhiều bảng giá khi đều có số", () => {
    const payload = packageFormToPayload({
      quantity: 2,
      prices: { facebook: 180000, web: 220000 },
      weight: "",
      length: "",
      width: "",
      height: "",
    });
    expect(payload.prices).toEqual({ facebook: 180000, web: 220000 });
  });
});

describe("sortedPackageForms", () => {
  it("đọc prices từ API và sắp theo số lượng tăng dần", () => {
    const forms = sortedPackageForms([
      {
        id: 2,
        quantity: 2,
        prices: { facebook: "180000" },
        weight: "0",
        length: "0",
        width: "0",
        height: "0",
      },
      {
        id: 1,
        quantity: 1,
        prices: { facebook: "100000", web: "130000" },
        weight: "0.25",
        length: "0",
        width: "0",
        height: "0",
      },
    ]);
    expect(forms.map((f) => f.quantity)).toEqual([1, 2]);
    expect(forms[0].prices).toEqual({ facebook: 100000, web: 130000 });
    expect(forms[1].prices).toEqual({ facebook: 180000 });
  });

  it("tự chèn gói số lượng 1 khi API không trả", () => {
    const forms = sortedPackageForms([
      {
        id: 5,
        quantity: 3,
        prices: { facebook: "250000" },
        weight: "0",
        length: "0",
        width: "0",
        height: "0",
      },
    ]);
    expect(forms[0].quantity).toBe(1);
    expect(forms[0].prices).toEqual({});
  });
});
