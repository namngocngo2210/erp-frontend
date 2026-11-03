import { describe, expect, it } from "vitest";

import {
  outcomeFromEnd,
  outcomeFromOutcallError,
  outcomeFromOutcallResponse,
} from "../call-outcome";

describe("outcomeFromOutcallError", () => {
  it("máy bận / khách từ chối / không bắt máy có nhãn ngắn + message gốc", () => {
    expect(outcomeFromOutcallError(488)).toMatchObject({ title: "Máy bận", tone: "error" });
    expect(outcomeFromOutcallError(486)).toMatchObject({ title: "Khách từ chối cuộc gọi" });
    expect(outcomeFromOutcallError(408)?.detail).toMatch(/408/);
  });
  it("430 voicemail là info; mã lạ → undefined", () => {
    expect(outcomeFromOutcallError(430)?.tone).toBe("info");
    expect(outcomeFromOutcallError(999)).toBeUndefined();
  });
});

describe("outcomeFromOutcallResponse", () => {
  it("OK → undefined, lỗi → Không gọi được + message", () => {
    expect(outcomeFromOutcallResponse("OK")).toBeUndefined();
    expect(outcomeFromOutcallResponse("IN_BLACKLIST")).toMatchObject({
      title: "Không gọi được",
      detail: "Khách hàng trong blacklist!",
    });
  });
});

describe("outcomeFromEnd", () => {
  it("đã nghe rồi thì kết thúc bình thường → undefined", () => {
    expect(
      outcomeFromEnd({ status: "BUSY" }, { answered: true, direction: "out" }),
    ).toBeUndefined();
  });
  it("gọi ra chưa nghe: quét từ khoá trong data (status/reason/cause SIP)", () => {
    expect(outcomeFromEnd({ status: "BUSY" }, { answered: false, direction: "out" })?.title).toBe(
      "Máy bận",
    );
    expect(
      outcomeFromEnd({ reason: "Rejected", source: "sip" }, { answered: false, direction: "out" })
        ?.title,
    ).toBe("Khách từ chối cuộc gọi");
    expect(
      outcomeFromEnd({ cause: "NO_ANSWER" }, { answered: false, direction: "out" })?.title,
    ).toBe("Khách không bắt máy");
  });
  it("gọi ra chưa nghe, không có lý do → nhãn mặc định", () => {
    expect(outcomeFromEnd({}, { answered: false, direction: "out" })?.title).toBe(
      "Khách không bắt máy hoặc từ chối",
    );
  });
  it("gọi đến chưa nghe → cuộc gọi nhỡ (kể cả SIP Canceled)", () => {
    expect(
      outcomeFromEnd({ reason: "Canceled" }, { answered: false, direction: "in" })?.title,
    ).toBe("Cuộc gọi nhỡ");
    expect(outcomeFromEnd({}, { answered: false, direction: "in" })?.title).toBe("Cuộc gọi nhỡ");
  });
});
