import { describe, expect, it } from "vitest";

import { buildPageItems } from "../pagination";

describe("buildPageItems", () => {
  it("hiện tất cả khi tổng trang ngắn", () => {
    expect(buildPageItems(1, 1)).toEqual([1]);
    expect(buildPageItems(2, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(buildPageItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("ellipsis bên phải khi đang ở đầu", () => {
    expect(buildPageItems(1, 20)).toEqual([1, 2, "ellipsis", 20]);
    expect(buildPageItems(2, 20)).toEqual([1, 2, 3, "ellipsis", 20]);
  });

  it("ellipsis hai bên khi ở giữa", () => {
    expect(buildPageItems(10, 20)).toEqual([1, "ellipsis", 9, 10, 11, "ellipsis", 20]);
  });

  it("ellipsis bên trái khi ở cuối", () => {
    expect(buildPageItems(20, 20)).toEqual([1, "ellipsis", 19, 20]);
    expect(buildPageItems(19, 20)).toEqual([1, "ellipsis", 18, 19, 20]);
  });

  it("khe hở đúng 1 trang thì hiện số thay vì ellipsis", () => {
    // left = 3 → giữa 1 và 3 chỉ thiếu trang 2 → hiện 2 luôn.
    expect(buildPageItems(4, 20)).toEqual([1, 2, 3, 4, 5, "ellipsis", 20]);
    // right = total-2 → hiện total-1 luôn.
    expect(buildPageItems(17, 20)).toEqual([1, "ellipsis", 16, 17, 18, 19, 20]);
  });

  it("kẹp page ngoài biên về [1, totalPages]", () => {
    expect(buildPageItems(0, 20)).toEqual([1, 2, "ellipsis", 20]);
    expect(buildPageItems(99, 20)).toEqual([1, "ellipsis", 19, 20]);
    expect(buildPageItems(3, 0)).toEqual([1]);
  });

  it("siblingCount lớn hơn mở rộng cửa sổ quanh trang hiện tại", () => {
    expect(buildPageItems(10, 30, 2)).toEqual([1, "ellipsis", 8, 9, 10, 11, 12, "ellipsis", 30]);
  });
});
