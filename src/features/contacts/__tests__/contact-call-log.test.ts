import { describe, expect, it } from "vitest";

import type { CallInfo } from "@/features/callcenter/webphone-call-state";
import { evaluateTrackedCallEnd, type TrackedCall } from "@/features/contacts/contact-call-log";

const tracked: TrackedCall = { customerId: 7, phone: "0912345678", dialedAt: 1_000_000 };

function outCall(overrides: Partial<CallInfo> = {}): CallInfo {
  return { direction: "out", phone: "0912345678", ...overrides };
}

describe("evaluateTrackedCallEnd", () => {
  it("cuộc gọi out đã bắt máy kết thúc → log answered + duration từ startedAt", () => {
    const result = evaluateTrackedCallEnd(
      "in-call",
      outCall({ startedAt: 1_010_000 }),
      tracked,
      1_070_000,
    );
    expect(result).toEqual({ customerId: 7, duration_s: 60, answered: true });
  });

  it("cuộc gọi out kết thúc khi đang dialing (không bắt máy) → answered=false, duration 0", () => {
    const result = evaluateTrackedCallEnd("dialing", outCall(), tracked, 1_070_000);
    expect(result).toEqual({ customerId: 7, duration_s: 0, answered: false });
  });

  it("thiếu startedAt (SDK không echo answer) → fallback duration từ dialedAt", () => {
    const result = evaluateTrackedCallEnd("in-call", outCall(), tracked, 1_030_000);
    expect(result).toEqual({ customerId: 7, duration_s: 30, answered: true });
  });

  it("cuộc gọi INBOUND kết thúc khi ref còn armed → KHÔNG log", () => {
    const inbound: CallInfo = { direction: "in", phone: "0999999999" };
    expect(evaluateTrackedCallEnd("in-call", inbound, tracked, 1_070_000)).toBeNull();
  });

  it("số điện thoại không khớp cuộc gọi đã dial → KHÔNG log", () => {
    expect(
      evaluateTrackedCallEnd("in-call", outCall({ phone: "0888888888" }), tracked, 1_070_000),
    ).toBeNull();
  });

  it("không có tracked call (ref rỗng) → KHÔNG log", () => {
    expect(evaluateTrackedCallEnd("in-call", outCall(), null, 1_070_000)).toBeNull();
  });

  it("prevStatus đã idle (không phải transition kết thúc) → KHÔNG log", () => {
    expect(evaluateTrackedCallEnd("idle", outCall(), tracked, 1_070_000)).toBeNull();
  });

  it("prevCall null (không có cuộc gọi trước đó) → KHÔNG log", () => {
    expect(evaluateTrackedCallEnd("dialing", null, tracked, 1_070_000)).toBeNull();
  });
});
