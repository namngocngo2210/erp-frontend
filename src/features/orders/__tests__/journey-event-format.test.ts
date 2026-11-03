import { describe, expect, it } from "vitest";

import type { CrmCatalogPayload } from "@/features/orders/BlockCrmRating";
import { describeJourneyEvent, journeyActorName } from "@/features/orders/journey-event-format";
import type { OrderJourneyEventRow } from "@/features/orders/order-types";

const CATALOG: CrmCatalogPayload = {
  sales_status_options: [
    { code: "no_answer_1", label: "Không nghe máy lần 1" },
    { code: "closed", label: "Đã chốt" },
  ],
  customer_classification_options: [{ code: "easy_close", label: "Dễ tính - chốt ngay" }],
};

function event(overrides: Partial<OrderJourneyEventRow>): OrderJourneyEventRow {
  return { id: 1, event_type: "sales_status_changed", ...overrides };
}

describe("describeJourneyEvent", () => {
  it("đổi mã sang nhãn theo payload_json.field", () => {
    const result = describeJourneyEvent(
      event({
        event_type_label: "Đổi trạng thái chốt sale",
        from_code: "no_answer_1",
        to_code: "closed",
        payload_json: { field: "sales_status_code" },
      }),
      CATALOG,
    );
    expect(result.title).toBe("Đổi trạng thái chốt sale");
    expect(result.change).toBe("Không nghe máy lần 1 → Đã chốt");
  });

  it("suy ngược field từ payload khi assessment_created không có payload.field", () => {
    const result = describeJourneyEvent(
      event({
        event_type: "assessment_created",
        event_type_label: "Tạo đánh giá CRM",
        to_code: "easy_close",
        payload_json: {
          sales_status_code: null,
          customer_classification_code: "easy_close",
        },
      }),
      CATALOG,
    );
    expect(result.change).toBe("— → Dễ tính - chốt ngay");
  });

  it("giữ mã raw khi mã đã bị gỡ khỏi catalog", () => {
    const result = describeJourneyEvent(
      event({ to_code: "legacy_code", payload_json: { field: "sales_status_code" } }),
      CATALOG,
    );
    expect(result.change).toBe("— → legacy_code");
  });

  it("không lặp from → to cho event đã tự mô tả trong note", () => {
    expect(
      describeJourneyEvent(
        event({
          event_type: "order_field_changed",
          from_code: "100000",
          to_code: "120000",
          note: "Phí vận chuyển: 100000 → 120000",
        }),
        CATALOG,
      ).change,
    ).toBe("");
    expect(
      describeJourneyEvent(
        event({ event_type: "staff_changed", from_code: "3", to_code: "9" }),
        CATALOG,
      ).change,
    ).toBe("");
    expect(
      describeJourneyEvent(
        event({ event_type: "staff_ingest_designated", from_code: "3", to_code: "9" }),
        CATALOG,
      ).change,
    ).toBe("");
  });

  it("trả change rỗng khi event không mang from/to", () => {
    expect(describeJourneyEvent(event({ event_type: "sale_contact" }), CATALOG).change).toBe("");
  });

  it("fallback về event_type raw khi backend chưa có nhãn", () => {
    expect(describeJourneyEvent(event({ event_type: "unknown_event" }), CATALOG).title).toBe(
      "unknown_event",
    );
  });
});

describe("journeyActorName", () => {
  it("hiện tên người thực hiện", () => {
    expect(journeyActorName(event({ actor_name: "Trần Nam" }))).toBe("Trần Nam");
  });

  it('event không có actor (AI / cron) hiện "Hệ thống"', () => {
    expect(journeyActorName(event({ actor_name: null }))).toBe("Hệ thống");
  });

  it("không có actor thì hiện nguồn từ payload_json.source", () => {
    expect(
      journeyActorName(event({ actor_name: null, payload_json: { source: "kiotviet_webhook" } })),
    ).toBe("KiotViet");
  });

  it("trạng thái vận chuyển thực do webhook Pancake ghi hiện nguồn Pancake POS", () => {
    expect(
      journeyActorName(
        event({
          event_type: "delivery_business_status_changed",
          actor_name: null,
          payload_json: { source: "pancake_pos" },
        }),
      ),
    ).toBe("Pancake POS");
  });

  it("actor luôn ưu tiên hơn nguồn", () => {
    expect(
      journeyActorName(
        event({ actor_name: "Trần Nam", payload_json: { source: "kiotviet_action" } }),
      ),
    ).toBe("Trần Nam");
  });

  it('dòng "Tạo đơn" của đơn cũ hiện "Không rõ" thay vì "Hệ thống"', () => {
    expect(
      journeyActorName(
        event({
          event_type: "order_created",
          actor_name: null,
          payload_json: { source: "legacy" },
        }),
      ),
    ).toBe("Không rõ");
  });

  it('nguồn lạ vẫn hiện "Hệ thống"', () => {
    expect(journeyActorName(event({ actor_name: null, payload_json: { source: "cron_x" } }))).toBe(
      "Hệ thống",
    );
  });
});
