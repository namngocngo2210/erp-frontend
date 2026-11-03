import { describe, expect, it } from "vitest";

import {
  computeCpc,
  computeCpm,
  mergeCampaignRows,
  type CampaignCostRow,
} from "@/lib/api/ads_campaign_report";

const fbRow = (overrides: Partial<CampaignCostRow> = {}): CampaignCostRow => ({
  platform: "facebook",
  account_name: "TKQC A",
  campaign_id: "c1",
  campaign_name: "CD 1",
  cost: "100.00",
  impressions: 1000,
  clicks: 10,
  revenue: null,
  ...overrides,
});

describe("mergeCampaignRows", () => {
  it("gộp hai nền tảng và xếp theo chi phí giảm dần", () => {
    const rows = mergeCampaignRows(
      [fbRow({ cost: "50.00" })],
      [fbRow({ platform: "google", campaign_id: "g1", cost: "300.00" })],
    );

    expect(rows.map((r) => r.campaign_id)).toEqual(["g1", "c1"]);
  });

  it("một nền tảng lỗi vẫn hiện nền tảng còn lại", () => {
    const rows = mergeCampaignRows([fbRow()], null);
    expect(rows).toHaveLength(1);
    expect(rows[0].platform).toBe("facebook");
  });

  it("hai nền tảng cùng rỗng trả mảng rỗng", () => {
    expect(mergeCampaignRows(null, null)).toEqual([]);
  });
});

describe("CPM/CPC", () => {
  it("tính đúng khi có mẫu số", () => {
    expect(computeCpm("100.00", 1000)).toBe(100);
    expect(computeCpc("100.00", 10)).toBe(10);
  });

  it("mẫu số 0 trả null chứ không phải 0 hay NaN", () => {
    expect(computeCpm("100.00", 0)).toBeNull();
    expect(computeCpc("100.00", 0)).toBeNull();
  });
});
