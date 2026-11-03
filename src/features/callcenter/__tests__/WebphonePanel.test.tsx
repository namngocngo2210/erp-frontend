import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WebphoneContext, useWebphone, type WebphoneContextValue } from "../webphone-context";
import { WebphonePanel } from "../WebphonePanel";

function Probe() {
  const { callState, canUse } = useWebphone();
  return <div>{`${callState}|${String(canUse)}`}</div>;
}

describe("webphone-context", () => {
  it("provides safe defaults outside provider", () => {
    render(<Probe />);
    expect(screen.getByText("idle|false")).toBeInTheDocument();
  });
});

const base: WebphoneContextValue = {
  canUse: true,
  enabled: true,
  visible: true,
  setVisible: () => {},
  dialCall: () => {},
  callState: "idle",
  currentCall: null,
  muted: false,
  held: false,
  answer: () => {},
  hangup: () => {},
  toggleMute: () => {},
  toggleHold: () => {},
  sendCommand: () => {},
  setAgentStatus: () => {},
  setPhoneType: () => {},
  agentStatus: null,
  phoneType: null,
  voiceActivated: null,
  activateVoice: () => {},
  lastOutcome: null,
  dismissOutcome: () => {},
  loggedIn: false,
  loginStalled: false,
  reconnect: () => {},
  isLeader: true,
};

function renderPanel(value: Partial<WebphoneContextValue>) {
  return render(
    <WebphoneContext.Provider value={{ ...base, ...value }}>
      <WebphonePanel />
    </WebphoneContext.Provider>,
  );
}

describe("WebphonePanel", () => {
  it("idle: dialpad dials typed number", async () => {
    const dialCall = vi.fn();
    renderPanel({ dialCall });
    await userEvent.click(screen.getByRole("button", { name: "9" }));
    await userEvent.click(screen.getByRole("button", { name: "1" }));
    await userEvent.click(screen.getByRole("button", { name: /gọi đi/i }));
    expect(dialCall).toHaveBeenCalledWith("91");
  });

  it("ringing inbound: shows caller and answer/reject", async () => {
    const answer = vi.fn();
    const hangup = vi.fn();
    renderPanel({
      callState: "ringing",
      currentCall: { direction: "in", phone: "0900000001", callId: "c1" },
      answer,
      hangup,
    });
    expect(screen.getByText("0900000001")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /nghe máy/i }));
    expect(answer).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /từ chối/i }));
    expect(hangup).toHaveBeenCalled();
  });

  it("in-call: shows controls and hangup works", async () => {
    const hangup = vi.fn();
    const toggleMute = vi.fn();
    renderPanel({
      callState: "in-call",
      currentCall: {
        direction: "out",
        phone: "0912345678",
        callId: "c2",
        startedAt: Date.now() - 65_000,
      },
      hangup,
      toggleMute,
    });
    expect(screen.getByText("0912345678")).toBeInTheDocument();
    expect(screen.getByText(/01:0\d/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /tắt tiếng/i }));
    expect(toggleMute).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /tắt máy/i }));
    expect(hangup).toHaveBeenCalled();
  });

  it("idle: agent status select changes availability", async () => {
    const setAgentStatus = vi.fn();
    renderPanel({ agentStatus: "AVAILABLE", voiceActivated: true, setAgentStatus });
    expect(screen.queryByText(/chưa nhận cuộc gọi đến/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("combobox", { name: /trạng thái nhận cuộc gọi/i }));
    await userEvent.click(screen.getByRole("option", { name: /không nhận cuộc gọi/i }));
    expect(setAgentStatus).toHaveBeenCalledWith("NOT AVAILABLE");
  });

  it("idle: chưa đăng nhập → 'Đang đăng nhập'; đăng nhập rồi nhưng không rõ trạng thái → nút Đặt Sẵn sàng", async () => {
    const setAgentStatus = vi.fn();
    const { unmount } = renderPanel({ loggedIn: false, agentStatus: null });
    expect(screen.getByText(/đang đăng nhập tổng đài/i)).toBeInTheDocument();
    unmount();
    renderPanel({ loggedIn: true, agentStatus: null, setAgentStatus });
    expect(screen.getByText(/không rõ trạng thái/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /đặt sẵn sàng/i }));
    expect(setAgentStatus).toHaveBeenCalledWith("AVAILABLE");
  });

  it("idle: đăng nhập treo → cảnh báo + Kết nối lại", async () => {
    const reconnect = vi.fn();
    renderPanel({ loggedIn: false, loginStalled: true, reconnect });
    expect(screen.getByText(/chưa đăng nhập được tổng đài/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /kết nối lại/i }));
    expect(reconnect).toHaveBeenCalled();
  });

  it("idle: voice not activated → banner with activate button", async () => {
    const activateVoice = vi.fn();
    renderPanel({ agentStatus: "AVAILABLE", voiceActivated: false, activateVoice });
    expect(screen.getByText(/chưa nhận cuộc gọi đến/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /kích hoạt/i }));
    expect(activateVoice).toHaveBeenCalled();
  });

  it("idle with outcome: banner + Gọi lại + đóng", async () => {
    const dialCall = vi.fn();
    const dismissOutcome = vi.fn();
    renderPanel({
      dialCall,
      dismissOutcome,
      lastOutcome: {
        phone: "0912345678",
        outcome: { title: "Máy bận", detail: "Lỗi 488: thuê bao bận!", tone: "error" },
      },
    });
    expect(screen.getByText("Máy bận")).toBeInTheDocument();
    expect(screen.getByText("0912345678")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /gọi lại/i }));
    expect(dialCall).toHaveBeenCalledWith("0912345678");
    await userEvent.click(screen.getByRole("button", { name: /đóng kết quả/i }));
    expect(dismissOutcome).toHaveBeenCalled();
  });

  it("dialing: shows ringing label", () => {
    renderPanel({
      callState: "dialing",
      currentCall: { direction: "out", phone: "0912345678" },
    });
    expect(screen.getByText(/đang đổ chuông/i)).toBeInTheDocument();
  });
});
