import { describe, expect, it } from "vitest";

import type { WarrantyJourney } from "@/features/warranty-claims/warranty-claim-types";
import { buildJourneyPatch, initForm } from "./journey-form";
import {
  journeySectionFlags,
  type JourneyClaimTrace,
  type JourneyVcGroups,
} from "./journey-visibility";

const journey = {
  id: 1,
  seq: 1,
  // 6 field tiền tệ cũ: chỉ để buildJourneyPatch không văng ở money() —
  // không liên quan tới 8 field feedback/khiếu nại đang test ở file này.
  declared_value: "0.00",
  cod_amount: "0.00",
  shipping_fee: "0.00",
  resolution_declared_value: "0.00",
  resolution_cod: "0.00",
  return_shipping_fee: "0.00",
  feedback_agree_review: "yes",
  feedback_rating: "good",
  feedback_note: "Khách khen nhanh",
  claim_date: "2026-07-20",
  claim_note: "Best báo mất kiện",
  carrier_response: "agreed",
  compensation_status: "paid",
  compensation_amount: "350000.00",
} as unknown as WarrantyJourney;

describe("journey-form: field feedback + khiếu nại", () => {
  it("initForm đọc đủ 8 field từ bản ghi server", () => {
    const form = initForm(journey);
    expect(form.feedback_agree_review).toBe("yes");
    expect(form.feedback_rating).toBe("good");
    expect(form.feedback_note).toBe("Khách khen nhanh");
    expect(form.claim_date).toBe("2026-07-20");
    expect(form.claim_note).toBe("Best báo mất kiện");
    expect(form.carrier_response).toBe("agreed");
    expect(form.compensation_status).toBe("paid");
    expect(form.compensation_amount).toBe("350000.00");
  });

  it("claim_date null từ server → chuỗi rỗng trong form", () => {
    const form = initForm({ ...journey, claim_date: null } as unknown as WarrantyJourney);
    expect(form.claim_date).toBe("");
  });

  it("buildJourneyPatch gửi đủ 8 field; ngày rỗng → null, tiền rỗng → 0", () => {
    const form = initForm(journey);
    const patch = buildJourneyPatch(form, journey);
    // Lặp qua đủ cả 8 field — trước đây chỉ assert 3/8, một patch bỏ sót field
    // (vd quên feedback_agree_review) vẫn pass được test tên "gửi đủ 8 field".
    expect(patch.feedback_agree_review).toBe("yes");
    expect(patch.feedback_rating).toBe("good");
    expect(patch.feedback_note).toBe("Khách khen nhanh");
    expect(patch.claim_date).toBe("2026-07-20");
    expect(patch.claim_note).toBe("Best báo mất kiện");
    expect(patch.carrier_response).toBe("agreed");
    expect(patch.compensation_status).toBe("paid");
    expect(patch.compensation_amount).toBe("350000.00");

    const empty = buildJourneyPatch({ ...form, claim_date: "", compensation_amount: "" }, journey);
    expect(empty.claim_date).toBeNull();
    expect(empty.compensation_amount).toBe("0");
  });
});

const groups = (over: Partial<JourneyVcGroups> = {}): JourneyVcGroups => ({
  new: null,
  recall: null,
  return: null,
  ...over,
});

const NO_CLAIM_TRACE: JourneyClaimTrace = {
  claim_date: null,
  carrier_response: "",
  compensation_status: "",
};

/** Helper: gọi journeySectionFlags với các tham số hay đổi, còn lại mặc định "chưa có gì". */
const flagsOf = (
  shippingForm: string,
  vcGroups: JourneyVcGroups | null | undefined,
  inspectionResult: string,
  extra: Partial<{ journeyStatus: string; claimTrace: JourneyClaimTrace }> = {},
) =>
  journeySectionFlags({
    shippingForm,
    vcGroups,
    inspectionResult,
    journeyStatus: extra.journeyStatus ?? "new",
    claimTrace: extra.claimTrace ?? NO_CLAIM_TRACE,
  });

