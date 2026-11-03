import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, fireEvent, cleanup, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { ReactNode } from "react";

import type { WarrantyJourney } from "@/features/warranty-claims/warranty-claim-types";

const mockUpdateMutate = vi.fn();
const mockDeleteMutate = vi.fn();
const mockCreateBestShipmentMutate = vi.fn();

// [finding 8] `importOriginal` để lại `useBestAccounts`/`useCreateBestShipment`
// là hàng THẬT — mỗi test bung §7 (form Best inline) trước đây bắn một `fetch`
// thật vào origin của jsdom vì hook chạy vô điều kiện trong ReturnSection. Mock
// hẳn 2 hook đó để test không đụng mạng, dù §7 đã sửa để chỉ gọi API khi bung.
vi.mock("@/features/warranty-claims/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/warranty-claims/queries")>();
  return {
    ...actual,
    useUpdateJourney: () => ({ mutate: mockUpdateMutate }),
    useDeleteJourney: () => ({ mutate: mockDeleteMutate }),
    useBestAccounts: () => ({
      data: [{ id: 1, name: "acc", environment: "production", is_active: true }],
    }),
    useCreateBestShipment: () => ({ mutate: mockCreateBestShipmentMutate, isPending: false }),
  };
});

vi.mock("@/features/products/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/products/queries")>();
  return {
    ...actual,
    useProductSearch: () => async () => [],
  };
});

import { JourneyCard } from "@/features/warranty-claims/components/JourneyCard";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { I18nProvider } from "@/i18n";

const mockJourney: WarrantyJourney = {
  id: 1,
  seq: 1,
  name: "",
  status: "new",
  status_label: "Mới",
  receiver_name: "Nguyễn Văn A",
  receiver_phone: "0900000001",
  receiver_raw_address: "123 Đường ABC",
  product: null,
  product_name: "",
  product_sku: "",
  send_reason: "Lỗi màn hình",
  classification: "same_product",
  error_category: "product",
  shipping_form: "one_way",
  declared_value: "0.00",
  cod_amount: "0.00",
  carrier: "ghn",
  shipping_fee: "0.00",
  order_date: null,
  new_tracking_code: "",
  recall_code: "",
  note: "",
  warehouse_received_at: null,
  inspection_result: "normal",
  warehouse_check: "normal",
  resolution: "new_machine",
  resolution_declared_value: "0.00",
  resolution_cod: "0.00",
  resolution_note: "",
  return_carrier: "ghn",
  return_shipping_fee: "0.00",
  return_order_date: null,
  return_tracking_code: "",
  return_status: "shipping",
  feedback_agree_review: "no",
  feedback_rating: "average",
  feedback_note: "",
  claim_date: null,
  claim_note: "",
  // Journey vừa tạo, CHƯA có dấu vết khiếu nại nào — "" không có trong type enum
  // OpenAPI (chỉ enum các giá trị đã chọn), nhưng đây là default thật của model
  // (blank=True, default="") nên phải ép kiểu để biểu diễn đúng trạng thái ban
  // đầu; nếu để giá trị enum thật (vd "pending") thì mọi test dùng mockJourney
  // mặc định sẽ vô tình bị coi là "đã có dấu vết khiếu nại" (finding 3).
  carrier_response: "" as unknown as WarrantyJourney["carrier_response"],
  compensation_status: "" as unknown as WarrantyJourney["compensation_status"],
  compensation_amount: "0.00",
  new_tracking_best_status: "",
  recall_best_status: "",
  return_tracking_best_status: "",
  tracking_synced_at: null,
  vc_groups: { new: null, recall: null, return: null, main: "created" },
  created_at: "2026-07-08T00:00:00Z",
  updated_at: "2026-07-08T00:00:00Z",
};

function renderCard(journey: WarrantyJourney = mockJourney) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
  const utils = render(<JourneyCard journey={journey} />, { wrapper });
  return {
    ...utils,
    rerenderJourney: (next: WarrantyJourney) => utils.rerender(<JourneyCard journey={next} />),
  };
}

/** Card mặc định đóng — mở ra để tương tác với các field §2-§7. */
function expandCard() {
  fireEvent.click(screen.getByRole("button", { name: /mở hành trình/i }));
}

