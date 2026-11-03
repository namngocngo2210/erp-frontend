import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  type CampaignAdAccountOption,
  type CampaignProductReport,
  type CampaignProductRow,
  accountFilterValue,
  mergeCampaignAccounts,
  mergeCampaignProductRows,
  sumUnassignedCost,
} from "@/lib/api/ads_campaign_products";
import { UnassignedCostNote } from "../components/DigitalProductFilter";
import { formatAdsCurrency } from "../report-grouping";

function row(over: Partial<CampaignProductRow> = {}): CampaignProductRow {
  return {
    platform: "facebook",
    id: 1,
    campaign_id: "c1",
    campaign_name: "CD 1",
    account_name: "TKQC",
    cost: "0",
    product_id: null,
    product_sku: "",
    product_name: "",
    product_source: "",
    ...over,
  };
}

describe("mergeCampaignProductRows", () => {
  it("gộp 2 nền tảng, chi phí giảm dần", () => {
    const merged = mergeCampaignProductRows(
      [row({ id: 1, cost: "100" }), row({ id: 2, cost: "900" })],
      [row({ platform: "google", id: 3, cost: "500" })],
    );
    expect(merged.map((r) => r.cost)).toEqual(["900", "500", "100"]);
  });

  it("một nền tảng lỗi không làm trắng cả bảng", () => {
    const merged = mergeCampaignProductRows(null, [row({ platform: "google", cost: "500" })]);
    expect(merged).toHaveLength(1);
  });
});

function report(over: Partial<CampaignProductReport> = {}): CampaignProductReport {
  return {
    platform: "facebook",
    rows: [],
    truncated: false,
    assigned_cost: "100",
    unassigned_cost: "250",
    accessible_accounts: null,
    accounts: [],
    ...over,
  };
}

describe("sumUnassignedCost", () => {
  it("bỏ qua nguồn lỗi thay vì tính thành 0", () => {
    expect(sumUnassignedCost([report(), null, undefined])).toBe(250);
  });
});

describe("bộ lọc TKQC", () => {
  const fb: CampaignAdAccountOption = { platform: "facebook", id: "9", name: "HT-TK4" };
  const gg: CampaignAdAccountOption = { platform: "google", id: "3000000000", name: "Delax.vn" };

  it("khoá lọc mang tiền tố nền tảng — id hai bên đều là chuỗi số nên có thể trùng", () => {
    expect(accountFilterValue(fb)).toBe("facebook:9");
    expect(accountFilterValue(gg)).toBe("google:3000000000");
  });

  it("gộp TKQC hai nền tảng cho ô lọc", () => {
    const merged = mergeCampaignAccounts([
      report({ accounts: [fb] }),
      report({ platform: "google", accounts: [gg] }),
    ]);
    expect(merged.map(accountFilterValue)).toEqual(["facebook:9", "google:3000000000"]);
  });

  it("một nền tảng lỗi không làm rỗng cả ô lọc", () => {
    expect(mergeCampaignAccounts([null, report({ accounts: [fb] }), undefined])).toEqual([fb]);
  });
});

describe("UnassignedCostNote", () => {
  it("hiện phần chi phí chưa quy được về sản phẩm nào", () => {
    render(
      <UnassignedCostNote totalCost={1000} assignedCost="750" formatCurrency={formatAdsCurrency} />,
    );
    expect(screen.getByText("250")).toBeTruthy();
    expect(screen.getByText(/25\.0%/)).toBeTruthy();
  });

  it("ẩn hẳn khi đã gán hết — không hiện dòng '0'", () => {
    const { container } = render(
      <UnassignedCostNote
        totalCost={1000}
        assignedCost="1000"
        formatCurrency={formatAdsCurrency}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("ẩn khi backend chưa trả assigned_ads_cost (payload cũ)", () => {
    const { container } = render(
      <UnassignedCostNote
        totalCost={1000}
        assignedCost={undefined}
        formatCurrency={formatAdsCurrency}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
