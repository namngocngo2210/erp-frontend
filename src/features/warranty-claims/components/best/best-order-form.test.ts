import { afterEach, describe, expect, it } from "vitest";

import type { WarrantyJourney } from "@/features/warranty-claims/warranty-claim-types";
import { autoFilledFields, todayIso } from "./best-order-autofill";
import {
  applyJourneyType,
  applyParsedAddress,
  buildOrderAddPayload,
  customerSideOf,
  defaultFormForLeg,
  loadSenderAddress,
  saveSenderAddress,
  shopSideOf,
  suggestMerchantCode,
  type AddressBlock,
} from "./best-order-form";

const journey = {
  id: 21,
  seq: 2,
  receiver_name: "Khách A",
  receiver_phone: "0900000001",
  receiver_raw_address: "12 Lê Lợi, Hà Nội",
  product_sku: "SKU-1",
  product_name: "Máy X",
  declared_value: "150000.00",
  cod_amount: "50000.00",
  resolution_declared_value: "200000.00",
  resolution_cod: "0.00",
} as unknown as WarrantyJourney;

const sender: AddressBlock = {
  name: "Kho Đại Mỗ",
  phone: "0911111111",
  city: "Hà Nội",
  district: "Quận Nam Từ Liêm",
  ward: "Đại Mỗ",
  address: "Số 1 Đại Mỗ",
  raw: "Số 1 Đại Mỗ, Đại Mỗ, Nam Từ Liêm, Hà Nội",
};

