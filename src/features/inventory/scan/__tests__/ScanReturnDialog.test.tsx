import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("sonner", async () => (await import("@/test/utils")).makeToastMock());

vi.mock("@/services/http", async () => {
  const { scanFetchJson } = await import("./scan-test-utils");
  return { fetchJson: vi.fn(scanFetchJson) };
});

import { toast } from "sonner";
import { fetchJson } from "@/services/http";

import { ScanReturnDialog } from "../ScanReturnDialog";
import {
  apiError,
  lookups,
  lookupOutcomes,
  lookupUrls,
  postHandlers,
  resetScanHttp,
  order,
  renderScanDialog,
  scan,
} from "./scan-test-utils";

function renderDialog() {
  return renderScanDialog(<ScanReturnDialog open onOpenChange={() => {}} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  resetScanHttp();
});

describe("ScanReturnDialog — trùng đơn qua 2 mã vận đơn khác nhau, resolve chồng nhau", () => {
  // Cùng lỗ hổng với ScanDispatchDialog (đã fix trước): pushRow của ScanReturnDialog
  // check trùng trên biến `rows` đóng gói ở lần render tạo ra pushRow (snapshot cũ).
  // Quét 2 mã vận đơn KHÁC NHAU của CÙNG 1 đơn, lượt sau resolve trong lúc lượt trước
  // chưa kịp re-render → phải vẫn nhận diện trùng đơn (addScanRow so theo order_id),
  // không được âm thầm thêm 2 dòng cho cùng 1 đơn (2 dòng = 2 phiếu hoàn khi xác nhận).
  it("mã thứ 2 (cùng đơn) resolve sau vẫn bị nhận là trùng — chỉ 1 dòng, có toast trùng", async () => {
    renderDialog();
    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");

    scan(input, "SPXM01");
    scan(input, "SPXM02");

    // Mã 2 resolve trước.
    lookups.get("SPXM02")!.resolve(order(9, "SPXM02"));
    await screen.findByText("SPXM02");

    // Mã 1 (cùng order_id=9) resolve ngay sau — phải bị nhận diện trùng đơn dù rows
    // closure ở thời điểm handleScan("SPXM01") bắt đầu còn là mảng rỗng.
    lookups.get("SPXM01")!.resolve(order(9, "SPXM01"));

    await waitFor(() => expect(toast.warning).toHaveBeenCalled());
    expect(String(vi.mocked(toast.warning).mock.calls[0][0])).toContain("SPXM01");

    // Chỉ 1 dòng cho đơn DH9 — mã SPXM01 (trùng) không được thêm dòng riêng.
    expect(screen.queryByText("SPXM02")).toBeInTheDocument();
    expect(screen.queryByText("SPXM01")).toBeNull();
    expect(screen.getAllByText("DH9")).toHaveLength(1);
  });
});

describe("ScanReturnDialog — 1 mã chỉ bắn được 1 lần", () => {
  it("dùng mode=return_scan để backend bật phanh chặn trùng", async () => {
    lookupOutcomes.set("SPXQ01", order(1, "SPXQ01"));
    renderDialog();
    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");

    scan(input, "SPXQ01");
    await screen.findByText("SPXQ01");

    // mode="return" thuần KHÔNG chặn trùng (màn phiếu kho thủ công dùng mode đó) —
    // gửi nhầm mode là mất sạch phanh mà không test nào khác bắt được.
    expect(lookupUrls[0]).toContain("mode=return_scan");
  });

  it("409 return_already_scanned → báo lỗi kèm mã phiếu, KHÔNG thêm dòng", async () => {
    lookupOutcomes.set(
      "SPXQ02",
      apiError(409, { detail: "return_already_scanned", note_code: "PTH-20260817-K2" }),
    );
    renderDialog();
    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");

    scan(input, "SPXQ02");

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(String(vi.mocked(toast.error).mock.calls[0][0])).toContain("PTH-20260817-K2");
    // Bảng vẫn rỗng: chặn CỨNG, không phải cảnh báo rồi vẫn cho vào.
    expect(screen.getByText("Chưa quét mã nào.")).toBeInTheDocument();
    expect(screen.queryByText("SPXQ02")).toBeNull();
  });

  it("bắn lại được sau khi mã đã tự do (backend hết chặn)", async () => {
    lookupOutcomes.set("SPXQ03", order(3, "SPXQ03"));
    renderDialog();
    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");

    scan(input, "SPXQ03");

    await screen.findByText("SPXQ03");
    expect(toast.error).not.toHaveBeenCalled();
  });
});

