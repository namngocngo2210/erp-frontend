// Fixture API mock cho ui-check. Mục tiêu: các trang chính render có dòng với dữ liệu
// DÀI (tên/địa chỉ/ghi chú dài, số tiền lớn) để lộ lỗi tràn — không nhằm đúng nghiệp vụ.

export const UNAUTH_PAGES = ["/login"];

const ALL_SECTIONS = [
  "orders",
  "landing-orders",
  "koc-orders",
  "contacts",
  "floating-pool",
  "customers",
  "customer-explorer",
  "loyal-customers",
  "resale-tracking",
  "warranty",
  "warranty-codes",
  "address-lookup",
  "dashboard",
  "ads-report",
  "overview-report",
  "foxia-report",
  "call-quality",
  "channels",
  "kiotviet",
  "foxia-link",
  "pancake",
  "pancake-leads",
  "system-settings",
  "facebook-ads",
  "google-ads",
  "users",
  "lead-assignment",
  "roles",
  "departments",
  "products",
  "product-categories",
  "warehouses",
  "shipments",
  "stock",
  "dispatch-history",
  "stock-documents",
  "returns",
  "audit",
  "employees",
  "leave",
  "attendance-locations",
  "attendance-history",
  "compensation",
  "contact_flow",
  "media-explore",
  "media-contents",
  "media-proposals",
  "media-reports",
  "media-taxonomy",
  "media-settings",
  "salaries",
];

const NOW = "2026-09-24T09:15:00+07:00";

export const USER = {
  id: 1,
  username: "ui.check.superadmin",
  display_name: "Nguyễn Thị Phương Thảo Quản Trị Hệ Thống",
  avatar_data_url: "",
  department: { id: 1, name: "Ban Giám Đốc Điều Hành", is_active: true, created_at: NOW },
  allowed_sections: ALL_SECTIONS,
  permissions: [],
  scopes: {},
  field_policy: {},
  // Cấp quyền sửa mọi field đơn → ô Mã kênh/Trạng thái… render dạng select (không phải
  // badge chỉ đọc) để ui-check phủ được độ rộng ô select (bài học !1494). `[]` = khoá hết.
  editable_order_fields: [
    "name",
    "phone",
    "customer_gender",
    "address",
    "raw_address",
    "items",
    "sku",
    "quantity",
    "total_amount",
    "total_after_discount",
    "customer_prepaid",
    "shipping_code",
    "fulfillment_warehouse",
    "branch_id",
    "status",
    "result",
    "feedback",
    "return_date",
    "crm.sales_status_code",
    "crm.not_closed_reason_code",
    "crm.delivery_business_status_code",
    "crm.customer_classification_code",
    "crm.internal_note",
    "invoice_code",
    "vat",
    "is_export_vat",
    "vat_link",
    "payment_method",
    "order_type",
    "koc_order_type",
    "order_source",
    "channel_code",
    "kiotviet_channel_id",
    "created_at",
  ],
  is_superuser: true,
};

