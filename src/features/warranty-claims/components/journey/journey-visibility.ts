/**
 * Quy tắc ẩn/hiện các khối hậu-kỳ của form hành trình BH.
 *
 * Logic TRÌNH BÀY thuần — cố ý không tính ở backend để đổi quy tắc UI không
 * phải sửa serializer + regen schema. Không import React nên test trực tiếp
 * được. Spec: docs/superpowers/specs/2026-07-22-warranty-journey-conditional-flow-design.md
 */

/**
 * Nhóm trạng thái VC của 3 chặng (đọc từ `journey.vc_groups` của serializer).
 * Khai optional để nhận thẳng object của serializer — nó còn có khoá `main`
 * và nullability do OpenAPI sinh, không nên ép caller phải map lại.
 */
export type JourneyVcGroups = {
  new?: string | null;
  recall?: string | null;
  return?: string | null;
};

/**
 * Dấu vết đã ghi nhận khiếu nại trên hành trình — đọc từ bản ghi SERVER
 * (`journey.*`), không phải bản nháp. Dùng để giữ khối "Khiếu nại & đền bù"
 * hiện dù mã Best không còn ở nhóm thất lạc (VD: 777 → 666 khi tìm lại được
 * hàng) — dữ liệu đền bù đã ghi thì không được phép biến mất khỏi màn hình.
 */
export type JourneyClaimTrace = {
  claim_date: string | null;
  carrier_response: string;
  compensation_status: string;
};

export type JourneySectionFlagsInput = {
  shippingForm: string;
  vcGroups: JourneyVcGroups | null | undefined;
  inspectionResult: string;
  /** Trạng thái nội bộ SERVER (`journey.status`) — do quét kho/cron đặt, KHÔNG phải bản nháp. */
  journeyStatus: string;
  claimTrace: JourneyClaimTrace;
};

export type JourneySectionFlags = {
  /** §5 Kho nhận hàng BH */
  warehouse: boolean;
  /** §6 CSKH chốt phương án */
  resolution: boolean;
  /** §7 Gửi đơn mới về khách */
  returnBlock: boolean;
  /** Khách nhận hàng — Cảm nhận */
  feedback: boolean;
  /** Khiếu nại & đền bù */
  claim: boolean;
};

export function journeySectionFlags(input: JourneySectionFlagsInput): JourneySectionFlags {
  const { shippingForm, vcGroups, inspectionResult, journeyStatus, claimTrace } = input;

  const isNewDelivered = vcGroups?.new === "delivered";
  const isRecallDelivered = vcGroups?.recall === "delivered";
  const isRecallReturned = vcGroups?.recall === "returned";
  const isReturnDelivered = vcGroups?.return === "delivered";
  const isRecallDeliveredOrReturned = isRecallDelivered || isRecallReturned;

  // Thất lạc ở BẤT KỲ chặng nào cũng mở khối khiếu nại, kể cả loại đơn chưa
  // định nghĩa luồng.
  const hasLostCode =
    vcGroups?.new === "lost" || vcGroups?.recall === "lost" || vcGroups?.return === "lost";
  // "Dính": còn dấu vết khiếu nại đã ghi (ngày khiếu nại / phản hồi ĐVVC /
  // tình trạng đền bù) thì giữ khối hiện, không phụ thuộc mã có còn "lost".
  const hasClaimTrace =
    !!claimTrace.claim_date?.trim() ||
    claimTrace.carrier_response.trim() !== "" ||
    claimTrace.compensation_status.trim() !== "";
  const claim = hasLostCode || hasClaimTrace;

  const feedback =
    ((shippingForm === "one_way" || shippingForm === "exchange") && isNewDelivered) ||
    (shippingForm === "warranty_recall" && isReturnDelivered);

  // Mã thu hồi của `exchange` lẫn `warranty_recall` được tạo giống hệt nhau
  // (JourneyType = 2, shop là bên NHẬN) nên khi hàng về tới shop, Best có thể
  // trả 666 = delivered HOẶC 708 = returned tuỳ luồng quét thực tế — nhận cả
  // hai cho chắc. Đây là tập cha của quy tắc cũ (chỉ returned) nên không phá gì.
  const warehouseByRecallCode =
    (shippingForm === "exchange" && isRecallDeliveredOrReturned) ||
    (shippingForm === "warranty_recall" && isRecallDeliveredOrReturned);
  // Quét HÀNG HOÀN ở kho (`mark_returned_by_tracking`) khớp bất kỳ mã nào
  // trong 3 mã của hành trình rồi set `status = returned` — kể cả mã GỬI ĐI
  // của đơn `one_way` khi khách từ chối nhận. Đây cũng là nguồn sự thật mà
  // badge "Đã nhận" đang tin, nên phải mở §5 bất kể `shippingForm`/nhóm mã.
  const warehouse = warehouseByRecallCode || journeyStatus === "returned";

  const returnBlock = shippingForm === "warranty_recall" && isRecallDelivered;

  // Không chốt được phương án khi chưa biết hàng hỏng thế nào → phụ thuộc
  // warehouse, không bao giờ hiện một mình.
  const resolution = warehouse && inspectionResult.trim() !== "";

  return { warehouse, resolution, returnBlock, feedback, claim };
}
