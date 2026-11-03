import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/http", () => ({ fetchJson: vi.fn(async () => ({})) }));

import { fetchJson } from "@/services/http";
import { getOverviewReport } from "@/lib/api/overview-report";

const fetchJsonMock = vi.mocked(fetchJson);

afterEach(() => {
  fetchJsonMock.mockClear();
});

function calledUrl(): string {
  return String(fetchJsonMock.mock.calls[0]?.[0] ?? "");
}

describe("getOverviewReport", () => {
  it("gửi product_ids dạng danh sách phân tách bằng dấu phẩy", async () => {
    await getOverviewReport({ dateFrom: "2026-07-01", dateTo: "2026-07-20", productIds: [7, 9] });

    const url = calledUrl();
    expect(url).toContain("date_from=2026-07-01");
    expect(url).toContain("date_to=2026-07-20");
    expect(decodeURIComponent(url)).toContain("product_ids=7,9");
  });

  it("không gửi product_ids khi chưa chọn sản phẩm nào", async () => {
    await getOverviewReport({ dateFrom: "2026-07-01", dateTo: "2026-07-20", productIds: [] });

    expect(calledUrl()).not.toContain("product_ids");
  });

  it("gửi sale_channel khi lọc nhóm kênh bán", async () => {
    await getOverviewReport({ saleChannel: "marketplace" });

    expect(calledUrl()).toContain("sale_channel=marketplace");
  });

  it("không gửi sale_channel khi chọn tất cả", async () => {
    await getOverviewReport({ saleChannel: "" });

    expect(calledUrl()).not.toContain("sale_channel");
  });

  it("gửi sale_channel_group khi lọc một kênh bán cụ thể", async () => {
    await getOverviewReport({ saleChannel: "off_marketplace", saleChannelGroup: "facebook" });

    const url = calledUrl();
    expect(url).toContain("sale_channel=off_marketplace");
    expect(url).toContain("sale_channel_group=facebook");
  });

  it("không gửi sale_channel_group khi chọn cả tầng", async () => {
    await getOverviewReport({ saleChannel: "off_marketplace", saleChannelGroup: "" });

    expect(calledUrl()).not.toContain("sale_channel_group");
  });

  it("không có tham số nào thì gọi endpoint trần", async () => {
    await getOverviewReport({});

    expect(calledUrl()).toBe("/api/orders/reports/overview");
  });
});
