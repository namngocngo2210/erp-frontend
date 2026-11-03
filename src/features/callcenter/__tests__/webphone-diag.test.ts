import { afterEach, describe, expect, it, vi } from "vitest";

import {
  diagCopyToClipboard,
  diagEntryCount,
  diagRecord,
  diagReset,
  diagSetRole,
  diagSnapshot,
} from "../webphone-diag";

describe("webphone-diag", () => {
  afterEach(() => {
    diagReset();
    vi.restoreAllMocks();
  });

  it("records entries with role header and stringified detail", () => {
    diagSetRole("leader");
    diagRecord("event ring objectId=1038", { callType: "CALL_INBOUND", caller: "0900" });
    diagRecord("sdk.log", "session ended Terminated");
    const text = diagSnapshot();
    expect(text).toMatch(/^# webphone log — role=leader/);
    expect(text).toContain('event ring objectId=1038 {"callType":"CALL_INBOUND","caller":"0900"}');
    expect(text).toContain("sdk.log session ended Terminated");
  });

  it("caps the buffer at 400 entries (oldest dropped)", () => {
    for (let i = 0; i < 450; i++) diagRecord(`e${i}`);
    expect(diagEntryCount()).toBe(400);
    const text = diagSnapshot();
    expect(text).not.toContain(" e0\n");
    expect(text).toContain(" e449");
  });

  it("copies via clipboard when available, falls back to console.warn otherwise", async () => {
    diagRecord("x");
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    expect(await diagCopyToClipboard()).toBe(true);
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining(" x"));

    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await diagCopyToClipboard()).toBe(false);
    expect(warn).toHaveBeenCalled();
  });
});