describe("JourneyCard", () => {
  // `shipping_form`/`inspection_result` gõ theo enum OpenAPI (không có "") nhưng
  // test cần biểu diễn "chưa chọn" bằng "" (khớp cách form nháp lưu draft state) —
  // nới kiểu 2 field này về string thuần cho helper test, ép kiểu lại khi render.
  type JourneyOverrides = Partial<Omit<WarrantyJourney, "shipping_form" | "inspection_result">> & {
    shipping_form?: string;
    inspection_result?: string;
  };

  const cardWith = (overrides: JourneyOverrides) => {
    renderCard({ ...mockJourney, ...overrides } as WarrantyJourney);
    expandCard();
  };

  beforeEach(() => {
    mockUpdateMutate.mockReset();
    mockDeleteMutate.mockReset();
    mockCreateBestShipmentMutate.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("mặc định đóng: chỉ hiện tên (dạng text) + trạng thái, field §2 ẩn cho tới khi mở", () => {
    renderCard();
    // Header luôn hiện: tên dạng text (fallback theo seq) + badge trạng thái.
    expect(screen.getByRole("button", { name: "Hành trình #1" })).toBeInTheDocument();
    expect(screen.getAllByText("Mới").length).toBeGreaterThan(0);
    // Field bên trong chưa render khi đóng.
    expect(screen.queryByLabelText("Tên người nhận")).not.toBeInTheDocument();
    // Mở ra → field xuất hiện.
    expandCard();
    expect(screen.getByLabelText("Tên người nhận")).toHaveValue("Nguyễn Văn A");
    expect(screen.getByLabelText("SĐT người nhận")).toHaveValue("0900000001");
    expect(screen.getByLabelText("Mã vận đơn mới")).toHaveValue("");
  });

  it("sửa tên hành trình: bấm ✎ để vào chế độ sửa, đổi, bấm ✓ gọi patch { name }", () => {
    renderCard();
    // Chưa ở chế độ sửa → không có ô input tên.
    expect(screen.queryByLabelText("Tên hành trình #1")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /sửa tên hành trình #1/i }));
    const nameInput = screen.getByLabelText("Tên hành trình #1");
    fireEvent.change(nameInput, { target: { value: "Gửi bù lần 1" } });
    fireEvent.click(screen.getByRole("button", { name: /lưu tên hành trình/i }));

    expect(mockUpdateMutate).toHaveBeenCalledTimes(1);
    const [args] = mockUpdateMutate.mock.calls[0];
    expect(args).toEqual({ id: 1, patch: { name: "Gửi bù lần 1" } });
  });

  it("buffered: sửa mã vận đơn mới không tự lưu; bấm Lưu mới gửi patch (không kèm status)", () => {
    renderCard();
    expandCard();
    const input = screen.getByLabelText("Mã vận đơn mới");
    fireEvent.change(input, { target: { value: "GHN123456" } });
    // Buffered — đổi field KHÔNG auto-save.
    expect(mockUpdateMutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /lưu hành trình/i }));
    expect(mockUpdateMutate).toHaveBeenCalledTimes(1);
    const [args] = mockUpdateMutate.mock.calls[0];
    expect(args.id).toBe(1);
    expect(args.patch).toEqual(expect.objectContaining({ new_tracking_code: "GHN123456" }));
    // status không đổi → KHÔNG gửi (backend tự suy new/created theo mã vận đơn).
    expect(args.patch).not.toHaveProperty("status");
  });

  it("hiện badge nhóm VC tự động theo Best ở header + cạnh từng mã", () => {
    renderCard({
      ...mockJourney,
      new_tracking_code: "B1",
      new_tracking_best_status: "601",
      return_tracking_code: "B3",
      return_tracking_best_status: "666",
      vc_groups: { new: "delivering", recall: null, return: "delivered", main: "delivered" },
    });
    // Header: badge main (GTC — theo mã gửi lại, ưu tiên cao nhất).
    expect(screen.getAllByText("GTC").length).toBeGreaterThan(0);
    expandCard();
    // Badge per-code cạnh ô mã gửi đi.
    expect(screen.getByText("Đang giao hàng")).toBeInTheDocument();
    // Không còn select chọn tay trạng thái hành trình / trạng thái giao.
    expect(screen.queryByText("Chuyển trạng thái...")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Trạng thái giao")).not.toBeInTheDocument();
  });

  it("bấm nút xóa + xác nhận gọi useDeleteJourney với id hành trình", async () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: /xóa hành trình #1/i }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Xóa" }));

    await waitFor(() => expect(mockDeleteMutate).toHaveBeenCalledWith(1, expect.anything()));
  });

  it("hủy xác nhận xóa thì KHÔNG gọi useDeleteJourney", async () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: /xóa hành trình #1/i }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Hủy" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(mockDeleteMutate).not.toHaveBeenCalled();
  });

  it("KHÔNG wipe bản nháp khi refetch đổi updated_at trong lúc đang dirty", () => {
    const { rerenderJourney } = renderCard();
    expandCard();
    fireEvent.change(screen.getByLabelText("Tên người nhận"), {
      target: { value: "Bản nháp đang gõ" },
    });
    expect(screen.getByText("• Chưa lưu")).toBeInTheDocument();

    // Refetch realtime / lưu tên → updated_at đổi, server có giá trị khác.
    rerenderJourney({
      ...mockJourney,
      receiver_name: "Server ghi đè",
      updated_at: "2026-07-09T00:00:00Z",
    });

    // Bản nháp giữ nguyên, badge Chưa lưu còn đó.
    expect(screen.getByLabelText("Tên người nhận")).toHaveValue("Bản nháp đang gõ");
    expect(screen.getByText("• Chưa lưu")).toBeInTheDocument();
  });

  it("đồng bộ form theo server khi KHÔNG dirty (updated_at đổi)", () => {
    const { rerenderJourney } = renderCard();
    expandCard();
    expect(screen.getByLabelText("Tên người nhận")).toHaveValue("Nguyễn Văn A");

    rerenderJourney({
      ...mockJourney,
      receiver_name: "Nguyễn Văn B",
      updated_at: "2026-07-09T00:00:00Z",
    });

    expect(screen.getByLabelText("Tên người nhận")).toHaveValue("Nguyễn Văn B");
  });

  it("lưu tên khi đang dirty: PATCH name gửi đi, bản nháp form không bị mất", () => {
    const { rerenderJourney } = renderCard();
    expandCard();
    fireEvent.change(screen.getByLabelText("Mã vận đơn mới"), {
      target: { value: "GHN999" },
    });

    fireEvent.click(screen.getByRole("button", { name: /sửa tên hành trình #1/i }));
    fireEvent.change(screen.getByLabelText("Tên hành trình #1"), {
      target: { value: "Tên mới" },
    });
    fireEvent.click(screen.getByRole("button", { name: /lưu tên hành trình/i }));

    expect(mockUpdateMutate).toHaveBeenCalledTimes(1);
    expect(mockUpdateMutate.mock.calls[0][0]).toEqual({ id: 1, patch: { name: "Tên mới" } });

    // Server phản hồi tên mới (updated_at đổi) → bản nháp body vẫn còn.
    rerenderJourney({ ...mockJourney, name: "Tên mới", updated_at: "2026-07-09T00:00:00Z" });
    expect(screen.getByLabelText("Mã vận đơn mới")).toHaveValue("GHN999");
    expect(screen.getByText("• Chưa lưu")).toBeInTheDocument();
  });

  it("buffered: gõ địa chỉ không tự lưu; bấm Lưu mới gửi patch chứa receiver_raw_address", () => {
    renderCard();
    expandCard();
    const textarea = screen.getByPlaceholderText("Nhập địa chỉ...");

    fireEvent.change(textarea, { target: { value: "12" } });
    fireEvent.change(textarea, { target: { value: "12 Lê Lợi" } });
    expect(mockUpdateMutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /lưu hành trình/i }));
    expect(mockUpdateMutate).toHaveBeenCalledTimes(1);
    const [args] = mockUpdateMutate.mock.calls[0];
    expect(args.patch).toEqual(expect.objectContaining({ receiver_raw_address: "12 Lê Lợi" }));
  });

  it("phiếu mới tạo → KHÔNG hiện kho nhận, CSKH, gửi đơn mới, feedback, khiếu nại", () => {
    cardWith({
      shipping_form: "",
      inspection_result: "",
      vc_groups: { new: null, recall: null, return: null, main: "created" },
    });

    expect(screen.queryByText("Kho nhận hàng BH")).not.toBeInTheDocument();
    expect(screen.queryByText("CSKH chốt phương án")).not.toBeInTheDocument();
    expect(screen.queryByText("Gửi đơn mới về khách")).not.toBeInTheDocument();
    expect(screen.queryByText("Khách nhận hàng — Cảm nhận")).not.toBeInTheDocument();
    expect(screen.queryByText("Khiếu nại & đền bù")).not.toBeInTheDocument();
  });

  it("đơn 1 chiều + mã gửi đi GTC → hiện đúng khối feedback", () => {
    cardWith({
      shipping_form: "one_way",
      vc_groups: { new: "delivered", recall: null, return: null, main: "delivered" },
    });

    expect(screen.getByText("Khách nhận hàng — Cảm nhận")).toBeInTheDocument();
    expect(screen.queryByText("Kho nhận hàng BH")).not.toBeInTheDocument();
  });

  it("đơn thu hồi BH + mã thu hồi GTC → hiện kho nhận + gửi đơn mới, chưa hiện CSKH", () => {
    cardWith({
      shipping_form: "warranty_recall",
      inspection_result: "",
      vc_groups: { new: null, recall: "delivered", return: null, main: "delivered" },
    });

    expect(screen.getByText("Kho nhận hàng BH")).toBeInTheDocument();
    expect(screen.getByText("Gửi đơn mới về khách")).toBeInTheDocument();
    expect(screen.queryByText("CSKH chốt phương án")).not.toBeInTheDocument();
  });

  it("đã có kết quả kiểm tra → hiện CSKH chốt phương án", () => {
    cardWith({
      shipping_form: "warranty_recall",
      inspection_result: "normal",
      vc_groups: { new: null, recall: "delivered", return: null, main: "delivered" },
    });

    expect(screen.getByText("CSKH chốt phương án")).toBeInTheDocument();
  });

  it("mã thất lạc → hiện khối khiếu nại & đền bù", () => {
    cardWith({
      shipping_form: "one_way",
      vc_groups: { new: "lost", recall: null, return: null, main: "lost" },
    });

    expect(screen.getByText("Khiếu nại & đền bù")).toBeInTheDocument();
  });

  it("tình trạng nhận thực bám theo trạng thái quét kho", () => {
    cardWith({
      shipping_form: "warranty_recall",
      status: "returned",
      vc_groups: { new: null, recall: "delivered", return: null, main: "delivered" },
    });

    expect(screen.getByText("Đã nhận")).toBeInTheDocument();
  });

  // [finding 4] Test badge trước chỉ kiểm 1 chiều ("Đã nhận") — implementation
  // hardcode chữ đó vẫn pass. Thêm chiều ngược lại để bám đúng `journey.status`.
  it("[finding 4] tình trạng nhận thực hiện 'Chưa nhận' khi status khác returned", () => {
    cardWith({
      shipping_form: "warranty_recall",
      status: "shipping",
      vc_groups: { new: null, recall: "delivered", return: null, main: "delivered" },
    });

    expect(screen.getByText("Chưa nhận")).toBeInTheDocument();
    expect(screen.queryByText("Đã nhận")).not.toBeInTheDocument();
  });

  // [finding 1] Kịch bản hỏng thật: phiếu one_way, khách từ chối nhận → Best
  // trả 708 (returned) trên new_tracking_code → kho quét "hoàn" → journey.status
  // = "returned". Mã gửi đi vẫn đứng ở nhóm "delivering" (không phải "returned",
  // group đó không tồn tại cho chặng gửi đi) — nếu §5 chỉ xét mã thu hồi thì sẽ
  // không bao giờ hiện. Xác nhận JourneyCard nối đúng journey.status (SERVER)
  // vào journeySectionFlags, không phải chỉ vc_groups.
  it("[finding 1] one_way + status quét kho = returned (mã gửi đi chưa ở nhóm returned) → vẫn hiện Kho nhận hàng BH", () => {
    cardWith({
      shipping_form: "one_way",
      status: "returned",
      vc_groups: { new: "delivering", recall: null, return: null, main: "delivering" },
    });

    expect(screen.getByText("Kho nhận hàng BH")).toBeInTheDocument();
  });

  // [finding 2] Mã thu hồi của exchange/warranty_recall có thể về GTC (666)
  // thay vì Đã trả hàng (708) tuỳ luồng quét thực tế — nhận cả hai.
  it("[finding 2] đơn đổi hàng + mã thu hồi GTC (không chỉ Đã trả hàng) → vẫn hiện Kho nhận hàng BH", () => {
    cardWith({
      shipping_form: "exchange",
      vc_groups: { new: null, recall: "delivered", return: null, main: "delivered" },
    });

    expect(screen.getByText("Kho nhận hàng BH")).toBeInTheDocument();
  });

  // [finding 3] Vận đơn thất lạc (777) rồi tìm lại được (666) không được phép
  // làm biến mất khối chứa dữ liệu khiếu nại/đền bù đã ghi trên hành trình.
  it("[finding 3] mã đã hết thất lạc nhưng journey còn dấu vết khiếu nại (claim_date) → khối khiếu nại vẫn hiện", () => {
    cardWith({
      shipping_form: "one_way",
      claim_date: "2026-07-15",
      vc_groups: { new: "delivered", recall: null, return: null, main: "delivered" },
    });

    expect(screen.getByText("Khiếu nại & đền bù")).toBeInTheDocument();
  });

  // [finding 6] Spec cam kết: khối ẩn thì KHÔNG render nhưng buildJourneyPatch
  // vẫn gửi đủ mọi field — dữ liệu đã nhập ở khối feedback/khiếu nại không mất
  // dù đang không xem được. Dựng journey có feedback_note/claim_note nhưng ở
  // trạng thái khiến CẢ 2 khối đó bị ẩn, sửa 1 field ở §2 rồi lưu, xác nhận
  // patch vẫn mang nguyên feedback_note/claim_note.
  it("[finding 6] khối feedback + khiếu nại bị ẩn vẫn không mất dữ liệu khi lưu", () => {
    cardWith({
      shipping_form: "one_way",
      feedback_note: "Khách khen giao nhanh",
      claim_note: "Ghi chú khiếu nại cũ",
      // new chưa GTC → feedback ẩn; không mã lost, không dấu vết trace → claim ẩn.
      vc_groups: { new: "delivering", recall: null, return: null, main: "delivering" },
    });

    expect(screen.queryByText("Khách nhận hàng — Cảm nhận")).not.toBeInTheDocument();
    expect(screen.queryByText("Khiếu nại & đền bù")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Tên người nhận"), {
      target: { value: "Tên mới sau khi sửa §2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /lưu hành trình/i }));

    expect(mockUpdateMutate).toHaveBeenCalledTimes(1);
    const [args] = mockUpdateMutate.mock.calls[0];
    expect(args.patch).toEqual(
      expect.objectContaining({
        feedback_note: "Khách khen giao nhanh",
        claim_note: "Ghi chú khiếu nại cũ",
      }),
    );
  });

  const returnSectionCard = (overrides: JourneyOverrides = {}) =>
    cardWith({
      shipping_form: "warranty_recall",
      inspection_result: "",
      return_tracking_code: "",
      vc_groups: { new: null, recall: "delivered", return: null, main: "delivered" },
      ...overrides,
    });

  it("§7 mã trống → hiện nút Tạo đơn Best, chưa bung form", () => {
    returnSectionCard();

    expect(screen.getByRole("button", { name: "Tạo đơn Best" })).toBeInTheDocument();
    // id theo prefix riêng của hành trình (review finding 3) — mockJourney.id = 1.
    expect(document.querySelector("#best-j1-code")).not.toBeInTheDocument();
  });

  it("§7 bấm Tạo đơn Best → form bung tại chỗ, 4 ô tạm ẩn", () => {
    returnSectionCard();
    fireEvent.click(screen.getByRole("button", { name: "Tạo đơn Best" }));

    expect(document.querySelector("#best-j1-code")).toBeInTheDocument();
    expect(document.querySelector("#journey-1-return_carrier")).not.toBeInTheDocument();
  });

  it("§7 bấm Hủy → thu lại, 4 ô trở lại", () => {
    returnSectionCard();
    fireEvent.click(screen.getByRole("button", { name: "Tạo đơn Best" }));
    fireEvent.click(screen.getByRole("button", { name: "Hủy" }));

    expect(document.querySelector("#best-j1-code")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tạo đơn Best" })).toBeInTheDocument();
  });

  it("§7 đã có mã → KHÔNG hiện nút tạo", () => {
    returnSectionCard({ return_tracking_code: "84859706027573" });

    expect(screen.queryByRole("button", { name: "Tạo đơn Best" })).not.toBeInTheDocument();
  });

  // [finding 1] Kịch bản mất tiền: CSKH chốt COD ở §6 rồi bấm "Tạo đơn Best"
  // ngay tại §7 mà CHƯA bấm "Lưu hành trình" — đúng luồng tự nhiên mà thiết kế
  // inline khuyến khích. Nếu form Best đọc thẳng bản ghi SERVER (`journey`)
  // thay vì bản nháp (`form`), payload gửi Best sẽ mang COD server (= "0.00"),
  // không phải COD vừa gõ.
  it("[finding 1] sửa COD ở §6 (chưa Lưu) rồi Tạo đơn Best ngay → payload CollectAmount theo BẢN NHÁP", () => {
    returnSectionCard({ inspection_result: "normal", resolution_cod: "0.00" });

    fireEvent.change(screen.getByLabelText("COD (đơn mới)"), {
      target: { value: "350000" },
    });
    // Vẫn buffered — sửa §6 không tự lưu xuống server.
    expect(mockUpdateMutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Tạo đơn Best" }));
    fireEvent.click(screen.getByRole("button", { name: "Tạo đơn" }));

    expect(mockCreateBestShipmentMutate).toHaveBeenCalledTimes(1);
    const [body] = mockCreateBestShipmentMutate.mock.calls[0];
    expect(body.payload.CollectAmount).toBe(350000);
  });

  // [finding 2] Spec §Test: "tạo thành công → form thu lại, ô mã có giá trị +
  // badge, ĐVVC = BEST, ngày lên đơn = hôm nay". Trước bản vá, xoá cả 3 lệnh
  // `setSynced(...)` + `setExpanded(false)` trong `onCreated` của ReturnSection
  // vẫn không làm đỏ test nào — test này phải đỏ nếu ai xoá lại.
  it("[finding 2] §7 tạo đơn Best thành công → form thu lại, bản nháp có đủ mã/ĐVVC=best/ngày hôm nay", () => {
    returnSectionCard();
    fireEvent.click(screen.getByRole("button", { name: "Tạo đơn Best" }));
    fireEvent.click(screen.getByRole("button", { name: "Tạo đơn" }));

    const [, createOpts] = mockCreateBestShipmentMutate.mock.calls[0];
    createOpts.onSuccess({ code_best: "84859706027573", merchant_order_code: "BHJ1S-AAAA" });

    const [patchArgs, patchOpts] = mockUpdateMutate.mock.calls[0];
    expect(patchArgs.patch.return_carrier).toBe("best");
    expect(patchArgs.patch.return_order_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Bọc act(): callback của react-query gọi ngoài act() thì React chưa kịp
    // flush setSynced/setExpanded trước lúc assert.
    act(() => patchOpts.onSuccess());

    // Form thu lại: khối inline biến mất, 4 ô + badge trở lại — và đã đổ đúng
    // 3 field vào bản nháp (setSynced), KHÔNG bật cờ "Chưa lưu".
    expect(document.querySelector("#best-j1-code")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Mã vận đơn (hàng về)")).toHaveValue("84859706027573");
    expect(screen.getByLabelText("Ngày lên đơn (hàng về)")).toHaveValue(
      patchArgs.patch.return_order_date,
    );
    expect(screen.queryByText("• Chưa lưu")).not.toBeInTheDocument();
    // ĐVVC = BEST.
    expect(screen.getByLabelText("Đơn vị vận chuyển (hàng về)")).toHaveTextContent("BEST");
  });

  // [finding 3] Một phiếu BH có nhiều hành trình, mỗi thẻ mở §7 độc lập. Id
  // DOM hardcode (vd. "best-code") sẽ trùng khi 2 thẻ cùng bung — <label
  // htmlFor> sẽ lái focus về form ĐẦU TIÊN. Xác nhận id đã phân biệt theo
  // journey.id.
  it("[finding 3] hai hành trình cùng bung §7 độc lập trên 1 phiếu → id DOM không trùng nhau", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const base = {
      ...mockJourney,
      shipping_form: "warranty_recall",
      inspection_result: "",
      return_tracking_code: "",
      vc_groups: { new: null, recall: "delivered", return: null, main: "delivered" },
    };
    const journeyA = { ...base, id: 5, seq: 1 } as WarrantyJourney;
    const journeyB = { ...base, id: 9, seq: 2 } as WarrantyJourney;

    render(
      <>
        <JourneyCard journey={journeyA} />
        <JourneyCard journey={journeyB} />
      </>,
      { wrapper },
    );

    const expandButtons = screen.getAllByRole("button", { name: /mở hành trình/i });
    fireEvent.click(expandButtons[0]);
    fireEvent.click(expandButtons[1]);

    const createButtons = screen.getAllByRole("button", { name: "Tạo đơn Best" });
    fireEvent.click(createButtons[0]);
    fireEvent.click(createButtons[1]);

    expect(document.querySelector("#best-j5-code")).toBeInTheDocument();
    expect(document.querySelector("#best-j9-code")).toBeInTheDocument();
  });
});
