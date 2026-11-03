import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { I18nProvider } from "@/i18n";
import type { CampaignCostRow } from "@/lib/api/ads_campaign_report";
import { computeCtr } from "@/lib/api/ads_campaign_report";
import { CampaignCostTable } from "../CampaignCostTable";

afterEach(cleanup);

const NO_ERRORS = { facebook: null, google: null };

function row(overrides: Partial<CampaignCostRow> = {}): CampaignCostRow {
  return {
    platform: "facebook",
    account_name: "LỢI_TK7_HKD",
    campaign_id: "c1",
    campaign_name: "LDP_MSC06_080726_TK 7_BÀI CŨ",
    cost: "994619.00",
    impressions: 37162,
    clicks: 691,
    revenue: null,
    ...overrides,
  };
}

function renderTable(rows: CampaignCostRow[]) {
  return render(
    <I18nProvider>
      <CampaignCostTable rows={rows} loading={false} errors={NO_ERRORS} truncated={false} />
    </I18nProvider>,
  );
}

describe("computeCtr", () => {
  it("trả phần trăm click trên hiển thị", () => {
    expect(computeCtr(50, 1000)).toBeCloseTo(5);
  });

  it("trả null khi không có hiển thị — tránh chia 0 ra Infinity", () => {
    expect(computeCtr(10, 0)).toBeNull();
  });

  it("trả 0 khi có hiển thị nhưng không có click", () => {
    expect(computeCtr(0, 1000)).toBe(0);
  });
});

describe("CampaignCostTable — cột CTR", () => {
  it("hiện tiêu đề CTR", () => {
    renderTable([row()]);
    expect(screen.getByText("CTR")).toBeInTheDocument();
  });

  it("hiện CTR dạng phần trăm 2 chữ số đúng ô, không lệch sang cột khác", () => {
    renderTable([row({ clicks: 691, impressions: 37162 })]);
    // 691 / 37162 = 1,8593...%
    //
    // Khoá theo VỊ TRÍ ô (index trong <tr>), không dùng getByText quét cả document:
    // nếu ai đó lỡ đặt <td> CTR sai chỗ (ví dụ ra sau CPM) trong khi <th> vẫn đúng
    // thứ tự, getByText("1,86%") vẫn tìm thấy chuỗi này ở đâu đó và test vẫn xanh
    // — không phát hiện được cột bị lệch nhãn. Thứ tự cột thật: Nền tảng(0),
    // Tài khoản QC(1), Chiến dịch(2), Chi phí(3), Hiển thị(4), Click(5), CTR(6),
    // CPM(7), CPC(8).
    const dataRow = screen.getAllByRole("row")[1];
    const cells = dataRow.querySelectorAll("td");
    expect(cells).toHaveLength(9);
    expect(cells[6]).toHaveTextContent("1,86%");
  });

  it("hiện gạch ngang đúng ô CTR khi không có hiển thị", () => {
    renderTable([row({ impressions: 0, clicks: 0 })]);
    // Không dùng getAllByText("—") đếm số lượng: CPM và CPC cũng render "—" khi
    // impressions/clicks = 0, nên test kiểu "có ít nhất 1 dấu —" luôn xanh bất kể
    // cột CTR đúng hay sai vị trí. Phải đọc đúng ô index 6.
    const dataRow = screen.getAllByRole("row")[1];
    const cells = dataRow.querySelectorAll("td");
    expect(cells[6]).toHaveTextContent("—");
  });
});

describe("CampaignCostTable — tìm kiếm chiến dịch", () => {
  const ROWS = [
    row({ campaign_id: "c1", campaign_name: "LDP_MSC06_080726_TK 7_BÀI CŨ" }),
    row({
      campaign_id: "c2",
      campaign_name: "LDP_MSC06_200526_TK 6_BÀI WIN",
      account_name: "Lợi_TK6_HKD",
    }),
    row({
      campaign_id: "c3",
      campaign_name: "DMG - RMK 2 - TMS01-DT11-BNC02",
      account_name: "Delax.vn",
      platform: "google",
    }),
  ];

  function search(term: string) {
    renderTable(ROWS);
    fireEvent.change(screen.getByLabelText("Tìm chiến dịch"), { target: { value: term } });
  }

  it("ô rỗng thì không lọc gì", () => {
    renderTable(ROWS);
    expect(screen.getByText("LDP_MSC06_080726_TK 7_BÀI CŨ")).toBeInTheDocument();
    expect(screen.getByText("DMG - RMK 2 - TMS01-DT11-BNC02")).toBeInTheDocument();
  });

  it("khớp không dấu và không phân biệt hoa thường", () => {
    search("bai win");
    expect(screen.getByText("LDP_MSC06_200526_TK 6_BÀI WIN")).toBeInTheDocument();
    expect(screen.queryByText("LDP_MSC06_080726_TK 7_BÀI CŨ")).not.toBeInTheDocument();
  });

  it("khớp cả tên tài khoản quảng cáo", () => {
    search("delax");
    expect(screen.getByText("DMG - RMK 2 - TMS01-DT11-BNC02")).toBeInTheDocument();
    expect(screen.queryByText("LDP_MSC06_200526_TK 6_BÀI WIN")).not.toBeInTheDocument();
  });

  it("lọc hết dòng thì nói rõ là do bộ lọc, không nói là chưa có dữ liệu", () => {
    search("khong-ton-tai-gi-ca");
    expect(screen.getByText("Không có chiến dịch nào khớp bộ lọc.")).toBeInTheDocument();
    expect(
      screen.queryByText("Chưa có dữ liệu chiến dịch trong khoảng đã chọn."),
    ).not.toBeInTheDocument();
  });
});

const NO_ACCOUNTS_TEXT =
  "Bạn chưa được gán tài khoản quảng cáo nào. Liên hệ quản trị để gán TKQC cho kênh bạn phụ trách.";

describe("CampaignCostTable — chưa được gán TKQC", () => {
  function renderWithScope(accessibleAccounts: { facebook: number | null; google: number | null }) {
    return render(
      <I18nProvider>
        <CampaignCostTable
          rows={[]}
          loading={false}
          errors={NO_ERRORS}
          truncated={false}
          accessibleAccounts={accessibleAccounts}
        />
      </I18nProvider>,
    );
  }

  it("nói rõ lý do khi cả hai nền tảng đều trả 0 tài khoản", () => {
    renderWithScope({ facebook: 0, google: 0 });
    expect(screen.getByText(NO_ACCOUNTS_TEXT)).toBeInTheDocument();
  });

  it("null nghĩa là không bị lọc — không được cảnh báo nhầm cho admin", () => {
    renderWithScope({ facebook: null, google: null });
    expect(screen.queryByText(NO_ACCOUNTS_TEXT)).not.toBeInTheDocument();
    expect(
      screen.getByText("Chưa có dữ liệu chiến dịch trong khoảng đã chọn."),
    ).toBeInTheDocument();
  });

  it("có TKQC ở một nền tảng thì không cảnh báo", () => {
    renderWithScope({ facebook: 0, google: 3 });
    expect(screen.queryByText(NO_ACCOUNTS_TEXT)).not.toBeInTheDocument();
  });
});
