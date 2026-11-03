import { afterEach, describe, expect, it } from "vitest";

import { describeElement, findOverflowingElements } from "../overflow-detector";

type Box = { left: number; right: number; width?: number; height?: number };

/** jsdom không tính layout — gắn rect giả cho từng phần tử. */
function place(el: Element, box: Box) {
  const width = box.width ?? box.right - box.left;
  el.getBoundingClientRect = () =>
    ({
      left: box.left,
      right: box.right,
      width,
      height: box.height ?? 20,
      top: 0,
      bottom: box.height ?? 20,
      x: box.left,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
}

function styleOf(el: Element) {
  const html = el as HTMLElement;
  return {
    overflowX: html.dataset.overflow ?? "visible",
    pointerEvents: html.dataset.pe ?? "auto",
  };
}

function setup(html: string) {
  const root = document.createElement("div");
  root.innerHTML = html;
  document.body.appendChild(root);
  for (const el of root.querySelectorAll<HTMLElement>("[data-l]")) {
    place(el, { left: Number(el.dataset.l), right: Number(el.dataset.r) });
  }
  return root;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("findOverflowingElements", () => {
  it("bắt phần tử vượt mép phải, chỉ trả phần tử ngoài cùng", () => {
    const root = setup(`
      <div id="ok" data-l="0" data-r="375"></div>
      <div id="wide" data-l="0" data-r="531"><span id="child" data-l="400" data-r="520"></span></div>
    `);
    const hits = findOverflowingElements(root, 375, styleOf);
    expect(hits.map((el) => el.id)).toEqual(["wide"]);
  });

  it("bỏ qua phần tử nằm trong vùng cuộn ngang overflow-x auto/scroll", () => {
    const root = setup(`
      <div data-overflow="auto" data-l="0" data-r="375"><table id="t" data-l="0" data-r="1480"></table></div>
      <div data-overflow="scroll" data-l="0" data-r="375"><div><p id="p" data-l="0" data-r="900"></p></div></div>
    `);
    expect(findOverflowingElements(root, 375, styleOf)).toEqual([]);
  });

  it("vẫn báo phần tử bị overflow-hidden che (cắt ≠ cuộn hợp lệ)", () => {
    const root = setup(`
      <div data-overflow="hidden" data-l="0" data-r="375"><button id="b" data-l="300" data-r="407"></button></div>
    `);
    expect(findOverflowingElements(root, 375, styleOf).map((el) => el.id)).toEqual(["b"]);
  });

  it("bỏ qua blob trang trí pointer-events: none, phần tử 0×0 và sai số 1px", () => {
    const root = setup(`
      <div data-pe="none" data-l="-96" data-r="288"></div>
      <div id="edge" data-l="0" data-r="376"></div>
    `);
    const hidden = document.createElement("span");
    place(hidden, { left: 500, right: 500, width: 0, height: 0 });
    root.appendChild(hidden);
    expect(findOverflowingElements(root, 375, styleOf)).toEqual([]);
  });

  it("bắt phần tử lệch sang trái viewport", () => {
    const root = setup(`<div id="neg" data-l="-40" data-r="200"></div>`);
    expect(findOverflowingElements(root, 375, styleOf).map((el) => el.id)).toEqual(["neg"]);
  });
});

describe("describeElement", () => {
  it("ghép tag/id/3 class đầu của 3 cấp", () => {
    const root = setup(
      `<section id="s"><div class="flex gap-2 items-center justify-between"><span class="a"></span></div></section>`,
    );
    const span = root.querySelector("span")!;
    expect(describeElement(span)).toBe("span.a < div.flex.gap-2.items-center < section#s");
  });
});
