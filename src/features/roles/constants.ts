// ── Nhãn tiếng Việt cho trang Vai trò & Phân quyền ─────────────────
export const ACTION_ORDER = ["view", "create", "edit", "delete", "approve", "export"];

export const ACTION_LABELS: Record<string, string> = {
  view: "Xem",
  create: "Tạo",
  edit: "Sửa",
  delete: "Xóa",
  approve: "Duyệt",
  export: "Xuất",
};

export const SCOPE_LABELS: Record<string, string> = {
  all: "Toàn bộ",
  department: "Theo phòng ban",
  channel: "Theo kênh",
  own: "Của tôi",
};

export const SCOPE_OPTIONS = ["all", "department", "channel", "own"];

// readonly bị bỏ khỏi UI (allow-list field_grants đã thay hoàn toàn vai trò của nó);
// backend giữ nguyên FieldRuleType.READONLY trong model, dữ liệu cũ (nếu có) vẫn đọc được.
export const RULE_LABELS: Record<string, string> = { hidden: "Ẩn" };

// Tên trang đúng như trên sidebar (src/i18n/messages/topnav.ts, bản vi). Section RBAC
// không có trang riêng (salaries, sale-assignment, returns) đặt tên theo nghiệp vụ.
// Test features/roles/__tests__/section-labels.test.ts bắt buộc MỌI section trong
// PERMISSION_CATALOG (backend) phải có nhãn + nhóm — không để lộ khóa thô ở nhóm "Khác".
export const SECTION_LABELS: Record<string, string> = {
  orders: "Đơn hàng chung",
  "landing-orders": "Đơn hàng Landing Page",
  "koc-orders": "Đơn hàng KOC/KOL",
  contacts: "Danh sách contact",
  "floating-pool": "Kho số thả nổi",
  "resale-tracking": "Theo dõi resale",
  customers: "Danh sách khách hàng",
  "loyal-customers": "Khách hàng thân thiết",
  warranty: "Bảo hành",
  "warranty-codes": "Mã bảo hành",
  warehouses: "Kho hàng",
  stock: "Tồn kho",
  "stock-documents": "Phiếu kho",
  returns: "Trả hàng",
  shipments: "Vận đơn",
  products: "Sản phẩm",
  "product-categories": "Danh mục sản phẩm",
  "facebook-ads": "Tài khoản Ads",
  "google-ads": "Tài khoản Google Ads",
  "overview-report": "Báo cáo tổng",
  dashboard: "Báo cáo Sale",
  "ads-report": "Báo cáo Ads",
  "foxia-report": "Hiệu quả marketing (Foxia)",
  "customer-explorer": "Hồ sơ khách hàng",
  "call-quality": "Chất lượng cuộc gọi",
  "address-lookup": "Tra cứu địa chỉ",
  employees: "Nhân viên",
  salaries: "Cơ chế lương",
  users: "Người dùng",
  "lead-assignment": "Chia đơn tự động",
  "sale-assignment": "Gán sale phụ trách",
  "customer-phone": "Xem đầy đủ SĐT khách",
  channels: "Kênh bán hàng",
  kiotviet: "Kênh KiotViet",
  "pancake-pos": "Đồng bộ Pancake POS",
  contact_flow: "Cấu hình tác nghiệp",
  audit: "Log hoạt động",
};

// Nhóm section theo zone/module trên sidebar. Section không thuộc nhóm nào rơi vào "Khác".
export const MODULE_GROUPS: { label: string; sections: string[] }[] = [
  { label: "Đơn hàng", sections: ["orders", "landing-orders", "koc-orders"] },
  { label: "CSKH", sections: ["contacts", "floating-pool", "resale-tracking"] },
  { label: "Khách hàng", sections: ["customers", "loyal-customers"] },
  { label: "Bảo hành", sections: ["warranty", "warranty-codes"] },
  { label: "Kho", sections: ["warehouses", "stock", "stock-documents", "returns", "shipments"] },
  { label: "Sản phẩm", sections: ["products", "product-categories"] },
  { label: "Marketing", sections: ["facebook-ads", "google-ads"] },
  {
    label: "Báo cáo",
    sections: [
      "overview-report",
      "dashboard",
      "ads-report",
      "foxia-report",
      "customer-explorer",
      "call-quality",
    ],
  },
  { label: "Tiện ích", sections: ["address-lookup"] },
  { label: "Nhân sự", sections: ["employees", "salaries"] },
  {
    label: "Quản trị",
    sections: [
      "users",
      "lead-assignment",
      "sale-assignment",
      "customer-phone",
      "channels",
      "kiotviet",
      "pancake-pos",
      "contact_flow",
      "audit",
    ],
  },
];

export const SCOPE_SENTINEL_DEFAULT = "__default__";

export function sectionLabel(section: string): string {
  return SECTION_LABELS[section] ?? section;
}
