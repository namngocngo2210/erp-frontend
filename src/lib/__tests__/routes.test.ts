import { describe, it, expect } from "vitest";
import {
  pathFromSection,
  sectionFromPath,
  parseOrdersView,
  orderDetailPath,
  landingOrderDetailPath,
  kocOrderDetailPath,
  isFullHeightSection,
  requiredPermissionFor,
  LEGACY_PATH_REDIRECTS,
  type AppSection,
} from "@/lib/routes";

const ALL_SECTIONS: AppSection[] = [
  "orders",
  "landing-orders",
  "koc-orders",
  "contacts",
  "customers",
  "customer-explorer",
  "loyal-customers",
  "resale-tracking",
  "dashboard",
  "ads-report",
  "overview-report",
  "channels",
  "kiotviet",
  "facebook-ads",
  "google-ads",
  "users",
  "departments",
  "products",
  "product-categories",
  "warehouses",
  "stock",
  "stock-documents",
  "returns",
  "audit",
];

describe("nested section paths", () => {
  it("every section path is /<module>/<section>", () => {
    for (const s of ALL_SECTIONS) {
      expect(pathFromSection(s)).toMatch(
        /^\/(sales|crm|inventory|catalog|marketing|aftersales|reports|hr|settings)\/[a-z-]+$/,
      );
    }
  });

  it("round-trips pathFromSection -> sectionFromPath for all sections", () => {
    for (const s of ALL_SECTIONS) {
      expect(sectionFromPath(pathFromSection(s))).toBe(s);
    }
  });

  it("maps known nested paths", () => {
    expect(pathFromSection("warehouses")).toBe("/inventory/warehouses");
    expect(pathFromSection("kiotviet")).toBe("/settings/kiotviet");
    expect(pathFromSection("ads-report")).toBe("/reports/ads-report");
    expect(pathFromSection("overview-report")).toBe("/reports/overview-report");
    expect(pathFromSection("contacts")).toBe("/sales/contacts");
  });

  it("maps contacts section (sectionFromPath / pathFromSection round-trip)", () => {
    expect(sectionFromPath("/sales/contacts")).toBe("contacts");
    expect(pathFromSection("contacts")).toBe("/sales/contacts");
  });

  it("route con của trang Sản phẩm vẫn thuộc section products", () => {
    // Trước khi sửa, `/catalog/products/12/content` rơi vào fallback "orders" ở
    // cuối `sectionFromPath` (chỉ so khớp BẰNG ĐÚNG với SECTION_TO_PATH). Hệ quả
    // thật trên prod: RootLayout coi đây là route "orders-like" nên `<main>` dùng
    // khung AG Grid `overflow-hidden`, nội dung trang bị cắt ở chiều cao viewport
    // và không cuộn được — trang biên tập nội dung sản phẩm không dùng được.
    expect(sectionFromPath("/catalog/products/12/content")).toBe("products");
    expect(sectionFromPath("/catalog/products")).toBe("products");
    expect(sectionFromPath("/catalog/products/")).toBe("products");
  });

  it("customer-explorer: path chính xác, full-height, KHÔNG dùng chung quyền dashboard", () => {
    // 5 chỗ khai trong routes.ts (task-5-brief): path round-trip, full-height
    // (bảng cuộn nội bộ), và requiredPermissionFor phải trả về CHÍNH section
    // này — nếu map nhầm sang "dashboard" thì ai có dashboard sẽ thấy menu rồi
    // nhận 403 ở mọi thao tác (quyền thật là customer-explorer:view, Task 2).
    expect(pathFromSection("customer-explorer")).toBe("/reports/customer-explorer");
    expect(sectionFromPath("/reports/customer-explorer")).toBe("customer-explorer");
    expect(isFullHeightSection("customer-explorer")).toBe(true);
    expect(requiredPermissionFor("customer-explorer")).toBe("customer-explorer");
  });

  it("không nuốt nhầm section có cùng tiền tố chuỗi", () => {
    // `/catalog/product-categories` bắt đầu bằng "/catalog/product" nhưng KHÔNG
    // phải route con của products — regex chốt ranh giới đoạn đường dẫn (`(\/|$)`)
    // nên không match nhầm.
    expect(sectionFromPath("/catalog/product-categories")).toBe("product-categories");
  });
});

describe("order detail paths (under /sales)", () => {
  it("builds nested detail paths", () => {
    expect(orderDetailPath(12)).toBe("/sales/orders/12");
    expect(landingOrderDetailPath(12)).toBe("/sales/landing-orders/12");
    expect(kocOrderDetailPath(12)).toBe("/sales/koc-orders/12");
  });

  it("parseOrdersView reads id from nested sales detail path", () => {
    expect(parseOrdersView("/sales/orders/99")).toEqual({ type: "detail", orderId: 99 });
    expect(parseOrdersView("/sales/landing-orders/7")).toEqual({ type: "detail", orderId: 7 });
    expect(parseOrdersView("/sales/orders")).toEqual({ type: "list" });
  });

  it("parseOrdersView does not misparse /sales/contacts", () => {
    expect(parseOrdersView("/sales/contacts")).toEqual({ type: "list" });
  });

  it("sectionFromPath keeps section for nested detail paths", () => {
    expect(sectionFromPath("/sales/orders/99")).toBe("orders");
    expect(sectionFromPath("/sales/landing-orders/7")).toBe("landing-orders");
    expect(sectionFromPath("/sales/koc-orders/7")).toBe("koc-orders");
  });

  it("URL Đơn gửi ngoài đã gỡ -> rơi về section orders, không crash", () => {
    expect(sectionFromPath("/sales/outside-orders")).toBe("orders");
    expect(sectionFromPath("/sales/outside-orders/7")).toBe("orders");
  });
});

describe("legacy redirects", () => {
  it("covers all 19 old flat paths", () => {
    // /sync đã gỡ cùng trang Đồng bộ (2026-07-14).
    // +/settings/departments → /hr/departments khi chuyển Phòng ban sang HR.
    // /customers/report đã gỡ cùng trang Báo cáo khách hàng (2026-08-21).
    expect(LEGACY_PATH_REDIRECTS).toHaveLength(19);
  });
  it("maps old order detail base correctly", () => {
    const orders = LEGACY_PATH_REDIRECTS.find((r) => r.from === "/orders");
    expect(orders?.to).toBe("/sales/orders");
    const audit = LEGACY_PATH_REDIRECTS.find((r) => r.from === "/audit-logs");
    expect(audit?.to).toBe("/settings/audit");
  });
});
