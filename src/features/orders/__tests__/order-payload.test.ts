import { describe, it, expect } from "vitest";

import {
  sanitizeCreateOrderPayload,
  sanitizePatchOrderPayload,
  type CreateOrderPayload,
} from "@/features/orders/order-payload";
import { buildPatchPayload, prepareOrderEditSubmit } from "@/features/orders/order-import-format";
import type { OrderRow } from "@/features/orders/order-types";

function base(overrides: Partial<CreateOrderPayload> = {}): CreateOrderPayload {
  return { channel_code: "CH1", name: "Nguyen A", phone: "0900123456", ...overrides };
}

describe("sanitizeCreateOrderPayload", () => {
  it("trim 3 field bắt buộc; thiếu → chuỗi rỗng", () => {
    const out = sanitizeCreateOrderPayload({
      channel_code: "  CH1 ",
      name: " Nguyen A ",
      phone: " 0900 ",
    });
    expect(out.channel_code).toBe("CH1");
    expect(out.name).toBe("Nguyen A");
    expect(out.phone).toBe("0900");

    const empty = sanitizeCreateOrderPayload({} as CreateOrderPayload);
    expect(empty).toEqual({ channel_code: "", name: "", phone: "" });
  });

  it("string fields: trim, bỏ khi rỗng hoặc không phải string", () => {
    const out = sanitizeCreateOrderPayload(
      base({
        address: "  12 Phố Huế  ",
        raw_address: "   ",
        invoice_code: undefined,
        shipping_code: "SC1",
      }),
    );
    expect(out.address).toBe("12 Phố Huế");
    expect(out.shipping_code).toBe("SC1");
    expect("raw_address" in out).toBe(false);
    expect("invoice_code" in out).toBe(false);
  });

  it("decimal fields: number → string, string chuẩn hoá qua normalizeDecimalInput", () => {
    const out = sanitizeCreateOrderPayload(
      base({
        discount_amount: "1,000",
        total_amount: "2.500.000" as string, // dấu chấm nhóm-3 kiểu VN = phân cách nghìn
        shipping_fee: "30000",
        weight: "abc", // không có số → bỏ
        other_price: "",
      }),
    );
    expect(out.discount_amount).toBe("1000");
    expect(out.total_amount).toBe("2500000");
    expect(out.shipping_fee).toBe("30000");
    expect("weight" in out).toBe(false);
    expect("other_price" in out).toBe(false);
  });

  it("quantity: trunc, âm chặn về 0, không hữu hạn thì bỏ", () => {
    expect(sanitizeCreateOrderPayload(base({ quantity: 2.9 })).quantity).toBe(2);
    expect(sanitizeCreateOrderPayload(base({ quantity: -3 })).quantity).toBe(0);
    expect("quantity" in sanitizeCreateOrderPayload(base({ quantity: NaN }))).toBe(false);
  });

  it("status: trunc + chặn âm về 0", () => {
    expect(sanitizeCreateOrderPayload(base({ status: 3.7 })).status).toBe(3);
    expect(sanitizeCreateOrderPayload(base({ status: -1 })).status).toBe(0);
  });

  it("auto_assign_staff: chỉ gửi khi bật, bỏ hẳn key khi tắt", () => {
    // Cờ chia đơn tự động chỉ có nghĩa ở luồng TẠO. Gửi false cũng vô hại (BE
    // default false) nhưng bỏ key giữ payload gọn và khớp quy ước các field khác.
    expect(sanitizeCreateOrderPayload(base({ auto_assign_staff: true })).auto_assign_staff).toBe(
      true,
    );
    expect(
      "auto_assign_staff" in sanitizeCreateOrderPayload(base({ auto_assign_staff: false })),
    ).toBe(false);
    expect("auto_assign_staff" in sanitizeCreateOrderPayload(base())).toBe(false);
  });

  it("staff_id / kiotviet_channel_id chỉ nhận số hữu hạn", () => {
    const out = sanitizeCreateOrderPayload(base({ staff_id: 5, kiotviet_channel_id: 9 }));
    expect(out.staff_id).toBe(5);
    expect(out.kiotviet_channel_id).toBe(9);
    const bad = sanitizeCreateOrderPayload(base({ staff_id: Infinity, kiotviet_channel_id: NaN }));
    expect("staff_id" in bad).toBe(false);
    expect("kiotviet_channel_id" in bad).toBe(false);
  });

  it("customer_prepaid: number → string (kể cả 0), string chuẩn hoá, rác thì bỏ", () => {
    expect(sanitizeCreateOrderPayload(base({ customer_prepaid: 0 })).customer_prepaid).toBe("0");
    expect(sanitizeCreateOrderPayload(base({ customer_prepaid: 5000 })).customer_prepaid).toBe(
      "5000",
    );
    expect(sanitizeCreateOrderPayload(base({ customer_prepaid: "1,500" })).customer_prepaid).toBe(
      "1500",
    );
    expect(
      "customer_prepaid" in sanitizeCreateOrderPayload(base({ customer_prepaid: "abc" })),
    ).toBe(false);
  });

  it("customer_gender: 0/1 giữ; null pass-through (đối xứng với patch); giá trị lạ bỏ", () => {
    expect(sanitizeCreateOrderPayload(base({ customer_gender: 0 })).customer_gender).toBe(0);
    expect(sanitizeCreateOrderPayload(base({ customer_gender: 1 })).customer_gender).toBe(1);
    // Backend OrderCreateSerializer.customer_gender = IntegerField(allow_null=True)
    // → null hợp lệ khi create, thống nhất ngữ nghĩa với patch (null = không xác định).
    expect(sanitizeCreateOrderPayload(base({ customer_gender: null })).customer_gender).toBeNull();
    // Không set khi vắng mặt hoặc giá trị lạ.
    expect("customer_gender" in sanitizeCreateOrderPayload(base())).toBe(false);
    expect("customer_gender" in sanitizeCreateOrderPayload(base({ customer_gender: 2 }))).toBe(
      false,
    );
  });

  it("order_source: giá trị hợp lệ giữ, null giữ null, giá trị lạ bỏ", () => {
    expect(sanitizeCreateOrderPayload(base({ order_source: "landing" })).order_source).toBe(
      "landing",
    );
    expect(sanitizeCreateOrderPayload(base({ order_source: null })).order_source).toBeNull();
    // "kol" là nguồn legacy: không cho chọn mới ở form nhưng backend vẫn có trong
    // OrderSource choices → phải round-trip, không bị drop khi create.
    expect(sanitizeCreateOrderPayload(base({ order_source: "kol" })).order_source).toBe("kol");
    expect(
      "order_source" in sanitizeCreateOrderPayload(base({ order_source: "bogus" as never })),
    ).toBe(false);
  });

  it("vat: hợp lệ giữ, null/invalid bỏ (field NOT NULL ở backend)", () => {
    expect(sanitizeCreateOrderPayload(base({ vat: "company" })).vat).toBe("company");
    expect("vat" in sanitizeCreateOrderPayload(base({ vat: null }))).toBe(false);
  });

  it("show_orders chỉ nhận boolean; created_at_override trim, rỗng bỏ", () => {
    expect(sanitizeCreateOrderPayload(base({ show_orders: false })).show_orders).toBe(false);
    expect(
      sanitizeCreateOrderPayload(base({ created_at_override: " 2026-07-01 " })).created_at_override,
    ).toBe("2026-07-01");
    expect(
      "created_at_override" in sanitizeCreateOrderPayload(base({ created_at_override: "  " })),
    ).toBe(false);
  });

  describe("items", () => {
    it("giữ item hợp lệ: trunc quantity, trim sku/unit_price", () => {
      const out = sanitizeCreateOrderPayload(
        base({
          items: [
            { product_id: 10, sku: " SKU-1 ", quantity: 2.8, unit_price: " 99000 " },
            { sku: "SKU-2", quantity: 1 },
          ],
        }),
      );
      expect(out.items).toEqual([
        { product_id: 10, sku: "SKU-1", quantity: 2, unit_price: "99000" },
        { sku: "SKU-2", quantity: 1 },
      ]);
    });

    it("bỏ item quantity <= 0 hoặc NaN, bỏ item không có product_id lẫn sku", () => {
      const out = sanitizeCreateOrderPayload(
        base({
          items: [
            { product_id: 1, quantity: 0 },
            { product_id: 2, quantity: -1 },
            { product_id: 3, quantity: Number("x") },
            { quantity: 5 }, // không có định danh sản phẩm
            { product_id: 4, quantity: 1 },
          ],
        }),
      );
      expect(out.items).toEqual([{ product_id: 4, quantity: 1 }]);
    });

    it("characterization: product_name KHÔNG được copy sang payload đã sanitize", () => {
      const out = sanitizeCreateOrderPayload(
        base({ items: [{ product_id: 1, product_name: "Áo", quantity: 1 }] }),
      );
      expect(out.items?.[0]).toEqual({ product_id: 1, quantity: 1 });
    });

    it("items rỗng → không set; items toàn invalid → mảng rỗng", () => {
      expect("items" in sanitizeCreateOrderPayload(base({ items: [] }))).toBe(false);
      // Characterization: mảng có phần tử nhưng đều invalid → items = [].
      expect(sanitizeCreateOrderPayload(base({ items: [{ quantity: 0 }] })).items).toEqual([]);
    });
  });

  describe("crm", () => {
    it("trim string fields, giữ null, bỏ kiểu lạ; potential_level trunc/null", () => {
      const out = sanitizeCreateOrderPayload(
        base({
          crm: {
            internal_note: "  ghi chú  ",
            bomb_reason_text: null,
            sales_status_code: 123 as unknown as string, // kiểu lạ → bỏ
            potential_level: 2.9,
          },
        }),
      );
      expect(out.crm).toEqual({
        internal_note: "ghi chú",
        bomb_reason_text: null,
        potential_level: 2,
      });

      const cleared = sanitizeCreateOrderPayload(base({ crm: { potential_level: null } }));
      expect(cleared.crm).toEqual({ potential_level: null });
    });

    it("needs: bỏ entry thiếu type_code, group_code rỗng → undefined", () => {
      const out = sanitizeCreateOrderPayload(
        base({
          crm: {
            needs: [
              { type_code: " T1 ", group_code: " G1 " },
              { type_code: "", group_code: "G2" },
              { type_code: "T2", group_code: "" },
            ] as never,
          },
        }),
      );
      expect(out.crm).toEqual({
        needs: [
          { type_code: "T1", group_code: "G1" },
          { type_code: "T2", group_code: undefined },
        ],
      });
    });

    it("crm không có field hợp lệ nào → không set crm", () => {
      const out = sanitizeCreateOrderPayload(
        base({ crm: { sales_status_code: 5 as unknown as string } }),
      );
      expect("crm" in out).toBe(false);
    });
  });
});

