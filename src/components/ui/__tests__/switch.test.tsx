import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Switch } from "../switch";

/**
 * Sự cố prod 2026-08-25 (màn trắng ở "Nội dung trang sản phẩm"):
 *
 * Ô nhập thật bị giấu bằng `sr-only` = `position: absolute`. Khi không có tổ
 * tiên nào định vị, khối chứa của nó là KHỐI CHỨA GỐC, nên nó KHÔNG bị
 * `overflow-hidden` của khung app cắt và kéo dài chiều cao document tới đúng
 * toạ độ của nó (đo thật: `documentElement` cao 19.991px / viewport 905px).
 * Bấm vào gạt → ô nhập nhận focus → trình duyệt cuộn nó vào tầm nhìn → cả app
 * trôi khỏi màn hình. DOM còn nguyên, không lỗi console nào — nên rất khó lần.
 *
 * jsdom không tính layout nên không tái hiện được bằng số đo; thứ khẳng định
 * được là bất biến cấu trúc: ô nhập tuyệt đối phải nằm trong một tổ tiên ĐÃ
 * ĐỊNH VỊ. Xem thêm hàng rào tầng shell ở `app/use-lock-window-scroll.ts`.
 */
describe("Switch", () => {
  it("ô nhập sr-only nằm trong tổ tiên đã định vị (chống kéo dài document)", () => {
    render(<Switch checked={false} onCheckedChange={() => {}} aria-label="Gạt" />);

    const input = screen.getByRole("checkbox");
    expect(input).toHaveClass("sr-only");

    const positioned = input.closest(".relative, .absolute, .fixed, .sticky");
    expect(positioned).not.toBeNull();
    // Và tổ tiên đó phải là chính khung của Switch, không phải một thẻ tình cờ
    // ở tận trang ngoài — nếu không thì Switch lại phụ thuộc nơi nó được đặt.
    expect(positioned).toBe(input.parentElement);
  });

  it("bấm vào phần gạt nhìn thấy được thì đổi trạng thái đúng một lần", async () => {
    // Mọi test khác trong repo bấm thẳng `getByRole("checkbox")` — tức bấm vào
    // ô nhập đang bị ẩn hoàn toàn. Người dùng thật bấm vào phần ĐỒ HOẠ.
    const onCheckedChange = vi.fn();
    function Controlled() {
      const [checked, setChecked] = useState(false);
      return (
        <Switch
          checked={checked}
          onCheckedChange={(next) => {
            setChecked(next);
            onCheckedChange(next);
          }}
          aria-label="Gạt"
        />
      );
    }
    render(<Controlled />);
    const track = screen.getByRole("checkbox").nextElementSibling;

    await userEvent.click(track as Element);

    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("đang disabled thì bấm vào phần gạt không đổi gì", async () => {
    const onCheckedChange = vi.fn();
    render(<Switch checked={false} onCheckedChange={onCheckedChange} disabled aria-label="Gạt" />);

    await userEvent.click(screen.getByRole("checkbox").nextElementSibling as Element);

    expect(onCheckedChange).not.toHaveBeenCalled();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });
});
