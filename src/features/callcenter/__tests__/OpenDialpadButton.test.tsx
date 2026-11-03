import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { OpenDialpadButton } from "../OpenDialpadButton";
import { WebphoneContext, type WebphoneContextValue } from "../webphone-context";

const base: WebphoneContextValue = {
  canUse: true,
  enabled: true,
  visible: false,
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

function renderWith(value: Partial<WebphoneContextValue>) {
  return render(
    <WebphoneContext.Provider value={{ ...base, ...value }}>
      <OpenDialpadButton />
    </WebphoneContext.Provider>,
  );
}

describe("OpenDialpadButton", () => {
  it("renders nothing for users without call-center permission", () => {
    renderWith({ canUse: false });
    expect(screen.queryByRole("button", { name: "Quay số" })).not.toBeInTheDocument();
  });

  it("opens the webphone panel on click", async () => {
    const setVisible = vi.fn();
    renderWith({ setVisible });
    await userEvent.click(screen.getByRole("button", { name: "Quay số" }));
    expect(setVisible).toHaveBeenCalledWith(true);
  });
});