describe("sanitizePatchOrderPayload", () => {
  it("field không được xử lý riêng thì pass-through nguyên vẹn", () => {
    const out = sanitizePatchOrderPayload({ status: 3, product: "Áo", feedback: "  raw  " });
    expect(out).toEqual({ status: 3, product: "Áo", feedback: "  raw  " });
  });

  it("customer_gender: chuẩn hoá female/male, invalid thì xoá key, null giữ null", () => {
    expect(sanitizePatchOrderPayload({ customer_gender: "female" as never }).customer_gender).toBe(
      0,
    );
    expect(sanitizePatchOrderPayload({ customer_gender: null }).customer_gender).toBeNull();
    const invalid = sanitizePatchOrderPayload({ customer_gender: 7 });
    expect("customer_gender" in invalid).toBe(false);
    // Không đụng khi key vắng mặt.
    expect("customer_gender" in sanitizePatchOrderPayload({ status: 1 })).toBe(false);
  });

  it("order_source: '' và null → null (clear); hợp lệ giữ; giá trị lạ xoá key", () => {
    expect(sanitizePatchOrderPayload({ order_source: "" as never }).order_source).toBeNull();
    expect(sanitizePatchOrderPayload({ order_source: null }).order_source).toBeNull();
    expect(sanitizePatchOrderPayload({ order_source: "zalo" }).order_source).toBe("zalo");
    // "kol" legacy vẫn round-trip khi patch (backend có trong choices).
    expect(sanitizePatchOrderPayload({ order_source: "kol" }).order_source).toBe("kol");
    expect("order_source" in sanitizePatchOrderPayload({ order_source: "bogus" as never })).toBe(
      false,
    );
  });

  it("vat: hợp lệ giữ; ''/null/invalid xoá key (không bao giờ gửi null)", () => {
    expect(sanitizePatchOrderPayload({ vat: "individual" }).vat).toBe("individual");
    expect("vat" in sanitizePatchOrderPayload({ vat: "" as never })).toBe(false);
    expect("vat" in sanitizePatchOrderPayload({ vat: null as never })).toBe(false);
  });

  it("is_export_vat ép Boolean; vat_link trim string, non-string → ''", () => {
    expect(sanitizePatchOrderPayload({ is_export_vat: 1 as never }).is_export_vat).toBe(true);
    expect(sanitizePatchOrderPayload({ is_export_vat: null }).is_export_vat).toBe(false);
    expect(sanitizePatchOrderPayload({ vat_link: "  http://x  " }).vat_link).toBe("http://x");
    expect(sanitizePatchOrderPayload({ vat_link: null }).vat_link).toBe("");
  });

  it("crm.bomb_reason_text: trim, chuỗi trắng → null, kiểu lạ xoá key; field crm khác giữ nguyên", () => {
    const out = sanitizePatchOrderPayload({
      crm: { bomb_reason_text: "  bom  ", internal_note: "note" },
    });
    expect(out.crm).toEqual({ bomb_reason_text: "bom", internal_note: "note" });

    expect(
      sanitizePatchOrderPayload({ crm: { bomb_reason_text: "   " } }).crm?.bomb_reason_text,
    ).toBeNull();
    expect(
      sanitizePatchOrderPayload({ crm: { bomb_reason_text: null } }).crm?.bomb_reason_text,
    ).toBeNull();

    const weird = sanitizePatchOrderPayload({
      crm: { bomb_reason_text: 5 as unknown as string },
    });
    expect("bomb_reason_text" in (weird.crm as object)).toBe(false);
  });

  it("không mutate payload đầu vào", () => {
    const input: Partial<OrderRow> = {
      order_source: "" as never,
      crm: { bomb_reason_text: "  x  " },
    };
    sanitizePatchOrderPayload(input);
    expect(input.order_source).toBe("");
    expect(input.crm?.bomb_reason_text).toBe("  x  ");
  });
});

