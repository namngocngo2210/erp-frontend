import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useComboRows } from "../use-combo-rows";
import { makeComboRow } from "../combo-rows";

const getProductComponents = vi.fn();
const putProductComponents = vi.fn();

vi.mock("@/lib/api/product-components", () => ({
  getProductComponents: (...a: unknown[]) => getProductComponents(...a),
  putProductComponents: (...a: unknown[]) => putProductComponents(...a),
}));

beforeEach(() => {
  getProductComponents.mockClear();
  putProductComponents.mockClear();
  getProductComponents.mockResolvedValue([]);
  putProductComponents.mockResolvedValue([]);
});

describe("useComboRows — chế độ tạo sản phẩm (chưa có id)", () => {
  it("không gọi GET và chỉ PUT khi người dùng thực sự khai thành phần", async () => {
    const { result } = renderHook(() => useComboRows(null));

    expect(getProductComponents).not.toHaveBeenCalled();
    expect(result.current.dirty).toBe(false);

    act(() => result.current.setRows([makeComboRow({ component_id: 7, quantity: 3 })]));
    expect(result.current.dirty).toBe(true);

    await act(async () => {
      expect(await result.current.saveFor(99)).toBe("saved");
    });
    expect(putProductComponents).toHaveBeenCalledWith(99, [{ component_id: 7, quantity: 3 }]);
  });
});

describe("useComboRows — chế độ sửa sản phẩm", () => {
  it("nạp danh sách hiện có, nhãn chỉ là SKU", async () => {
    getProductComponents.mockResolvedValue([
      { component_id: 2, sku: "SP-A", name: "Sản phẩm A", quantity: 1 },
    ]);
    const { result } = renderHook(() => useComboRows(5));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getProductComponents).toHaveBeenCalledWith(5);
    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0]).toMatchObject({
      component_id: 2,
      quantity: 1,
      initialLabel: "SP-A",
    });
  });

  it("KHÔNG gửi PUT khi người dùng chỉ sửa tên/giá sản phẩm", async () => {
    // Form sửa sản phẩm giờ ôm luôn phần combo, nên MỌI lần bấm Lưu đều đi qua
    // đây. PUT vô điều kiện sẽ xoá-rồi-ghi-lại toàn bộ bảng thành phần cho từng
    // lần sửa tên/giá — rác audit, rác id, và rủi ro vô nghĩa. Chỉ ghi khi danh
    // sách thật sự đổi.
    getProductComponents.mockResolvedValue([
      { component_id: 2, sku: "SP-A", name: "Sản phẩm A", quantity: 1 },
    ]);
    const { result } = renderHook(() => useComboRows(5));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.dirty).toBe(false);

    await act(async () => {
      expect(await result.current.saveFor(5)).toBe("unchanged");
    });
    expect(putProductComponents).not.toHaveBeenCalled();
  });

  it("gửi PUT khi đổi số lượng thành phần", async () => {
    getProductComponents.mockResolvedValue([
      { component_id: 2, sku: "SP-A", name: "Sản phẩm A", quantity: 1 },
    ]);
    const { result } = renderHook(() => useComboRows(5));

    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setRows(result.current.rows.map((r) => ({ ...r, quantity: 4 }))));

    await act(async () => {
      expect(await result.current.saveFor(5)).toBe("saved");
    });
    expect(putProductComponents).toHaveBeenCalledWith(5, [{ component_id: 2, quantity: 4 }]);
  });

  it("GET lỗi thì BỎ QUA phần combo, tuyệt đối không PUT danh sách rỗng", async () => {
    // Đây là lằn ranh nguy hiểm nhất của việc gộp combo vào form sửa: GET hỏng
    // thì `rows` rỗng vì TẢI THẤT BẠI, không phải vì combo không có thành phần.
    // PUT lúc này ghi đè trọn danh sách = xoá sạch BOM hiện có, không undo,
    // không đường lùi. Bỏ qua phần combo và báo lên trên để cảnh báo người dùng.
    getProductComponents.mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => useComboRows(5));

    await waitFor(() => expect(result.current.loadFailed).toBe(true));

    await act(async () => {
      expect(await result.current.saveFor(5)).toBe("skipped");
    });
    expect(putProductComponents).not.toHaveBeenCalled();
  });

  it("coi là không đổi khi chỉ khác thứ tự dòng", async () => {
    getProductComponents.mockResolvedValue([
      { component_id: 2, sku: "SP-A", name: "Sản phẩm A", quantity: 1 },
      { component_id: 3, sku: "SP-B", name: "Sản phẩm B", quantity: 2 },
    ]);
    const { result } = renderHook(() => useComboRows(5));

    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setRows([...result.current.rows].reverse()));

    expect(result.current.dirty).toBe(false);
  });

  it("bỏ dòng chưa chọn sản phẩm khi so sánh thay đổi", async () => {
    // Bấm "Thêm thành phần" rồi bỏ dở là chuyện thường; dòng trống không được
    // tính là thay đổi, nếu không thì mọi lần bấm Lưu đều sinh PUT thừa.
    getProductComponents.mockResolvedValue([
      { component_id: 2, sku: "SP-A", name: "Sản phẩm A", quantity: 1 },
    ]);
    const { result } = renderHook(() => useComboRows(5));

    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setRows([...result.current.rows, makeComboRow()]));

    expect(result.current.dirty).toBe(false);
  });
});