function fakeJwt() {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ user_id: 1, exp: 4102444800 })}.sig`;
}

// Chạy trong trang TRƯỚC mọi script của app (evaluateOnNewDocument).
export function seedAuthScript(authed) {
  try {
    if (authed) {
      localStorage.setItem(
        "desi_cached_user",
        JSON.stringify({ id: 1, username: "ui.check.superadmin", allowed_sections: [] }),
      );
    } else {
      localStorage.removeItem("desi_cached_user");
    }
  } catch {
    // ignore
  }
  // Websocket không đi qua request interception → thay bằng stub không bao giờ kết nối.
  class FakeWebSocket extends EventTarget {
    constructor() {
      super();
      this.readyState = 0;
    }
    send() {}
    close() {
      this.readyState = 3;
    }
  }
  window.WebSocket = FakeWebSocket;
}

// ---- dữ liệu dài --------------------------------------------------------------------
const LONG_NAME = [
  "Nguyễn Thị Hồng Nhung Phương Uyên",
  "Trần Văn Bảo Long Hoàng Minh Khôi",
  "Lê Thị Thanh Huyền (Chị gái anh Tuấn - khách quen)",
  "Phạm Quốc Trung Kiên",
  "Hoàng Thị Mỹ Duyên Ngọc Ánh",
];
const LONG_ADDR =
  "Số 123/45/67 Ngõ 89 Đường Nguyễn Văn Linh, Phường Tân Thuận Tây, Quận 7, Thành phố Hồ Chí Minh (gọi trước khi giao, sau 17h)";
const LONG_NOTE =
  "Khách yêu cầu giao giờ hành chính, gọi trước 30 phút; đã tư vấn kỹ về chế độ bảo hành 24 tháng và hướng dẫn sử dụng đệm massage hồng ngoại toàn thân";
const PRODUCT_NAMES = [
  "Đệm massage toàn thân hồng ngoại Delax DC12 Pro Max phiên bản 2026",
  "Bồn ngâm chân massage tự động DT11 sưởi ấm hồng ngoại",
  "Ghế massage toàn thân 4D MSC06 Luxury Zero Gravity",
];
const phone = (i) => `09${String(81234567 + i * 7919).slice(0, 8)}`;
const money = (i) => 128_750_000 + i * 9_999_000;

const range = (n) => Array.from({ length: n }, (_, i) => i);

function orderRow(i) {
  const id = 900001 + i;
  return {
    id,
    // Mã kênh khớp danh mục /api/channels để ô select Mã kênh chọn đúng option.
    channel_code: CHANNELS[i % 4].code,
    channel_name: CHANNELS[i % 4].name,
    channel_owner: LONG_NAME[(i + 3) % 5],
    staff_id: 2,
    staff_name: LONG_NAME[(i + 1) % 5],
    name: LONG_NAME[i % 5],
    phone: phone(i),
    raw_address: LONG_ADDR,
    address: LONG_ADDR,
    ward: "Phường Tân Thuận Tây",
    district: "Quận 7",
    province: "Thành phố Hồ Chí Minh",
    product: PRODUCT_NAMES.slice(0, 2).join(" + "),
    product_raw: PRODUCT_NAMES.slice(0, 2).join(" + "),
    sku: "DC12-PRO-0, DT11-PLUS-1",
    quantity: 4,
    items: range(2).map((k) => ({
      id: id * 10 + k,
      product_id: k + 1,
      product_name: PRODUCT_NAMES[k],
      sku: `DC12-PRO-${k}`,
      quantity: 2,
      unit_price: "64375000",
      discount: "0",
      line_total: "128750000",
    })),
    customer_phone: phone(i),
    customer_code: `KH${String(5000 + i).padStart(8, "0")}`,
    customer_is_new: i % 2 === 0,
    status: i % 5,
    invoice_status: 1,
    discount_amount: "1250000",
    booking_voucher_discount: "0",
    order_type: "normal",
    order_source: "landing",
    vat: "no",
    other_price: "0",
    customer_prepaid: "5000000",
    result: LONG_NOTE,
    invoice_code: `HD${String(id).padStart(10, "0")}`,
    feedback: LONG_NOTE,
    total_after_discount: String(money(i) - 1_250_000),
    total_amount: String(money(i)),
    shipping_fee: "45000",
    payment_method: "cod",
    shipping_code: "GHN-LZ9X7Q2K8M4P1",
    shipping_provider: "Giao Hàng Nhanh Express",
    can_edit: true,
    crm: {
      internal_note: LONG_NOTE,
      sales_status_code: "closed",
      sales_status_label: "Đã chốt đơn - chờ xác nhận thanh toán",
      needs: [],
      events: [],
    },
    recall_entries: [],
    duplicate_order_ids: [],
    returning_order_ids: [],
    created_at: NOW,
    sales_closed_at: NOW,
    contact_count: 3,
    last_contact_at: NOW,
  };
}

const dec = (n) => `${n}.00`;
const STAFF = range(5).map((i) => ({
  id: 2 + i,
  username: `sale.nhanvien.${i}`,
  display_name: LONG_NAME[i],
  department_id: 2,
}));
const staffPrefix = (i) => ({
  staff_id: STAFF[i % 5].id,
  staff__username: STAFF[i % 5].username,
  staff__display_name: STAFF[i % 5].display_name,
});

const CHANNELS = range(4).map((i) => ({
  id: i + 1,
  code: ["FB_DELAX_OFFICIAL", "LANDING_DC12_PROMAX", "ZALO_OA_CSKH", "TIKTOK_SHOP_HOKU"][i],
  name: [
    "Facebook Delax Official Chăm Sóc Sức Khoẻ Gia Đình",
    "Landing page Đệm massage DC12 Pro Max",
    "Zalo OA Chăm sóc khách hàng sau bán",
    "TikTok Shop HOKU Việt Nam",
  ][i],
  owner: LONG_NAME[i],
  landingpage_source: ["https://delax.vn/dem-massage-dc12-pro-max-khuyen-mai"],
  fb_ads_accounts: [1],
  google_ads_accounts: [],
  is_active: true,
  created_at: NOW,
  department_ids: [2],
  department_names: ["Phòng Kinh Doanh Ngoại Sàn Miền Bắc"],
  assigned_user_count: 3,
  assigned_users: STAFF.slice(0, 3).map((s) => s.username),
  kiotviet_mappings: [],
  channel_type: { id: 1, code: "facebook", name: "Facebook" },
  price_book: null,
}));

const option = (code, label) => ({ code, label });
const CRM_CATALOGS = {
  customer_classification_options: [option("vip", "Khách VIP"), option("normal", "Khách thường")],
  sales_status_options: [option("closed", "Đã chốt"), option("nurture", "Nuôi dưỡng")],
  not_closed_reason_options: [option("price", "Giá cao so với kỳ vọng")],
  delivery_business_status_options: [option("delivered", "Giao thành công")],
  potential_level_options: [{ value: 1, label: "Tiềm năng cao" }],
  need_groups: [{ code: "pain", name_vi: "Đau nhức xương khớp", sort_order: 1 }],
  need_types: [{ code: "back", group_code: "pain", name_vi: "Đau lưng", sort_order: 1 }],
  bomb_reason_groups: [],
  bomb_reason_types: [],
};

const productRow = (i) => ({
  id: i + 1,
  name: PRODUCT_NAMES[i % 3],
  sku: `DC12-PRO-MAX-${i}`,
  price: dec(64_375_000),
  weight: "12.5",
  length: "120",
  width: "60",
  height: "25",
  is_active: true,
  group: { id: 1, code: "DC12", name: "Đệm massage DC12 các phiên bản" },
  group_id: 1,
  packages: [],
  created_at: NOW,
  updated_at: NOW,
});

const customerProfile = (i) => ({
  identity: { id: 5000 + i, code: `KH${5000 + i}`, full_name: LONG_NAME[i % 5], phone: phone(i) },
  demographics: {
    gender: 1,
    gender_label: "Nữ",
    province: "Thành phố Hồ Chí Minh",
    address: LONG_ADDR,
    age_text: "45-55",
    age_group_label: "Trung niên",
    occupation_code: null,
    occupation_label: "Giáo viên nghỉ hưu",
  },
  channel: { channel_id: 1, channel_name: CHANNELS[0].name },
  segment: { segment_code: "A", segment_name: "Khách trung thành mua lại nhiều lần" },
  needs: {
    need_group_code: "pain",
    need_group_name: "Đau nhức xương khớp",
    items: [
      { group_code: "pain", group_name: "Đau nhức", type_code: "back", type_name: "Đau lưng" },
    ],
  },
  purchase: {
    first_purchase_at: NOW,
    last_purchase_at: NOW,
    total_orders: 17 + i,
    total_spent: dec(money(i) * 3),
    distinct_skus: ["DC12-PRO-0", "DT11-PLUS-1", "MSC06-LUX"],
  },
  latest_order: {
    sku: "DC12-PRO-0",
    product: PRODUCT_NAMES[0],
    last_order_amount: dec(money(i)),
    last_order_status: 3,
    sales_status_code: "closed",
    sales_status_label: "Đã chốt",
    not_closed_reason_code: null,
    not_closed_reason_label: null,
  },
  persona: {
    customer_classification_code: "vip",
    customer_classification_label: "Khách VIP",
    pain_level_code: null,
    pain_level_label: null,
    pain_duration_code: null,
    pain_duration_label: null,
    lifestyle_habit_codes: [],
    used_massage_before: true,
    relax_time_codes: [],
    purchase_barrier_codes: [],
    delax_source_codes: [],
    comparing_brand_text: "",
    call_duration_code: null,
    call_duration_label: null,
    post_purchase_feedback_text: LONG_NOTE,
    post_purchase_rating_code: null,
    post_purchase_rating_label: null,
  },
  resale: { last_resale_at: NOW, resale_status: "Đã liên hệ lần 2", resale_suggestion: LONG_NOTE },
});

const contactItem = (i) => ({
  customer_id: 5000 + i,
  customer_code: `KH${5000 + i}`,
  full_name: LONG_NAME[i % 5],
  phone_raw: phone(i),
  is_new_customer: i % 2 === 0,
  order_count: 3 + i,
  action_needed: "call_new",
  waiting_since: NOW,
  waiting_basis: "gtc",
  last_activity_at: NOW,
  latest_order: {
    id: 900001 + i,
    created_at: NOW,
    order_source: "landing",
    channel_id: 1,
    channel_name: CHANNELS[0].name,
    address: LONG_ADDR,
    status: 1,
    items: range(2).map((k) => ({
      sku: `DC12-PRO-${k}`,
      product_name: PRODUCT_NAMES[k],
      quantity: 2,
    })),
    total_after_discount: dec(money(i)),
    sales_status_code: "closed",
    next_followup_at: NOW,
    staff_id: STAFF[i % 5].id,
    staff_name: STAFF[i % 5].display_name,
  },
  operation: {
    stage_name: "Gọi chăm sóc lần 2 sau giao hàng",
    stage_color: "#0ea5e9",
    allow_edit_due: true,
    due_at: NOW,
    bucket: ["overdue", "today", "upcoming", "ended", "none"][i % 5],
  },
});

const loyalRow = (i) => ({
  rank: i + 1,
  customer_id: 5000 + i,
  code: `KH${5000 + i}`,
  full_name: LONG_NAME[i % 5],
  phone: phone(i),
  purchase_count: 7 + i,
  days_since_last_purchase: 10 + i * 13,
  total_spent: dec(money(i) * 3),
  products: [
    { sku: "DC12-PRO-MAX-0", quantity: 2 },
    { sku: "DT11-PLUS-1", quantity: 3 },
    { sku: "MSC06-LUXURY", quantity: 1 },
  ],
  last_purchase_at: NOW,
  sale_staff_id: STAFF[i % 5].id,
  sale_staff_name: STAFF[i % 5].display_name,
  last_care_call_at: NOW,
  purchase_channels: [CHANNELS[0].name, CHANNELS[1].name],
  segment_code: "A",
  segment_name: "Khách trung thành mua lại nhiều lần",
  segment_care_priority: "high",
  sale_action: LONG_NOTE,
  special_note: LONG_NOTE,
});

const resaleRow = (i) => ({
  order_id: 900001 + i,
  order_code: `DH2609${String(900001 + i).slice(-5)}`,
  shipping_code: "GHN-LZ9X7Q2K8M4P1",
  delivered_at: NOW,
  recipient: {
    name: LONG_NAME[i % 5],
    phone: phone(i),
    address: LONG_ADDR,
    province: "Thành phố Hồ Chí Minh",
    district: "Quận 7",
    ward: "Phường Tân Thuận Tây",
  },
  customer: { id: 5000 + i, code: `KH${5000 + i}`, full_name: LONG_NAME[i % 5], phone: phone(i) },
  channel: CHANNELS[0].name,
  sale_staff_id: STAFF[i % 5].id,
  sale_staff_name: STAFF[i % 5].display_name,
  segment_code: "A",
  segment_name: "Khách trung thành mua lại nhiều lần",
  segment_care_priority: "high",
  last_purchase_at: NOW,
  days_since_last_purchase: 30 + i,
  products: ["DC12-PRO-MAX-0", "DT11-PLUS-1", "MSC06-LUXURY"],
  order_value: dec(money(i)),
  order_assessment: [],
  contact_1_at: NOW,
  contact_2_at: null,
  contact_3_at: null,
  contact_logs: [
    {
      contact_no: 1,
      channel: "call",
      result: LONG_NOTE,
      customer_status: "Quan tâm",
      created_at: NOW,
    },
  ],
  appointment: null,
  resale_orders: [],
});

const warrantyRow = (i) => ({
  id: 700 + i,
  order: {
    id: 900001 + i,
    name: LONG_NAME[i % 5],
    phone: phone(i),
    address: LONG_ADDR,
    product: PRODUCT_NAMES[i % 3],
    sku: "DC12-PRO-MAX-0",
    quantity: 1,
    total_after_discount: dec(money(i)),
    shipping_code: "GHN-LZ9X7Q2K8M4P1",
    order_code: `DH2609${String(900001 + i).slice(-5)}`,
    invoice_code: `HD${String(900001 + i).padStart(10, "0")}`,
    created_at: NOW,
    kiotviet_channel_name: CHANNELS[0].name,
  },
  customer_report_date: NOW,
  activation_date: NOW,
  warranty_months: 24,
  expiry_date: "2028-09-24",
  warranty_days_left: 700 - i,
  status: (i % 12) + 1,
  status_label: "Đợi khách xác nhận tình trạng lỗi sau kiểm tra",
  completed_at: null,
  journeys: [],
  created_by_name: STAFF[i % 5].display_name,
  created_at: NOW,
  updated_at: NOW,
});

const WAREHOUSES = range(3).map((i) => ({
  id: i + 1,
  code: `KHO-${["HN", "HCM", "DN"][i]}`,
  name: ["Kho tổng Hà Nội - KCN Quang Minh", "Kho Hồ Chí Minh - Quận 12", "Kho Đà Nẵng"][i],
  is_active: true,
  created_at: NOW,
  updated_at: NOW,
}));

const stockRow = (i) => ({
  id: i + 1,
  warehouse: WAREHOUSES[i % 3].id,
  warehouse_code: WAREHOUSES[i % 3].code,
  warehouse_name: WAREHOUSES[i % 3].name,
  product: i + 1,
  product_sku: `DC12-PRO-MAX-${i}`,
  product_name: PRODUCT_NAMES[i % 3],
  quantity: 1578 - i * 97,
  state: ["sellable", "warranty", "defect"][i % 3],
  updated_at: NOW,
  rr3: 12.5,
  rr7: 9.75,
});

const employeeRow = (i) => ({
  id: 300 + i,
  employee_code: `NV${String(300 + i).padStart(5, "0")}`,
  full_name: LONG_NAME[i % 5],
  department: 2,
  department_name: "Phòng Kinh Doanh Ngoại Sàn Miền Bắc",
  manager: null,
  manager_name: LONG_NAME[(i + 2) % 5],
  job_title: "staff",
  job_title_display: "Nhân viên",
  position_level: "Senior",
  position_title: "Chuyên viên tư vấn bán hàng cấp cao",
  work_type: "fulltime",
  employment_status: ["probation", "active", "on_leave", "resigned"][i % 4],
  hire_date: "2024-03-01",
  official_date: "2024-05-01",
  resign_date: null,
  phone: phone(i),
  personal_email: `nhan.vien.so.${i}@email-ca-nhan-rat-dai.com.vn`,
  children: [],
  username: STAFF[i % 5].username,
  usernames: [STAFF[i % 5].username],
  accounts: [],
  created_at: NOW,
  updated_at: NOW,
});

const compensationRow = (i) => ({
  employee_id: 300 + i,
  employee_code: `NV${String(300 + i).padStart(5, "0")}`,
  full_name: LONG_NAME[i % 5],
  department: "Phòng Kinh Doanh Ngoại Sàn Miền Bắc",
  base_salary: dec(15_500_000 + i * 1_000_000),
  standard_workdays: "26",
  attendance_bonus: dec(500_000),
  responsibility_allowance: dec(2_000_000),
  kpi_rate: "1.25",
  lunch_per_meal: dec(30_000),
  other_allowance: dec(1_000_000),
  social_insurance: dec(1_627_500),
  note: LONG_NOTE,
});

const DASHBOARD = {
  landing_delivered_by_staff: range(5).map((i) => ({ ...staffPrefix(i), total: 120 - i * 7 })),
  close_rate_by_staff: range(5).map((i) => ({
    ...staffPrefix(i),
    total: 320,
    closed: 210 - i * 9,
    spam: 12,
    unreachable: 30,
  })),
  sale_performance_by_staff: range(5).map((i) => ({
    ...staffPrefix(i),
    total: 400 - i * 20,
    total_assessed: 360 - i * 18,
    closed: 240 - i * 15,
    not_buying: 40,
    nurture: 30 + i,
    unreached: 45,
    dirty: 12,
    warranty: 3,
    underlying_condition: 4,
    wants_store_visit: 2,
    revenue: dec(money(i) * 12),
    closed_revenue: dec(money(i) * 11),
    closed_revenue_orders: 220 - i * 14,
    delivered_count: 190 - i * 12,
    nurture_total_ever: 80,
    nurture_followup_closed: 25,
  })),
  closed_revenue_by_staff_sheet: range(5).flatMap((i) =>
    ["sheet1", "sheet2", "sheet3"].map((sheet, k) => ({
      ...staffPrefix(i),
      sheet,
      closed_orders: 60 - k * 10 - i,
      closed_revenue: dec(money(i) * (4 - k)),
      returned_orders: 5 + k,
      net_revenue: dec(money(i) * (3 - k * 0.5)),
    })),
  ),
  sale_fb_revenue_by_staff: range(5).map((i) => ({
    ...staffPrefix(i),
    closed_orders: 88,
    revenue: dec(money(i) * 10),
  })),
  sale_fb_team_revenue: dec(6_437_500_000),
  sale_fb_team_closed_orders: 440,
  data_quality_by_channel: CHANNELS.map((c) => ({
    channel_id: c.id,
    channel__code: c.code,
    channel__name: c.name,
    total: 1200,
    unreached: 140,
    dirty: 35,
  })),
  data_by_carrier: [
    { carrier: "ghn", label: "Giao Hàng Nhanh Express", total: 820 },
    { carrier: "vtp", label: "Viettel Post", total: 410 },
  ],
  bomb_reasons: [
    { assessment__bomb_reason_type_code: "price", label: "Khách chê giá cao", count: 23 },
  ],
  return_rate_by_product: range(3).map((i) => ({
    items__product: i + 1,
    items__product__sku: `DC12-PRO-MAX-${i}`,
    items__product__name: PRODUCT_NAMES[i],
    total: 500,
    sent: 470,
    returned: 52,
  })),
};

const moneyStr = (n) => dec(n);
const OVERVIEW = {
  total_revenue: moneyStr(13_912_750_000),
  total_orders: 4210,
  delivered_revenue: moneyStr(11_250_000_000),
  delivered_orders: 3510,
  awaiting_revenue: moneyStr(1_250_000_000),
  awaiting_orders: 380,
  returned_revenue: moneyStr(987_000_000),
  returned_orders: 320,
  return_risk_revenue: moneyStr(425_000_000),
  return_risk_orders: 120,
  ads_cost: moneyStr(2_150_000_000),
  ads_cost_facebook: moneyStr(1_650_000_000),
  ads_cost_google: moneyStr(500_000_000),
  revenue_by_sale_channel: CHANNELS.map((c, i) => ({
    sale_channel: c.name,
    revenue: moneyStr(money(i) * 20),
    orders: 900,
    delivered_revenue: moneyStr(money(i) * 17),
    delivered_orders: 780,
  })),
  returned_by_sale_channel: CHANNELS.map((c) => ({
    sale_channel: c.name,
    revenue: moneyStr(95_000_000),
    orders: 40,
  })),
  return_risk_by_sale_channel: CHANNELS.map((c) => ({
    sale_channel: c.name,
    revenue: moneyStr(45_000_000),
    orders: 12,
  })),
  revenue_by_region: ["Miền Bắc", "Miền Trung", "Miền Nam"].map((region, i) => ({
    region,
    revenue: moneyStr(money(i) * 30),
    orders: 1400,
    delivered_revenue: moneyStr(money(i) * 25),
    delivered_orders: 1200,
  })),
  revenue_by_province: ["Thành phố Hồ Chí Minh", "Hà Nội", "Nghệ An", "Bà Rịa - Vũng Tàu"].map(
    (province, i) => ({
      province,
      revenue: moneyStr(money(i) * 12),
      orders: 600,
      delivered_revenue: moneyStr(money(i) * 10),
      delivered_orders: 520,
    }),
  ),
  revenue_timeseries: {
    by_day: range(14).map((d) => ({
      bucket: `2026-09-${String(d + 1).padStart(2, "0")}`,
      sale_channel: CHANNELS[d % 4].name,
      revenue: moneyStr(money(d) * 2),
      orders: 150,
    })),
    by_hour: range(24).map((h) => ({
      bucket: String(h),
      sale_channel: CHANNELS[0].name,
      revenue: moneyStr(money(h)),
      orders: 30,
    })),
    by_weekday: range(7).map((d) => ({
      bucket: String(d + 1),
      sale_channel: CHANNELS[0].name,
      revenue: moneyStr(money(d) * 3),
      orders: 200,
    })),
  },
  top_products: range(5).map((i) => ({
    product_id: i + 1,
    sku: `DC12-PRO-MAX-${i}`,
    name: PRODUCT_NAMES[i % 3],
    quantity: 950 - i * 40,
    orders: 800,
    revenue: moneyStr(money(i) * 40),
    delivered_orders: 700,
    delivered_revenue: moneyStr(money(i) * 35),
  })),
};

const SHEETS = ["sheet1", "sheet2", "sheet3"];
const LEAD_SHARES = {
  date: "2026-09-24",
  shift: "morning",
  current_shift: "morning",
  sheets: SHEETS.map((key, i) => ({
    key,
    label: `Sheet ${i + 1} - Data landing mới`,
    total_weight: 10,
  })),
  rows: STAFF.map((s, i) => ({
    user_id: s.id,
    username: s.username,
    display_name: s.display_name,
    cells: Object.fromEntries(
      SHEETS.map((k) => [
        k,
        { weight: 2 + i, assigned_count: 12 + i, target_pct: 20, actual_pct: 18.5 },
      ]),
    ),
  })),
};

// 10 role (1 hệ thống) — đủ dài để danh sách /settings/roles cuộn ở mobile.
const ROLES = range(10).map((i) => ({
  id: i + 1,
  name: [
    "Sale ngoại sàn miền Bắc (cấp cao)",
    "Kế toán tổng hợp",
    "Chăm sóc khách hàng sau bán",
    "Quản trị hệ thống",
    "Trưởng nhóm Sale",
    "Kho vận",
    "Marketing Ads",
    "Bảo hành kỹ thuật",
    "Nhân sự",
    "Thực tập sinh",
  ][i],
  description: LONG_NOTE,
  is_system: i === 3,
  scope_default: ["own", "department", "channel", "all"][i % 4],
  is_active: true,
  created_at: NOW,
  permission_codes: ["orders.view", "orders.edit", "customers.view"],
  section_scopes: { orders: "own" },
  field_rules: [],
  field_grants: [],
}));
const PERMISSIONS = [
  "orders",
  "customers",
  "contacts",
  "warranty",
  "products",
  "stock",
  "employees",
].flatMap((section, i) =>
  ["view", "create", "edit", "delete", "export"].map((action, k) => ({
    id: i * 10 + k + 1,
    code: `${section}.${action}`,
    section,
    action,
    label: `${action} ${section}`,
  })),
);

const paged = (results) => ({
  count: results.length * 12,
  next: "?page=2",
  previous: null,
  results,
});
const itemsPage = (items) => ({ items, total: items.length * 12, limit: 50, offset: 0 });

// Lead Pancake (sđt khách để lại trong hội thoại) — /sales/pancake-leads.
const PANCAKE_LEADS = range(12).map((i) => ({
  id: i + 1,
  page_id: 1,
  pancake_page_id: "1029384756",
  page_name: "Desi Official — Máy lọc nước",
  channel_id: 1,
  channel_name: "Facebook Desi Official",
  conversation_id: `c_${i}`,
  conversation_inserted_at: NOW,
  customer_name: LONG_NAME[i % 5],
  phone: phone(i),
  tags: ["Hỏi giá", "Đã gửi báo giá"],
  phone_given_at: NOW,
  assignee_name: LONG_NAME[(i + 2) % 5],
  created_at: NOW,
  foxia_kind: "messenger",
  foxia_source_id: null,
  push_status: ["ok", "failed", "order_created", "pending"][i % 4],
  http_status: null,
  error: "",
  pushed_at: NOW,
  cohoi_id: null,
  order_id: i % 4 === 2 ? 10_000 + i : null,
}));

// Fixture theo path (regex) — thứ tự quan trọng, khớp cái đầu tiên.
const ROUTES = [
  [/^\/api\/users\/token\/refresh\/?$/, () => ({ access: fakeJwt() })],
  [/^\/api\/users\/me\/?$/, () => USER],
  [/^\/api\/users\/roles\/?$/, () => ROLES],
  [/^\/api\/pancake\/leads\/?$/, () => itemsPage(PANCAKE_LEADS)],
  [/^\/api\/pancake\/pages\/?$/, () => ({ pages: [] })],
  [/^\/api\/users\/permissions\/?$/, () => PERMISSIONS],
  [
    /^\/api\/users\/order-field-catalog\/?$/,
    () => ({
      groups: [
        {
          code: "customer",
          label: "Khách hàng",
          fields: [{ name: "name", label: "Tên khách hàng" }],
        },
      ],
    }),
  ],
  [/^\/api\/channels\/?$/, () => CHANNELS],
  [
    /^\/api\/channels\/list-for-kiotviet\/?$/,
    () => CHANNELS.map(({ id, code, name }) => ({ id, code, name })),
  ],
  [/^\/api\/channels\/staff\/?$/, () => STAFF],
  [
    /^\/api\/channels\/types\/?$/,
    () => [
      {
        id: 1,
        code: "facebook",
        name: "Facebook",
        sort_order: 1,
        is_active: true,
        channel_count: 4,
      },
    ],
  ],
  [/^\/api\/orders\/crm-catalogs\/?$/, () => CRM_CATALOGS],
  [
    /^\/api\/orders\/kiotviet-options\/?$/,
    () => [{ value: 1, label: "Chi nhánh Hà Nội", code: "HN" }],
  ],
  [/^\/api\/exports\/?$/, () => ({ items: [] })],
  [/^\/api\/orders\/dashboard\/summary\/?$/, () => DASHBOARD],
  [/^\/api\/orders\/reports\/overview\/?$/, () => OVERVIEW],
  [/^\/api\/orders\/products\/?$/, () => range(8).map(productRow)],
  [
    /^\/api\/orders\/products-grouped\/?$/,
    () => ({
      total: 9,
      has_next: false,
      entries: [
        {
          kind: "group",
          id: 1,
          code: "DC12",
          name: "Đệm massage DC12 các phiên bản",
          variant_count: 3,
          price_min: dec(12_500_000),
          price_max: dec(64_375_000),
        },
        ...range(8).map((i) => ({ kind: "product", product: productRow(i) })),
      ],
    }),
  ],
  [/^\/api\/orders\/lead-assignment\/staff\/?$/, () => STAFF],
  [
    /^\/api\/orders\/lead-assignment\/workload\/?$/,
    () => ({
      sheet: "sheet1",
      items: STAFF.map((s, i) => ({
        user_id: s.id,
        username: s.username,
        display_name: s.display_name,
        pending_count: 3 + i,
      })),
    }),
  ],
  [/^\/api\/orders\/lead-assignment\/shares\/?$/, () => LEAD_SHARES],
  [
    /^\/api\/orders\/lead-assignment\/shift-windows\/?$/,
    () => ({
      current_shift: "morning",
      windows: [
        { shift: "morning", label: "Ca sáng", start_time: "08:00", end_time: "12:00" },
        { shift: "afternoon", label: "Ca chiều", start_time: "13:30", end_time: "17:30" },
        { shift: "evening", label: "Ca tối", start_time: "18:00", end_time: "22:00" },
      ],
    }),
  ],
  [/^\/api\/orders\/shipments\/?$/, () => paged(range(8).map(orderRow))],
  [/^\/api\/orders\/\d+\/?$/, (m, url) => orderRow(Number(url.pathname.match(/\d+/)[0]) - 900001)],
  [/^\/api\/orders\/?$/, () => paged(range(8).map(orderRow))],
  [
    /^\/api\/customers\/profiles\/?$/,
    () => ({ total: 96, results: range(8).map(customerProfile) }),
  ],
  [
    /^\/api\/customers\/loyal\/segments\/?$/,
    () => [
      {
        code: "A",
        name: "Khách trung thành mua lại nhiều lần",
        criteria: "≥ 3 đơn trong 12 tháng",
        care_priority: 1,
      },
    ],
  ],
  [/^\/api\/customers\/loyal\/?$/, () => ({ total: 96, results: range(8).map(loyalRow) })],
  [
    /^\/api\/customers\/resale\/?$/,
    () => ({
      total: 96,
      facets: {
        sales: STAFF.map((s) => ({ id: s.id, name: s.display_name })),
        segments: [{ code: "A", name: "Trung thành" }],
      },
      results: range(8).map(resaleRow),
    }),
  ],
  [
    /^\/api\/sale\/contacts\/?$/,
    () => ({
      total: 96,
      action_counts: { call_new: { pending: 12, total: 40 } },
      operation_counts: { overdue: { pending: 3, total: 5 } },
      items: range(8).map(contactItem),
    }),
  ],
  [/^\/api\/warranty\/claims\/?$/, () => ({ total: 96, results: range(8).map(warrantyRow) })],
  [/^\/api\/inventory\/stock\/?$/, () => ({ ...itemsPage(range(9).map(stockRow)), limit: 200 })],
  [/^\/api\/warehouses\/?$/, () => itemsPage(WAREHOUSES)],
  [/^\/api\/hr\/employees\/?$/, () => itemsPage(range(8).map(employeeRow))],
  [/^\/api\/hr\/compensations\/?$/, () => ({ items: range(8).map(compensationRow) })],
  [
    /^\/api\/hr\/departments\/?$/,
    () => ({
      items: [
        { id: 2, name: "Phòng Kinh Doanh Ngoại Sàn Miền Bắc" },
        { id: 3, name: "Phòng Kế toán" },
      ],
    }),
  ],
  [/^\/api\/callcenter\/token\/?$/, () => ({})],
];

const LIST_HINT = /(s|list|history|logs?|items|entries|search|options)\/?$/;

export function mockApi({ method, url, authed }) {
  const p = url.pathname;
  if (!authed && /^\/api\/users\/(token\/refresh|me)/.test(p)) {
    return { status: 401, body: { detail: "Not authenticated" } };
  }
  for (const [re, fn] of ROUTES) {
    if (re.test(p)) return { body: fn(method, url) };
  }
  if (method !== "GET") return { body: {}, missing: true };
  // Fallback: path dạng danh sách trả mảng rỗng — phần lớn wrapper FE nhận mảng trần
  // (`Array.isArray(data) ? data : []`) hoặc tự bóc qua extractListPayload; trả
  // `{count, results}` làm nhiều trang crash ".map is not a function".
  return { body: LIST_HINT.test(p) ? [] : {}, missing: true };
}
