import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const fetchJson = vi.fn();
vi.mock("@/services/http", () => ({
  fetchJson: (...args: unknown[]) => fetchJson(...args),
  getValidAccessToken: vi.fn().mockResolvedValue(null),
}));

import MediaReportsPage from "@/features/media/pages/MediaReportsPage";
import { I18nProvider } from "@/i18n";
import { renderWithClient } from "@/test/utils";

const ME = {
  provisioned: true,
  mode: "shared",
  role: "viewer",
  remote_user: null,
  public_base_url: "https://m.example",
  connection_ok: true,
};
const OVERVIEW = {
  total_contents: 320,
  missing_tags: 12,
  missing_evaluations: 45,
  content_by_type: [{ name: "Review", total: 120 }],
};
const RATINGS = { items: [{ channel: "Facebook Ads", avg_rating: 3.8, total: 42 }] };
const QUALITY = {
  missing_tags: [{ id: 9, content_code: "C009", title: "Thiếu tag", issue: "missing_tags" }],
  missing_evaluations: [],
};

function route(url: string) {
  if (url.startsWith("/api/media/me")) return ME;
  if (url.includes("reports/overview")) return OVERVIEW;
  if (url.includes("reports/ratings-by-channel")) return RATINGS;
  if (url.includes("reports/content-quality")) return QUALITY;
  return {};
}

function renderPage() {
  fetchJson.mockImplementation((url: string) => Promise.resolve(route(url)));
  return renderWithClient(
    <I18nProvider>
      <MemoryRouter initialEntries={["/media/reports"]}>
        <MediaReportsPage />
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe("MediaReportsPage", () => {
  it("ratings-by-channel items null và overview/quality mảng null không làm vỡ trang", async () => {
    // Tái hiện crash prod: ads-crm trả items: null cho ratings-by-channel
    // (luôn vậy khi chưa có đánh giá gắn kênh nào) và content_by_type/
    // missing_tags/missing_evaluations: null khi khoảng ngày không có dữ liệu.
    // getReportOverview/getRatingsByChannel/getContentQuality phải chuẩn hoá
    // về [] trước khi tới ReportTables, nếu không .length/.map ném TypeError.
    fetchJson.mockImplementation((url: string) => {
      if (url.startsWith("/api/media/me")) return Promise.resolve(ME);
      if (url.includes("reports/overview")) {
        return Promise.resolve({
          total_contents: 0,
          missing_tags: 0,
          missing_evaluations: 0,
          content_by_type: null,
        });
      }
      if (url.includes("reports/ratings-by-channel")) return Promise.resolve({ items: null });
      if (url.includes("reports/content-quality"))
        return Promise.resolve({ missing_tags: null, missing_evaluations: null });
      return Promise.resolve({});
    });
    renderWithClient(
      <I18nProvider>
        <MemoryRouter initialEntries={["/media/reports"]}>
          <MediaReportsPage />
        </MemoryRouter>
      </I18nProvider>,
    );
    // KPI vẫn hiện số (0), các bảng hiện trạng thái rỗng thay vì throw.
    expect(await screen.findAllByText("0")).not.toHaveLength(0);
    expect(screen.getAllByText("Không có dữ liệu").length).toBeGreaterThan(0);
  });

  it("hiện KPI, bảng theo loại, rating theo kênh và danh sách chất lượng", async () => {
    renderPage();
    expect(await screen.findByText("320")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.getByText("Facebook Ads")).toBeInTheDocument();
    expect(screen.getByText("Thiếu tag")).toBeInTheDocument();
    expect(screen.getByText(/channel_id/)).toBeInTheDocument(); // ghi chú giới hạn §5.3
  });

  it("đổi khoảng ngày gửi uploaded_from/uploaded_to", async () => {
    renderPage();
    await screen.findByText("320");
    // DateFilter: preset "last_30_days" đã là mặc định → mọi request đều có uploaded_from
    expect(
      fetchJson.mock.calls.some((c) =>
        /reports\/overview\?uploaded_from=\d{4}-\d{2}-\d{2}&uploaded_to=/.test(String(c[0])),
      ),
    ).toBe(true);
  });

  it("một endpoint lỗi không được chặn hiển thị dữ liệu của 2 endpoint còn lại", async () => {
    fetchJson.mockImplementation((url: string) => {
      if (url.startsWith("/api/media/me")) return Promise.resolve(ME);
      if (url.includes("reports/ratings-by-channel")) return Promise.reject(new Error("Lỗi kênh"));
      if (url.includes("reports/overview")) return Promise.resolve(OVERVIEW);
      if (url.includes("reports/content-quality")) return Promise.resolve(QUALITY);
      return Promise.resolve({});
    });
    renderWithClient(
      <I18nProvider>
        <MemoryRouter initialEntries={["/media/reports"]}>
          <MediaReportsPage />
        </MemoryRouter>
      </I18nProvider>,
    );
    // overview đã tải xong → KPI vẫn hiện dù ratings lỗi
    expect(await screen.findByText("320")).toBeInTheDocument();
    // thông báo lỗi của riêng endpoint ratings
    expect(screen.getByText("Lỗi kênh")).toBeInTheDocument();
    // quality cũng đã tải xong → danh sách chất lượng vẫn hiện, không còn kẹt ở spinner
    expect(screen.getByText("Nội dung thiếu tag")).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
  });
});
