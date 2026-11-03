import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "@/i18n";
import type { DepartmentTeam } from "@/lib/api/teams";

const createMutate = vi.fn();
const updateMutate = vi.fn();
const deleteMutate = vi.fn();

let teamsData: DepartmentTeam[];

/** Nguồn ô chọn thành viên là TÀI KHOẢN của phòng ban, không phải hồ sơ nhân sự. */
const assignableUsers = [
  { id: 10, display_name: "An", username: "an.nv" },
  { id: 11, display_name: "", username: "binh.nv" },
];

vi.mock("@/features/users/queries", () => ({
  useDepartmentTeams: () => ({ data: teamsData }),
  useAssignableUsers: () => ({ data: assignableUsers }),
  useCreateTeam: () => ({ mutate: createMutate, isPending: false }),
  useUpdateTeam: () => ({ mutate: updateMutate, isPending: false }),
  useDeleteTeam: () => ({ mutate: deleteMutate, isPending: false }),
}));

import { DepartmentTeamsManager } from "@/features/users/components/DepartmentTeamsManager";

function renderManager() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <I18nProvider>{children}</I18nProvider>
    </QueryClientProvider>
  );
  return render(<DepartmentTeamsManager departmentId={1} />, { wrapper });
}

afterEach(() => {
  cleanup();
  createMutate.mockReset();
  updateMutate.mockReset();
  deleteMutate.mockReset();
});

describe("DepartmentTeamsManager (đội nhóm gắn tài khoản)", () => {
  it("liệt kê đội nhóm hiện có kèm trưởng nhóm", () => {
    teamsData = [
      {
        id: 5,
        name: "Nhóm Alpha",
        department: 1,
        created_at: "2026-08-23T00:00:00Z",
        lead: { id: 10, display_name: "An", username: "an.nv" },
        members: [{ id: 10, display_name: "An", username: "an.nv" }],
      },
    ];

    renderManager();

    expect(screen.getByText("Nhóm Alpha")).toBeInTheDocument();
    expect(screen.getByText(/An/)).toBeInTheDocument();
  });

  it("nhập tên rồi Lưu gọi createTeam với payload theo tài khoản", () => {
    teamsData = [];
    renderManager();

    fireEvent.click(screen.getByText("Thêm đội nhóm"));
    fireEvent.change(screen.getByPlaceholderText("Tên đội nhóm"), {
      target: { value: "Nhóm Mới" },
    });
    fireEvent.click(screen.getByText("Lưu"));

    expect(createMutate).toHaveBeenCalledTimes(1);
    expect(createMutate.mock.calls[0][0]).toEqual({
      departmentId: 1,
      payload: { name: "Nhóm Mới", lead_user_id: null, member_user_ids: [] },
    });
  });

  it("không nhập tên thì KHÔNG gọi createTeam", () => {
    teamsData = [];
    renderManager();

    fireEvent.click(screen.getByText("Thêm đội nhóm"));
    fireEvent.click(screen.getByText("Lưu"));

    expect(createMutate).not.toHaveBeenCalled();
  });

  it("tài khoản chưa đặt tên vẫn hiện trong ô chọn, hiển thị bằng username", () => {
    teamsData = [];
    renderManager();

    fireEvent.click(screen.getByText("Thêm đội nhóm"));
    fireEvent.click(screen.getByText("Chọn thành viên"));

    // Nguồn là tài khoản nên người chưa đặt `display_name` KHÔNG được rơi mất —
    // đúng chỗ ô chọn cũ (lấy từ hồ sơ HR) bỏ sót 35/38 người.
    expect(screen.getAllByText(/binh\.nv/).length).toBeGreaterThan(0);
  });

  it("xoá đội nhóm gọi deleteTeam với đúng id", () => {
    teamsData = [
      {
        id: 7,
        name: "Nhóm Beta",
        department: 1,
        created_at: "2026-08-23T00:00:00Z",
        lead: null,
        members: [],
      },
    ];
    renderManager();

    fireEvent.click(screen.getByLabelText("Xoá đội nhóm Nhóm Beta"));

    expect(deleteMutate).toHaveBeenCalledWith(7, expect.anything());
  });
});
