import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/roles", () => ({
  listRoles: vi.fn(),
  listPermissions: vi.fn(),
  fetchOrderFieldCatalog: vi.fn(),
  createRole: vi.fn(),
  updateRole: vi.fn(),
  deleteRole: vi.fn(),
}));
vi.mock("sonner", async () => (await import("@/test/utils")).makeToastMock());

import * as api from "@/lib/api/roles";
import type { PermissionRow, Role } from "@/lib/api/roles";
import RolesPage from "@/pages/RolesPage";
import { ACTION_LABELS } from "@/features/roles/constants";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { I18nProvider } from "@/i18n";
import { answerConfirm, renderWithClient } from "@/test/utils";
import { mockViewportWidth, restoreViewport } from "@/test/viewport";

const role = (patch: Partial<Role>) =>
  ({
    id: 1,
    name: "Sale",
    description: "",
    is_system: false,
    is_active: true,
    scope_default: "own",
    permission_codes: [],
    section_scopes: {},
    field_rules: [],
    field_grants: [],
    ...patch,
  }) as Role;

const ROLES = [
  role({ id: 1, name: "Sale miền Bắc", permission_codes: ["orders:edit"] }),
  role({ id: 2, name: "Kế toán" }),
];
const PERMS = [
  { section: "orders", action: "view", code: "orders:view", label: "Xem đơn" },
  { section: "orders", action: "edit", code: "orders:edit", label: "Sửa đơn" },
] as PermissionRow[];

function LocationProbe() {
  return <output data-testid="location-search">{useLocation().search}</output>;
}

const currentSearch = () => screen.getByTestId("location-search").textContent;

function renderPage(entry = "/settings/roles") {
  return renderWithClient(
    <I18nProvider>
      <ConfirmProvider>
        <MemoryRouter initialEntries={[entry]}>
          <RolesPage />
          <LocationProbe />
        </MemoryRouter>
      </ConfirmProvider>
    </I18nProvider>,
  );
}

beforeEach(() => {
  vi.mocked(api.listRoles).mockResolvedValue(structuredClone(ROLES));
  vi.mocked(api.listPermissions).mockResolvedValue(PERMS);
  vi.mocked(api.fetchOrderFieldCatalog).mockResolvedValue({ groups: [] });
  vi.mocked(api.updateRole).mockImplementation(async (id) => ROLES.find((r) => r.id === id)!);
});

afterEach(() => {
  restoreViewport();
  vi.clearAllMocks();
});

describe("RolesPage — mobile (<1024) master → detail", () => {
  beforeEach(() => mockViewportWidth(375));

  it("danh sách full màn → chọn role mở chi tiết (?role) → ‹ Vai trò quay về danh sách", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /Kế toán/ }));

    expect(await screen.findByRole("heading", { name: "Kế toán" })).toBeInTheDocument();
    expect(currentSearch()).toBe("?role=2");
    // Danh sách ẩn ở chế độ chi tiết, tab quyền hiện.
    expect(screen.queryByPlaceholderText("Tìm vai trò...")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Quyền hạn/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Vai trò" }));

    expect(await screen.findByPlaceholderText("Tìm vai trò...")).toBeInTheDocument();
    expect(currentSearch()).toBe("");
    expect(screen.queryByRole("heading", { name: "Kế toán" })).not.toBeInTheDocument();
  });

  it("header gọn: nút + icon 'Tạo vai trò', không có mô tả", async () => {
    renderPage();
    await screen.findByRole("button", { name: /Kế toán/ });
    expect(screen.getByRole("button", { name: "Tạo vai trò" })).toBeInTheDocument();
    expect(screen.queryByText(/phân quyền theo hành động/)).not.toBeInTheDocument();
  });

  it("mở thẳng ?role=1 → chi tiết; thanh đáy Lưu disabled tới khi có thay đổi rồi gọi save", async () => {
    const user = userEvent.setup();
    renderPage("/settings/roles?role=1");

    expect(await screen.findByRole("heading", { name: "Sale miền Bắc" })).toBeInTheDocument();
    // Chỉ còn 1 nút Lưu (thanh đáy) — nút trong header chi tiết đã ẩn ở mobile.
    const saves = screen.getAllByRole("button", { name: /Lưu thay đổi/ });
    expect(saves).toHaveLength(1);
    expect(saves[0]).toBeDisabled();

    await user.click(await screen.findByRole("button", { name: ACTION_LABELS.view }));
    expect(saves[0]).toBeEnabled();
    await user.click(saves[0]);

    await waitFor(() => expect(api.updateRole).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.updateRole).mock.calls[0][0]).toBe(1);
  });

  it("quay lại khi còn thay đổi chưa lưu → hỏi; Ở lại giữ chi tiết", async () => {
    const user = userEvent.setup();
    renderPage("/settings/roles?role=1");

    await user.click(await screen.findByRole("button", { name: ACTION_LABELS.view }));
    await user.click(screen.getByRole("button", { name: "Vai trò" }));
    await answerConfirm(user, false);

    expect(screen.getByRole("heading", { name: "Sale miền Bắc" })).toBeInTheDocument();
    expect(currentSearch()).toBe("?role=1");
  });

  it("menu ⋯ ở thanh đáy mở hộp thoại xoá", async () => {
    const user = userEvent.setup();
    renderPage("/settings/roles?role=2");

    await user.click(await screen.findByRole("button", { name: "Thao tác khác" }));
    await user.click(screen.getByRole("menuitem", { name: /Xóa vai trò/ }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Kế toán")).toBeInTheDocument();
  });
});

describe("RolesPage — desktop (≥1024)", () => {
  beforeEach(() => mockViewportWidth(1280));

  it("hiện 2 cột: danh sách + chi tiết cùng lúc, chọn role ghi ?role", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /Kế toán/ }));

    expect(await screen.findByRole("heading", { name: "Kế toán" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Tìm vai trò...")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Vai trò" })).not.toBeInTheDocument();
    expect(screen.getByText(/phân quyền theo hành động/)).toBeInTheDocument();
    expect(currentSearch()).toBe("?role=2");
  });
});
