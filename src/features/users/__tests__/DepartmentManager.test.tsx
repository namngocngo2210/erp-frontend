import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "@/i18n";
import type { Department } from "@/features/users/types";

// Ô "Trưởng phòng" vẫn thuộc `hr` — cố ý ngoài phạm vi lần này, chỉ mock cho chạy.
vi.mock("@/features/hr/queries", () => ({
  useDepartmentOrg: () => ({ data: [] }),
  useEmployees: () => ({ data: { items: [] } }),
  useSetDepartmentHead: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/features/users/queries", () => ({
  useDepartmentTeams: () => ({ data: [] }),
  useAssignableUsers: () => ({ data: [] }),
  useCreateTeam: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateTeam: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteTeam: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { DepartmentManager } from "@/features/users/DepartmentManager";

const departments: Department[] = [
  {
    id: 1,
    name: "Sales",
    is_active: true,
    created_at: "2026-08-23T00:00:00Z",
    channel_ids: [],
    team_count: 3,
  },
  {
    id: 2,
    name: "Kho",
    is_active: true,
    created_at: "2026-08-23T00:00:00Z",
    channel_ids: [],
    team_count: 0,
  },
];

function renderManager() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <I18nProvider>{children}</I18nProvider>
    </QueryClientProvider>
  );
  return render(
    <DepartmentManager
      departments={departments}
      channels={[]}
      onCreate={vi.fn()}
      onUpdate={vi.fn()}
      onDelete={vi.fn()}
    />,
    { wrapper },
  );
}

afterEach(cleanup);

describe("DepartmentManager", () => {
  it("thẻ phòng ban hiện số đội nhóm lấy từ payload phòng ban", () => {
    renderManager();

    // Nguồn phải là `team_count` của chính phòng ban. Trước đây số này đọc từ
    // `department-org` của `hr` nên luôn hiện 0 dù đã tạo nhóm.
    expect(screen.getByText("3 đội nhóm")).toBeInTheDocument();
    expect(screen.getByText("0 đội nhóm")).toBeInTheDocument();
  });

  it("mở dialog Sửa thì có khối quản lý đội nhóm", () => {
    renderManager();

    fireEvent.click(screen.getAllByTitle("Sửa")[0]);

    expect(screen.getByText("Thêm đội nhóm")).toBeInTheDocument();
  });
});
