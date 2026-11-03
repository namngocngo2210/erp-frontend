import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useLockWindowScroll } from "../use-lock-window-scroll";

/**
 * Hàng rào cho sự cố màn trắng prod 2026-08-25: một phần tử `position: absolute`
 * thoát ra khối chứa gốc (ô nhập `sr-only` của `Switch`) kéo dài chiều cao
 * document, rồi focus vào nó làm trình duyệt cuộn CẢ shell ra khỏi màn hình.
 *
 * jsdom không tính layout nên không thể khẳng định "document không cuộn được";
 * thứ khẳng định được — và cũng là thứ dễ bị gỡ nhầm khi refactor — là shell có
 * thật sự khoá cuộn cửa sổ và có trả lại nguyên trạng khi rời shell hay không.
 */
function Shell() {
  useLockWindowScroll();
  return <div>shell</div>;
}

afterEach(() => {
  document.documentElement.style.overflow = "";
  vi.restoreAllMocks();
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true, writable: true });
});

/** Giả lập trình duyệt vừa tự cuộn cửa sổ (focus phần tử ngoài tầm nhìn). */
function pretendWindowScrolled(y: number) {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true, writable: true });
}

describe("useLockWindowScroll", () => {
  it("khoá cuộn cửa sổ khi shell mounted", () => {
    render(<Shell />);

    expect(document.documentElement.style.overflow).toBe("hidden");
  });

  it("kéo cửa sổ về 0 khi có thứ gì đó cuộn nó đi", () => {
    // `overflow: hidden` KHÔNG đủ — đo trong Chrome thật: nó chặn người dùng
    // cuộn, nhưng "cuộn phần tử đang focus vào tầm nhìn" của trình duyệt vẫn kéo
    // được cả trang đi 19.086px, đúng vào màn trắng của sự cố 2026-08-25.
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    render(<Shell />);

    pretendWindowScrolled(19086);
    window.dispatchEvent(new Event("scroll"));

    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("không đụng gì khi cửa sổ vốn đã ở 0", () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    render(<Shell />);

    window.dispatchEvent(new Event("scroll"));

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("hết theo dõi sau khi rời shell", () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    render(<Shell />).unmount();

    pretendWindowScrolled(500);
    window.dispatchEvent(new Event("scroll"));

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("trả lại giá trị cũ khi rời shell — trang public vẫn phải cuộn được", () => {
    // Trang public `/sp/<mã>`, `/bao-hanh` và app mobile `/m` cuộn bằng cửa sổ.
    // Khoá mà không trả lại là chúng kẹt cứng khi user rời CRM trong cùng phiên.
    document.documentElement.style.overflow = "auto";
    const view = render(<Shell />);
    expect(document.documentElement.style.overflow).toBe("hidden");

    view.unmount();

    expect(document.documentElement.style.overflow).toBe("auto");
  });
});