describe("journeySectionFlags", () => {
  it("phiếu mới tạo: chưa mã, chưa trạng thái → không hiện khối nào", () => {
    expect(flagsOf("", null, "")).toEqual({
      warehouse: false,
      resolution: false,
      returnBlock: false,
      feedback: false,
      claim: false,
    });
    expect(flagsOf("one_way", groups(), "")).toEqual({
      warehouse: false,
      resolution: false,
      returnBlock: false,
      feedback: false,
      claim: false,
    });
  });

  it("đơn 1 chiều + mã gửi đi GTC → hiện feedback", () => {
    const flags = flagsOf("one_way", groups({ new: "delivered" }), "");
    expect(flags.feedback).toBe(true);
    expect(flags.warehouse).toBe(false);
    expect(flags.returnBlock).toBe(false);
  });

  it("đơn đổi hàng + mã gửi đi GTC → hiện feedback", () => {
    expect(flagsOf("exchange", groups({ new: "delivered" }), "").feedback).toBe(true);
  });

  it("đơn đổi hàng + mã thu hồi Đã trả hàng → hiện kho nhận, chưa hiện §7", () => {
    const flags = flagsOf("exchange", groups({ recall: "returned" }), "");
    expect(flags.warehouse).toBe(true);
    expect(flags.returnBlock).toBe(false);
    expect(flags.resolution).toBe(false);
  });

  it("đơn thu hồi BH + mã thu hồi GTC → hiện kho nhận VÀ §7", () => {
    const flags = flagsOf("warranty_recall", groups({ recall: "delivered" }), "");
    expect(flags.warehouse).toBe(true);
    expect(flags.returnBlock).toBe(true);
    expect(flags.feedback).toBe(false);
  });

  it("đơn thu hồi BH + mã gửi lại GTC → hiện feedback", () => {
    const flags = flagsOf("warranty_recall", groups({ return: "delivered" }), "");
    expect(flags.feedback).toBe(true);
  });

  it("kết quả kiểm tra đã điền → hiện CSKH chốt phương án", () => {
    const flags = flagsOf("exchange", groups({ recall: "returned" }), "normal");
    expect(flags.warehouse).toBe(true);
    expect(flags.resolution).toBe(true);
  });

  it("resolution KHÔNG bao giờ hiện khi warehouse chưa hiện", () => {
    const flags = flagsOf("one_way", groups({ new: "delivered" }), "normal");
    expect(flags.warehouse).toBe(false);
    expect(flags.resolution).toBe(false);
  });

  it("bất kỳ mã nào thất lạc → hiện khiếu nại & đền bù", () => {
    expect(flagsOf("one_way", groups({ new: "lost" }), "").claim).toBe(true);
    expect(flagsOf("exchange", groups({ recall: "lost" }), "").claim).toBe(true);
    expect(flagsOf("warranty_recall", groups({ return: "lost" }), "").claim).toBe(true);
  });

  it("2 loại đơn chưa định nghĩa luồng: chỉ bật claim khi thất lạc", () => {
    for (const form of ["return_recall", "warranty_return"]) {
      expect(flagsOf(form, groups({ new: "delivered", recall: "returned" }), "normal")).toEqual({
        warehouse: false,
        resolution: false,
        returnBlock: false,
        feedback: false,
        claim: false,
      });
      expect(flagsOf(form, groups({ new: "lost" }), "").claim).toBe(true);
    }
  });

  it("hình thức gửi rỗng: chỉ claim theo mã thất lạc", () => {
    expect(flagsOf("", groups({ new: "delivered" }), "").feedback).toBe(false);
    expect(flagsOf("", groups({ new: "lost" }), "").claim).toBe(true);
  });

  // --- Finding 1: kho quét hoàn (status = returned) luôn mở §5, bất kể mã ---
  it("[finding 1] status quét kho = returned → luôn hiện kho nhận, kể cả one_way chưa mã nào ở nhóm returned", () => {
    // Kịch bản hỏng thật: one_way, khách từ chối nhận → Best trả 708 trên
    // new_tracking_code → kho quét "hoàn" → status = returned, nhưng vc_groups
    // của mã gửi đi vẫn là "lost"/"delivering" tuỳ đồng bộ cron, KHÔNG phải
    // "returned" (group đó không tồn tại cho chặng gửi đi). §5 vẫn phải hiện.
    const flags = flagsOf("one_way", groups({ new: "lost" }), "", { journeyStatus: "returned" });
    expect(flags.warehouse).toBe(true);
  });

  it("[finding 1] status khác returned và không mã nào ở nhóm mở kho → KHÔNG hiện kho nhận", () => {
    const flags = flagsOf("one_way", groups({ new: "delivered" }), "", {
      journeyStatus: "shipping",
    });
    expect(flags.warehouse).toBe(false);
  });

  // --- Finding 2: đơn đổi hàng nhận cả GTC lẫn Đã trả hàng cho mã thu hồi ---
  it("[finding 2] đơn đổi hàng + mã thu hồi GTC (không chỉ Đã trả hàng) → cũng hiện kho nhận", () => {
    expect(flagsOf("exchange", groups({ recall: "delivered" }), "").warehouse).toBe(true);
  });

  it("[finding 2] đơn thu hồi BH + mã thu hồi Đã trả hàng (không chỉ GTC) → cũng hiện kho nhận, KHÔNG hiện §7", () => {
    const flags = flagsOf("warranty_recall", groups({ recall: "returned" }), "");
    expect(flags.warehouse).toBe(true);
    // returnBlock vẫn chỉ theo "delivered" — không nới thêm ở finding này.
    expect(flags.returnBlock).toBe(false);
  });

  // --- Finding 3: khối khiếu nại "dính" theo dấu vết đã ghi, không chỉ mã hiện tại ---
  it("[finding 3] mã thất lạc đã tìm thấy (777 → 666) nhưng còn dấu vết khiếu nại → khối vẫn hiện", () => {
    const flags = flagsOf("one_way", groups({ new: "delivered" }), "", {
      claimTrace: { claim_date: "2026-07-20", carrier_response: "", compensation_status: "" },
    });
    expect(flags.claim).toBe(true);
  });

  it("[finding 3] chỉ carrier_response hoặc chỉ compensation_status có giá trị cũng đủ giữ khối hiện", () => {
    expect(
      flagsOf("one_way", groups(), "", {
        claimTrace: {
          claim_date: null,
          carrier_response: "working_with_post",
          compensation_status: "",
        },
      }).claim,
    ).toBe(true);
    expect(
      flagsOf("one_way", groups(), "", {
        claimTrace: { claim_date: null, carrier_response: "", compensation_status: "paid" },
      }).claim,
    ).toBe(true);
  });

  it("[finding 3] không mã thất lạc và không dấu vết khiếu nại → khối claim ẩn", () => {
    expect(flagsOf("one_way", groups({ new: "delivered" }), "").claim).toBe(false);
  });
});
