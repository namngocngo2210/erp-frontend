import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import { I18nProvider, useI18n } from "@/i18n";
import { DeliveryByChannelSection } from "../components/sections/DeliveryByChannelSection";
import { DeliveryByStaffSection } from "../components/sections/DeliveryByStaffSection";
import { sumDeliveryCounters } from "../dashboard-utils";
import type { DeliveryQualityCounters } from "../types";

afterEach(cleanup);

/**
 * Một kênh/sale với phân bố trạng thái cố ý trải đủ 3 rổ, để "% bom" tính sai
 * kiểu cũ (returned / sent) ra số khác hẳn cách đúng (bomb / đã có kết quả):
 *
 *   10 đơn còn trong kho (status 0/1)      -> in_delivery, KHÔNG nằm trong sent
 *   40 đơn đang trên đường (2/7/8/9/10/11) -> in_delivery, có trong sent
 *   120 đơn giao thành công (3)            -> delivered
 *   12 đơn đã hoàn xong (5)                -> returned + bomb
 *   18 đơn đang quay đầu (4/12/13)         -> returned + bomb
 *
 * Từ 2026-08-18 `returned` gom cả 4/5/12/13 (cùng rổ với `bomb`) để nuôi Nhóm 7
 * — trước đó chỉ đếm status 5 nên bộ đếm này để `returned: 12`.
 *
 * Đúng:  bomb 30 / (30 + 120) = 20.0%
 * Cũ sai: returned 30 / sent 190 = 15.8%  (thời `returned` chỉ có 12 thì ra 6.3%)
 */
const COUNTERS: DeliveryQualityCounters = {
  total: 200,
  sent: 190,
  returned: 30,
  delivered: 120,
  in_delivery: 50,
  bomb: 30,
  pending_over_threshold: 8,
};

/**
 * Cùng ba rổ như trên nhưng `total` dôi thêm 10 đơn KHÔNG thuộc rổ nào — mô
 * phỏng đơn mang `status` ngoài `OrderStatus` (KiotViet/đối tác đổ về, `choices`
 * của Django không sinh CHECK dưới DB) hoặc trạng thái mới thêm vào enum mà
 * hằng số rổ ở backend chưa cập nhật.
 *
 * Mẫu số đúng (cộng hai rổ):  30 / (30 + 120)  = 20.0%
 * Mẫu số suy ra bằng phép trừ: 30 / (210 − 50) = 18.8%  <- bị dìm
 */
const COUNTERS_WITH_UNKNOWN_STATUS: DeliveryQualityCounters = {
  ...COUNTERS,
  total: 210,
};

function StaffHarness({ counters }: { counters: DeliveryQualityCounters }) {
  const { t } = useI18n();
  const rows = [
    {
      ...counters,
      staff_id: 1,
      staff__username: "linh",
      staff__display_name: "Linh",
    },
  ];
  return (
    <DeliveryByStaffSection
      t={t}
      deliveryByStaffRows={rows}
      deliveryStaffTotals={sumDeliveryCounters(rows)}
      unknownStaffLabel="Không xác định"
    />
  );
}

function ChannelHarness({ counters }: { counters: DeliveryQualityCounters }) {
  const { t } = useI18n();
  const rows = [
    {
      ...counters,
      channel_id: 1,
      channel__code: "lp",
      channel__name: "Landing",
    },
  ];
  return (
    <DeliveryByChannelSection
      t={t}
      deliveryByChannelRows={rows}
      deliveryChannelTotals={sumDeliveryCounters(rows)}
      unknownChannelLabel="Không xác định"
    />
  );
}

function renderSection(which: "staff" | "channel", counters: DeliveryQualityCounters = COUNTERS) {
  return render(
    <I18nProvider>
      {which === "staff" ? (
        <StaffHarness counters={counters} />
      ) : (
        <ChannelHarness counters={counters} />
      )}
    </I18nProvider>,
  );
}

/** Ô "% bom" của hàng dữ liệu đầu tiên trong bảng chi tiết. */
function bombRateCell(): string {
  const table = screen.getByRole("table");
  const headers = within(table)
    .getAllByRole("columnheader")
    .map((el) => el.textContent?.trim());
  const columnIndex = headers.indexOf("% bom");
  expect(columnIndex).toBeGreaterThan(-1);

  const firstDataRow = within(table).getAllByRole("row")[1];
  return within(firstDataRow).getAllByRole("cell")[columnIndex].textContent?.trim() ?? "";
}

describe("% bom — Nhóm 5a và 5b", () => {
  it("Nhóm 5a tính trên đơn đã có kết quả cuối", () => {
    renderSection("staff");
    expect(bombRateCell()).toBe("20.0%");
  });

  it("Nhóm 5b ra CÙNG con số với Nhóm 5a trên cùng bộ đếm", () => {
    renderSection("channel");
    // Công thức cũ (returned / sent) sẽ ra "15.8%" — chốt lại để không tái diễn.
    expect(bombRateCell()).toBe("20.0%");
  });

  it.each([
    ["Nhóm 5a", "staff" as const],
    ["Nhóm 5b", "channel" as const],
  ])("%s bỏ qua đơn mang trạng thái ngoài enum thay vì tính vào mẫu số", (_label, which) => {
    renderSection(which, COUNTERS_WITH_UNKNOWN_STATUS);
    // Mẫu số suy ra bằng `total − in_delivery` sẽ ra "18.8%" vì nuốt cả 10 đơn
    // lạ; cộng thẳng hai rổ đã ngã ngũ thì không.
    expect(bombRateCell()).toBe("20.0%");
  });

  it("Nhóm 5b đếm cả đơn đang quay đầu vào cột Đơn bom", () => {
    renderSection("channel");
    const table = screen.getByRole("table");
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((el) => el.textContent?.trim());
    const bombIndex = headers.indexOf("Đơn bom");
    const firstDataRow = within(table).getAllByRole("row")[1];

    // 30, không phải 12 (chỉ những đơn đã hoàn xong).
    expect(within(firstDataRow).getAllByRole("cell")[bombIndex]).toHaveTextContent("30");
  });
});