describe("buildPatchPayload", () => {
  // Task 3 (koc-recall-entry-groups): backend đã bỏ `recall_code` khỏi `recall`
  // (chỉ còn `return_slip_code`) — sửa mã thu hồi giờ đi qua cột lưới nhiều nhóm
  // (`recall_entries`), dialog sửa đơn không còn ghi field này nữa dù form vẫn
  // seed giá trị cũ vào `values.recall_code` (order-form-helpers.ts).
  it("không map recall_code vào patch payload nữa (đã chuyển sang recall_entries trên lưới)", () => {
    const values = {
      ...base(),
      recall_code: "RC-9",
    };
    const payload = buildPatchPayload(values);
    expect(payload.recall).toBeUndefined();
  });

  // staff_id undefined = form không đụng tới nhân viên. Trước đây bị ép thành null nên
  // mọi lần lưu form với ô nhân viên trống đều xoá sale của đơn (rồi cron chia đơn tự
  // động vớt lại cho người khác) — payload phải BỎ HẲN field thay vì gửi null.
  it("bỏ staff_id khỏi payload khi form không đụng tới nhân viên", () => {
    const payload = buildPatchPayload(base());
    expect("staff_id" in payload).toBe(false);
  });

  it("gửi staff_id khi form có chọn nhân viên", () => {
    const payload = buildPatchPayload(base({ staff_id: 7 }));
    expect(payload.staff_id).toBe(7);
  });

  it("gửi staff_id null khi người dùng chủ động xoá nhân viên", () => {
    const payload = buildPatchPayload(base({ staff_id: null }));
    expect("staff_id" in payload).toBe(true);
    expect(payload.staff_id).toBeNull();
  });

  // Chia đơn tự động là quyết định lúc TẠO đơn. Nếu cờ lọt vào PATCH, mỗi lần mở
  // form sửa và bấm lưu sẽ có nguy cơ chia lại đơn đang có chủ.
  it("không mang auto_assign_staff sang patch payload", () => {
    const payload = buildPatchPayload(base({ auto_assign_staff: true }));
    expect("auto_assign_staff" in payload).toBe(false);
  });

  // order_type ChoiceField ở backend đã thu hẹp còn 3 giá trị (normal/no_return/
  // has_return). Đơn cũ vẫn mang 1 trong 4 giá trị đã gỡ (same_product/
  // different_product/purchase/warranty_return); form gửi nguyên object nên nếu
  // không lọc, PATCH sẽ mang lại chính giá trị legacy đó → DRF ChoiceField 400.
  // Bỏ hẳn key khỏi payload khi legacy = BE giữ nguyên giá trị cũ trong DB.
  it("bỏ order_type khỏi payload khi đơn mang giá trị legacy đã gỡ khỏi backend", () => {
    const payload = buildPatchPayload(base({ order_type: "same_product" as never }));
    expect("order_type" in payload).toBe(false);
  });

  it("vẫn gửi order_type khi giá trị nằm trong 3 giá trị backend còn chấp nhận", () => {
    const payload = buildPatchPayload(base({ order_type: "no_return" as never }));
    expect(payload.order_type).toBe("no_return");
  });
});