describe("ScanReturnDialog — toast tổng kết theo mức độ lỗi (6.8)", () => {
  // 6.8 — toast tổng kết đợt quét trả hàng trước đây LUÔN xanh (toast.success) kể cả khi
  // có dòng lỗi. Xác nhận cả đợt có ít nhất 1 lỗi thì KHÔNG được toast.success.
  beforeEach(() => {
    lookupOutcomes.set(
      "SPXOK01",
      order(1, "SPXOK01", { items: [{ product_id: 1, sku: "SKU1", name: "SP 1", quantity: 1 }] }),
    );
    lookupOutcomes.set(
      "SPXFAIL",
      order(2, "SPXFAIL", { items: [{ product_id: 2, sku: "SKU2", name: "SP 2", quantity: 1 }] }),
    );
    postHandlers.returns = (body) => {
      if (body.source_order_id === 2) {
        const err = new Error("Kho không hợp lệ") as Error & { body?: unknown };
        err.body = { detail: "Kho không hợp lệ" };
        return Promise.reject(err);
      }
      return Promise.resolve({
        return_note: { id: 1, code: "PTH-20260713-K1" },
        status: "posted",
      });
    };
  });

  it("có ≥1 dòng lỗi (lẫn dòng thành công) → toast.warning, KHÔNG toast.success", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Kho A" }));

    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");
    scan(input, "SPXOK01");
    await screen.findByText("DH1");
    scan(input, "SPXFAIL");
    await screen.findByText("DH2");

    await user.click(screen.getByRole("button", { name: /Xác nhận/ }));

    await waitFor(() => expect(toast.warning).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
    const message = String(vi.mocked(toast.warning).mock.calls[0][0]);
    expect(message).toContain("1 lỗi");
  });
});

describe("ScanReturnDialog — hoàn một phần (sửa số lượng dòng hàng trước khi xác nhận)", () => {
  // Hoàn MỘT PHẦN: đơn gốc 2 SP nhưng chỉ 1 SP quay về kho. Trước đây dialog quét
  // luôn POST full items của đơn (auto_post) → SP không về vẫn được cộng tồn (tồn ảo).
  // Thủ kho phải sửa được số lượng từng dòng trước khi xác nhận.
  beforeEach(() => {
    lookupOutcomes.set(
      "SPX001",
      order(1, "SPX001", {
        items: [
          { product_id: 10, sku: "SKU10", name: "SP Mười", quantity: 1 },
          { product_id: 20, sku: "SKU20", name: "SP Hai Mươi", quantity: 1 },
        ],
      }),
    );
    postHandlers.returns = () =>
      Promise.resolve({
        return_note: { id: 1, code: "PTH-20260716-K1" },
        status: "posted",
      });
  });

  function returnPosts() {
    return vi
      .mocked(fetchJson)
      .mock.calls.filter(
        ([url, init]) => url === "/api/inventory/returns" && init?.method === "POST",
      );
  }

  it("dòng khớp hiển thị dòng hàng của đơn với số lượng mặc định = full đơn", async () => {
    renderDialog();
    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");
    scan(input, "SPX001");
    await screen.findByText("DH1");

    const qty10 = await screen.findByLabelText("Số lượng hoàn SKU10");
    const qty20 = await screen.findByLabelText("Số lượng hoàn SKU20");
    expect((qty10 as HTMLInputElement).value).toBe("1");
    expect((qty20 as HTMLInputElement).value).toBe("1");
    expect(screen.getByText("SP Mười")).toBeInTheDocument();
    expect(screen.getByText("SP Hai Mươi")).toBeInTheDocument();
  });

  it("sửa 1 dòng về 0 → payload chỉ mang dòng còn số lượng", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Kho A" }));

    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");
    scan(input, "SPX001");
    await screen.findByText("DH1");

    const qty20 = await screen.findByLabelText("Số lượng hoàn SKU20");
    fireEvent.change(qty20, { target: { value: "0" } });

    await user.click(screen.getByRole("button", { name: /Xác nhận/ }));

    await waitFor(() => expect(returnPosts()).toHaveLength(1));
    const body = JSON.parse(String(returnPosts()[0][1]?.body));
    expect(body.lines).toEqual([{ product_id: 10, quantity: 1, return_type: "delivery_returned" }]);
  });

  it("mọi dòng về 0 → không POST, báo lỗi ngay trên dòng", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Kho A" }));

    const input = await screen.findByPlaceholderText("Quét mã vận đơn…");
    scan(input, "SPX001");
    await screen.findByText("DH1");

    fireEvent.change(await screen.findByLabelText("Số lượng hoàn SKU10"), {
      target: { value: "0" },
    });
    fireEvent.change(await screen.findByLabelText("Số lượng hoàn SKU20"), {
      target: { value: "0" },
    });

    await user.click(screen.getByRole("button", { name: /Xác nhận/ }));

    await screen.findByText(/Chưa nhập số lượng hoàn/);
    expect(returnPosts()).toHaveLength(0);
  });
});