describe("best-order-form", () => {
  afterEach(() => window.localStorage.clear());

  it("suggestMerchantCode đúng format và ngẫu nhiên hậu tố", () => {
    const code = suggestMerchantCode(21, "recall");
    expect(code).toMatch(/^BHJ21R-[A-Z2-9]{4}$/);
    // 2 lần gọi gần như chắc chắn khác nhau (hậu tố ngẫu nhiên 4 ký tự).
    const codes = new Set(Array.from({ length: 5 }, () => suggestMerchantCode(21, "recall")));
    expect(codes.size).toBeGreaterThan(1);
  });

  it("chặng gửi đi: kho → khách, khai giá/COD từ §4", () => {
    const form = defaultFormForLeg(journey, "new", sender);
    expect(form.from).toEqual(sender);
    expect(form.to.name).toBe("Khách A");
    expect(form.to.address).toBe("12 Lê Lợi, Hà Nội");
    expect(form.declaredValue).toBe("150000.00");
    expect(form.cod).toBe("50000.00");
    expect(form.productName).toBe("SKU-1");
    expect(form.returnBlock).toEqual(sender);
  });

  it("chặng thu hồi: ĐẢO chiều — khách → kho", () => {
    const form = defaultFormForLeg(journey, "recall", sender);
    expect(form.from.name).toBe("Khách A");
    expect(form.to).toEqual(sender);
    expect(form.returnBlock).toEqual(sender);
  });

  it("chặng gửi lại: kho → khách, khai giá/COD từ phần chốt phương án", () => {
    const form = defaultFormForLeg(journey, "return", sender);
    expect(form.from).toEqual(sender);
    expect(form.declaredValue).toBe("200000.00");
    expect(form.cod).toBe("0.00");
  });

  it("buildOrderAddPayload dùng đúng tên trường tiền của Best", () => {
    const payload = buildOrderAddPayload(defaultFormForLeg(journey, "new", sender));
    const required = [
      "Code",
      "ProductName",
      "JourneyType",
      "ServiceId",
      "Weight",
      "SourceCity",
      "SourceWard",
      "SourceAddress",
      "SourceName",
      "SourcePhoneNumber",
      "DestName",
      "DestPhoneNumber",
      "DestAddress",
      "ReturnCity",
      "ReturnWard",
      "ReturnAddress",
      "ReturnName",
      "ReturnPhoneNumber",
    ];
    for (const key of required) {
      expect(payload[key], key).not.toBeUndefined();
    }
    expect(payload.ProductPrice).toBe(150000);
    expect(payload.CollectAmount).toBe(50000);
    expect(payload.DeclareValue).toBeUndefined();
    expect(payload.CollectionValue).toBeUndefined();
    expect(payload.PickupType).toBe(2);
    expect(payload.ServiceId).toBe(12491);
    expect(payload.Weight).toBe(500);
  });

  it("buildOrderAddPayload gửi District từ form, rỗng khi địa chỉ 2 cấp", () => {
    const form = defaultFormForLeg(journey, "new", sender);
    expect(buildOrderAddPayload(form).SourceDistrict).toBe("Quận Nam Từ Liêm");
    // to/returnBlock cũng phải map đúng khối của nó — bắt lỗi copy/paste nhầm khối.
    expect(buildOrderAddPayload(form).DestDistrict).toBe("");
    expect(buildOrderAddPayload(form).ReturnDistrict).toBe("Quận Nam Từ Liêm");

    const twoLevel = { ...form, from: { ...form.from, district: "" } };
    expect(buildOrderAddPayload(twoLevel).SourceDistrict).toBe("");
  });

  it("buildOrderAddPayload bỏ kích thước rỗng/0, giữ kích thước dương", () => {
    const form = defaultFormForLeg(journey, "new", sender);
    const empty = buildOrderAddPayload(form);
    expect(empty.Length).toBeUndefined();
    expect(empty.Width).toBeUndefined();
    expect(empty.Height).toBeUndefined();

    const sized = buildOrderAddPayload({ ...form, length: "30", width: "0", height: "" });
    expect(sized.Length).toBe(30);
    expect(sized.Width).toBeUndefined();
    expect(sized.Height).toBeUndefined();
  });

  it("buildOrderAddPayload gửi Note đã trim", () => {
    const form = defaultFormForLeg(journey, "new", sender);
    expect(buildOrderAddPayload(form).Note).toBe("");
    expect(buildOrderAddPayload({ ...form, note: "  gọi trước khi giao  " }).Note).toBe(
      "gọi trước khi giao",
    );
  });

  it("sender address round-trip localStorage; hỏng → rỗng", () => {
    expect(loadSenderAddress().name).toBe("");
    saveSenderAddress(sender);
    expect(loadSenderAddress()).toEqual(sender);
    window.localStorage.setItem("warranty-best-sender-address", "{hỏng json");
    expect(loadSenderAddress().name).toBe("");
  });

  it("JourneyType mặc định theo chặng: gửi đi 1, thu hồi 2, gửi lại 1", () => {
    expect(defaultFormForLeg(journey, "new", sender).journeyType).toBe(1);
    expect(defaultFormForLeg(journey, "recall", sender).journeyType).toBe(2);
    expect(defaultFormForLeg(journey, "return", sender).journeyType).toBe(1);
  });

  it("shopSideOf: chỉ đơn thu hồi mới có shop ở phía nhận", () => {
    expect(shopSideOf(1)).toBe("from");
    expect(shopSideOf(2)).toBe("to");
    expect(shopSideOf(3)).toBe("from");
    expect(customerSideOf(2)).toBe("from");
    expect(customerSideOf(3)).toBe("to");
  });

  it("applyJourneyType 1 → 3: shop vẫn ở phía gửi, KHÔNG swap", () => {
    const form = defaultFormForLeg(journey, "new", sender);
    const next = applyJourneyType(form, 3);
    expect(next.journeyType).toBe(3);
    expect(next.from).toEqual(form.from);
    expect(next.to).toEqual(form.to);
  });

  it("applyJourneyType 1 → 2 và 2 → 1: shop đổi phía nên swap nội dung 2 khối", () => {
    const form = defaultFormForLeg(journey, "new", sender);
    const recall = applyJourneyType(form, 2);
    expect(recall.journeyType).toBe(2);
    expect(recall.from).toEqual(form.to);
    expect(recall.to).toEqual(form.from);

    const back = applyJourneyType(recall, 1);
    expect(back.from).toEqual(form.from);
    expect(back.to).toEqual(form.to);
  });

  it("applyJourneyType không đụng khối hoàn hàng", () => {
    const form = defaultFormForLeg(journey, "new", sender);
    expect(applyJourneyType(form, 2).returnBlock).toEqual(form.returnBlock);
  });

  it("buildOrderAddPayload gửi JourneyType từ form", () => {
    expect(buildOrderAddPayload(defaultFormForLeg(journey, "recall", sender)).JourneyType).toBe(2);
  });

  it("applyParsedAddress map province/district/ward/address vào đúng ô", () => {
    const next = applyParsedAddress(
      { ...sender, city: "", district: "", ward: "", address: "" },
      {
        province: "Thành phố Huế",
        district: "Thuận Hóa",
        ward: "Phước Vĩnh",
        address: "Nhà 17h, ngõ 51, Kiệt 131 Trần Phú",
      },
    );
    expect(next.city).toBe("Thành phố Huế");
    expect(next.district).toBe("Thuận Hóa");
    expect(next.ward).toBe("Phước Vĩnh");
    expect(next.address).toBe("Nhà 17h, ngõ 51, Kiệt 131 Trần Phú");
  });

  it("applyParsedAddress giữ giá trị cũ khi parser trả rỗng, không đụng tên/SĐT", () => {
    const next = applyParsedAddress(sender, { province: "", district: "  ", ward: "Đại Mỗ" });
    expect(next.city).toBe("Hà Nội");
    expect(next.district).toBe("Quận Nam Từ Liêm");
    expect(next.ward).toBe("Đại Mỗ");
    expect(next.name).toBe("Kho Đại Mỗ");
    expect(next.phone).toBe("0911111111");
  });
});

describe("todayIso", () => {
  it("trả ngày ĐỊA PHƯƠNG, không phải UTC", () => {
    // 00:30 ngày 23/07 giờ VN (UTC+7) = 17:30 ngày 22/07 UTC.
    // Dùng toISOString() sẽ ra 2026-07-22 — sai một ngày với người dùng VN.
    const localMidnightish = new Date(2026, 6, 23, 0, 30, 0);
    expect(todayIso(localMidnightish)).toBe("2026-07-23");
  });

  it("đệm 0 cho tháng và ngày một chữ số", () => {
    expect(todayIso(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("autoFilledFields", () => {
  it("chặng gửi lại: điền ĐVVC và ngày lên đơn của §7", () => {
    expect(autoFilledFields("return", new Date(2026, 6, 22))).toEqual({
      return_carrier: "best",
      return_order_date: "2026-07-22",
    });
  });

  it("chặng gửi đi và thu hồi: KHÔNG điền gì", () => {
    // `carrier`/`order_date` ở §4 dùng chung cho cả hành trình — tự đè sẽ xoá
    // giá trị người dùng đã chọn cho chặng khác.
    expect(autoFilledFields("new", new Date(2026, 6, 22))).toEqual({});
    expect(autoFilledFields("recall", new Date(2026, 6, 22))).toEqual({});
  });
});
