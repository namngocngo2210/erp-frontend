import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  claimLeadership,
  isTabMessage,
  openWebphoneChannel,
  type TabMessage,
} from "../webphone-tabs";
import { FakeBroadcastChannel, FakeLockManager } from "./fake-tabs";

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("isTabMessage", () => {
  it("accepts state/action, rejects junk", () => {
    expect(isTabMessage({ type: "state", state: {} })).toBe(true);
    expect(isTabMessage({ type: "action", action: { type: "dial", phone: "0" } })).toBe(true);
    expect(isTabMessage({ type: "action", action: null })).toBe(false);
    expect(isTabMessage({ type: "webphone:event" })).toBe(false);
    expect(isTabMessage("x")).toBe(false);
  });
});

describe("openWebphoneChannel", () => {
  const original = globalThis.BroadcastChannel;
  beforeEach(() => {
    FakeBroadcastChannel.reset();
    (globalThis as { BroadcastChannel: unknown }).BroadcastChannel = FakeBroadcastChannel;
  });
  afterEach(() => {
    (globalThis as { BroadcastChannel: unknown }).BroadcastChannel = original;
  });

  it("delivers tab messages to OTHER tabs only, ignores non-tab payloads", () => {
    const a = openWebphoneChannel();
    const b = openWebphoneChannel();
    const gotA: TabMessage[] = [];
    const gotB: TabMessage[] = [];
    a?.subscribe((m) => gotA.push(m));
    b?.subscribe((m) => gotB.push(m));
    a?.post({ type: "action", action: { type: "request-state" } });
    // payload lạ trên cùng bus (extension / code cũ) — bỏ qua.
    new FakeBroadcastChannel("desi-webphone").postMessage({ hello: 1 });
    expect(gotA).toEqual([]);
    expect(gotB).toEqual([{ type: "action", action: { type: "request-state" } }]);
    a?.close();
    b?.close();
  });

  it("returns null without BroadcastChannel", () => {
    (globalThis as { BroadcastChannel: unknown }).BroadcastChannel = undefined;
    expect(openWebphoneChannel()).toBeNull();
  });
});

describe("claimLeadership", () => {
  it("without Web Locks → leader immediately (single-tab behaviour)", () => {
    const original = navigator.locks;
    Object.defineProperty(navigator, "locks", { value: undefined, configurable: true });
    try {
      const onLeader = vi.fn();
      claimLeadership(onLeader);
      expect(onLeader).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(navigator, "locks", { value: original, configurable: true });
    }
  });

  it("second tab waits; becomes leader when the first releases", async () => {
    const original = navigator.locks;
    Object.defineProperty(navigator, "locks", { value: new FakeLockManager(), configurable: true });
    try {
      const first = vi.fn();
      const second = vi.fn();
      const releaseFirst = claimLeadership(first);
      await flush();
      const releaseSecond = claimLeadership(second);
      await flush();
      expect(first).toHaveBeenCalledTimes(1);
      expect(second).not.toHaveBeenCalled();
      releaseFirst();
      await flush();
      expect(second).toHaveBeenCalledTimes(1);
      releaseSecond();
    } finally {
      Object.defineProperty(navigator, "locks", { value: original, configurable: true });
    }
  });

  it("releasing while still waiting aborts without becoming leader", async () => {
    const original = navigator.locks;
    Object.defineProperty(navigator, "locks", { value: new FakeLockManager(), configurable: true });
    try {
      const first = vi.fn();
      const second = vi.fn();
      const releaseFirst = claimLeadership(first);
      await flush();
      const releaseSecond = claimLeadership(second);
      releaseSecond();
      releaseFirst();
      await flush();
      expect(second).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(navigator, "locks", { value: original, configurable: true });
    }
  });
});
