import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";

const fetchJson = vi.fn();
vi.mock("@/services/http", () => ({
  fetchJson: (...args: unknown[]) => fetchJson(...args),
  getValidAccessToken: vi.fn().mockResolvedValue(null),
}));

import { MediaAccessGate } from "@/features/media/components/MediaAccessGate";
import { I18nProvider } from "@/i18n";
import { renderWithClient } from "@/test/utils";

// `MediaAccessGate` dùng useI18n(), context này throw nếu không có Provider bọc
// ngoài (xem src/i18n.tsx) — renderWithClient gốc chỉ bọc QueryClientProvider
// nên bọc thêm I18nProvider ở đây, giữ nguyên các assertion trong brief.
describe("MediaAccessGate", () => {
  it("chưa provisioned → hướng dẫn, không render children", async () => {
    fetchJson.mockResolvedValueOnce({
      provisioned: false,
      mode: null,
      role: null,
      remote_user: null,
      public_base_url: "",
      connection_ok: true,
    });
    renderWithClient(
      <I18nProvider>
        <MediaAccessGate>{() => <p>NỘI DUNG</p>}</MediaAccessGate>
      </I18nProvider>,
    );
    expect(await screen.findByText(/chưa được cấp quyền Media/i)).toBeInTheDocument();
    expect(screen.queryByText("NỘI DUNG")).toBeNull();
  });

  it("provisioned → render children với me; connection lỗi → banner", async () => {
    fetchJson.mockResolvedValueOnce({
      provisioned: true,
      mode: "personal",
      role: "uploader",
      remote_user: null,
      public_base_url: "https://m",
      connection_ok: false,
    });
    renderWithClient(
      <I18nProvider>
        <MediaAccessGate>{(me) => <p>ROLE:{me.role}</p>}</MediaAccessGate>
      </I18nProvider>,
    );
    expect(await screen.findByText("ROLE:uploader")).toBeInTheDocument();
    expect(screen.getByText(/Kết nối Media đang lỗi/i)).toBeInTheDocument();
  });
});