// Task 8 review fix (CRITICAL): `buildPatchPayload` set MỌI field bằng fallback
// rỗng/null/0 bất kể `values` có key đó hay không — strip field thiếu quyền
// TRƯỚC khi gọi hàm này (ở `values`, input) sẽ bị nó dựng lại thành giá trị rỗng
// tường minh thay vì biến mất khỏi payload, khiến backend coi đó là "đổi thật"
// trên field chưa cấp quyền → 403 hàng loạt. `prepareOrderEditSubmit` phải strip
// trên ĐẦU RA của buildPatchPayload, và guard tiền điều kiện phải đọc `values`
// gốc (đầy đủ) — không phải payload đã strip.
describe("prepareOrderEditSubmit", () => {
  const allowAll = () => true;

  it("guard đọc values ĐẦY ĐỦ — thiếu quyền field khác KHÔNG chặn Lưu, không toast sai, không ném lỗi", () => {
    const values = base({ name: "Khach moi" });
    // Thiếu quyền `name` (field không liên quan tới guard) — guard chỉ quan tâm
    // channel_code/phone, cả hai vẫn có mặt trong `values` (form không tự strip).
    const canEditField = (field: string) => field !== "name";

    const result = prepareOrderEditSubmit(values, canEditField);

    expect(result.blocked).toBe(false);
  });

  it("vẫn chặn đúng khi channel_code/phone rỗng thật (không phải do bị strip)", () => {
    const missingChannel = prepareOrderEditSubmit(base({ channel_code: "" }), allowAll);
    expect(missingChannel.blocked).toBe(true);

    const missingPhone = prepareOrderEditSubmit(base({ phone: "   " }), allowAll);
    expect(missingPhone.blocked).toBe(true);
  });

  it("payload PATCH không chứa field chưa được cấp quyền", () => {
    const values = base({ total_amount: "500000" });
    const canEditField = (field: string) => field !== "total_amount";

    const result = prepareOrderEditSubmit(values, canEditField);

    expect(result.blocked).toBe(false);
    if (!result.blocked) {
      expect("total_amount" in result.payload).toBe(false);
    }
  });

  it("field CÓ quyền vẫn nằm nguyên trong payload — không strip quá tay", () => {
    const values = base({ total_amount: "500000", name: "Khach A" });
    const canEditField = (field: string) => field !== "total_amount";

    const result = prepareOrderEditSubmit(values, canEditField);

    expect(result.blocked).toBe(false);
    if (!result.blocked) {
      expect(result.payload.name).toBe("Khach A");
      expect(result.payload.channel_code).toBe(values.channel_code);
      expect(result.payload.phone).toBe(values.phone);
    }
  });
});
