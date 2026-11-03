import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useWebphone } from "../webphone-context";
import { WebphoneFollowerProvider } from "../WebphoneFollowerProvider";
import { initialSharedState, type TabMessage } from "../webphone-tabs";
import { FakeBroadcastChannel } from "./fake-tabs";

function Probe() {
  const { callState, isLeader, enabled, dialCall } = useWebphone();
  return (
    <div>
      <span>{`${callState}|${String(isLeader)}|${String(enabled)}`}</span>
      <button onClick={() => dialCall("+84 912 345 678")}>probe-dial</button>
    </div>
  );
}

/** "Tab chủ" giả: nghe action, phát state. */
function fakeLeader() {
  const received: TabMessage[] = [];
  const bc = new FakeBroadcastChannel("desi-webphone");
  bc.onmessage = (e) => received.push(e.data as TabMessage);
  return {
    received,
    publish(state: Partial<typeof initialSharedState>) {
      act(() => bc.postMessage({ type: "state", state: { ...initialSharedState, ...state } }));
    },
  };
}

describe("WebphoneFollowerProvider", () => {
  const original = globalThis.BroadcastChannel;
  beforeEach(() => {
    FakeBroadcastChannel.reset();
    (globalThis as { BroadcastChannel: unknown }).BroadcastChannel = FakeBroadcastChannel;
  });
  afterEach(() => {
    (globalThis as { BroadcastChannel: unknown }).BroadcastChannel = original;
  });

  it("asks the leader for state on mount and mirrors what it publishes", () => {
    const leader = fakeLeader();
    render(
      <WebphoneFollowerProvider canUse>
        <Probe />
      </WebphoneFollowerProvider>,
    );
    expect(leader.received).toEqual([{ type: "action", action: { type: "request-state" } }]);
    expect(screen.getByText("idle|false|false")).toBeInTheDocument();
    leader.publish({ enabled: true, notReadyReason: null, callState: "dialing" });
    expect(screen.getByText("dialing|false|true")).toBeInTheDocument();
  });

  it("incoming call → panel opens here too; Nghe máy is forwarded to the leader", async () => {
    const leader = fakeLeader();
    render(
      <WebphoneFollowerProvider canUse>
        <Probe />
      </WebphoneFollowerProvider>,
    );
    leader.publish({
      enabled: true,
      notReadyReason: null,
      callState: "ringing",
      currentCall: { direction: "in", phone: "0900000001", callId: "c1" },
    });
    expect(screen.getByText("0900000001")).toBeInTheDocument();
    expect(screen.getByText(/phát ở tab ERP đang giữ tổng đài/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /nghe máy/i, hidden: true }));
    expect(leader.received[leader.received.length - 1]).toEqual({
      type: "action",
      action: { type: "answer" },
    });
  });

  it("dial forwards a sanitized number when the leader is ready", async () => {
    const leader = fakeLeader();
    render(
      <WebphoneFollowerProvider canUse>
        <Probe />
      </WebphoneFollowerProvider>,
    );
    leader.publish({ enabled: true, notReadyReason: null });
    await userEvent.click(screen.getByText("probe-dial"));
    expect(leader.received[leader.received.length - 1]).toEqual({
      type: "action",
      action: { type: "dial", phone: "0912345678" },
    });
  });

  it("does nothing without permission", () => {
    const leader = fakeLeader();
    render(
      <WebphoneFollowerProvider canUse={false}>
        <Probe />
      </WebphoneFollowerProvider>,
    );
    expect(leader.received).toEqual([]);
  });
});
