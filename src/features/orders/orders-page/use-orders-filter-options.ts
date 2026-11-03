import { useCallback, useMemo } from "react";

import { type ChannelRow, type StaffUser } from "@/features/channels/components/ChannelManagement";
import { type FilterSelectOption } from "@/features/orders/filter-types";
import { type ProductRow } from "@/features/orders/order-types";
import { type KiotVietOption } from "@/features/orders/use-orders-data";
import { ORDER_VAT_OPTIONS } from "@/features/orders/vat";
import { useI18n } from "@/i18n";

type Translate = ReturnType<typeof useI18n>["t"];

/**
 * 3 giá trị lọc "Loại xuất hàng". "none" đại diện cho shipping_type IS NULL ở BE —
 * toàn bộ đơn cũ (trước khi field này tồn tại) đều rơi vào nhóm này, thiếu token
 * này là mất một tập lớn khỏi bộ lọc.
 */
export const SHIPPING_TYPE_FILTER_VALUES = ["shipment", "direct", "none"] as const;

/** 3 nhãn nghiệp vụ đơn KOC. Không có token "rỗng" — bỏ trống = không lọc. */
export const KOC_ORDER_TYPE_VALUES = ["sample_gift", "renewal", "recall"] as const;

type UseOrdersFilterOptionsArgs = {
  t: Translate;
  channels: ChannelRow[];
  allChannels?: Array<{ id: number; code: string; name: string }>;
  userAssignedChannels?: Array<{ id: number; code: string; name: string; is_active: boolean }>;
  staffUsers: StaffUser[];
  products: ProductRow[];
  kiotvietOptions: KiotVietOption[];
  /** Danh mục loại kênh bán (Shopee/TikTok/...) — rỗng khi chưa nạp xong. */
  channelTypes?: Array<{ code: string; name: string }>;
  /** Danh mục kho (kể cả kho đã vô hiệu — đơn cũ vẫn trỏ tới) nuôi ô lọc "Kho xuất". */
  warehouses?: Array<{ id: number; name: string; is_active: boolean }>;
  /** Giá trị đang chọn — chỉ dùng để lọc ra option tương ứng cho ô lọc nhiều lựa chọn. */
  channel: string[];
  product: string[];
  staff: string[];
  deliveryBusinessStatus: string[];
  salesStatus: string[];
  kiotvietChannel: string[];
  branchId: string[];
  fulfillmentWarehouse: string[];
};

/**
 * Dựng toàn bộ danh sách option cho thanh bộ lọc đơn hàng (và các option đang
 * được chọn tương ứng) từ catalog + giá trị filter hiện tại.
 *
 * Thuần suy diễn: không state, không side effect — tách khỏi OrdersPage để phần
 * còn lại của trang chỉ còn lo bố cục và điều phối.
 */
export function useOrdersFilterOptions({
  t,
  channels,
  allChannels,
  userAssignedChannels,
  staffUsers,
  products,
  kiotvietOptions,
  channelTypes,
  warehouses,
  channel,
  product,
  staff,
  deliveryBusinessStatus,
  salesStatus,
  kiotvietChannel,
  branchId,
  fulfillmentWarehouse,
}: UseOrdersFilterOptionsArgs) {
  const statusLabel = useCallback(
    (value: string | number) => t(`status.${String(value)}`, t("status.all")),
    [t],
  );
  const statusOptions = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) => ({
        value: String(index),
        label: statusLabel(index),
      })),
    [statusLabel],
  );
  const invoiceStatusLabel = useCallback(
    (value: string | number) => t(`invoiceStatus.${String(value)}`, String(value)),
    [t],
  );
  const invoiceStatusOptions = useMemo(
    () =>
      [1, 2, 3, 5].map((v) => ({
        value: String(v),
        label: invoiceStatusLabel(v),
      })),
    [invoiceStatusLabel],
  );
  const vatOptions: FilterSelectOption[] = useMemo(
    () => ORDER_VAT_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
    [],
  );
  const orderTypeFilterOptions: FilterSelectOption[] = useMemo(
    () =>
      [
        "normal",
        "no_return",
        "has_return",
        "same_product",
        "different_product",
        "purchase",
        "warranty_return",
      ].map((v) => ({ value: v, label: t(`orderType.${v}`, v) })),
    [t],
  );
  const shippingTypeFilterOptions: FilterSelectOption[] = useMemo(
    () =>
      SHIPPING_TYPE_FILTER_VALUES.map((v) => ({
        value: v,
        label: t(`shippingType.${v}`, v),
      })),
    [t],
  );
  // Danh mục đến từ DB nên KHÔNG hard-code 4 nhãn: mở thêm loại kênh (Lazada...)
  // là ô lọc tự có. Token "none" ghép ở cuối, cùng quy ước với shipping_type:
  // backfill của migration 0024 cố ý để một phần kênh chưa phân loại.
  const channelTypeFilterOptions: FilterSelectOption[] = useMemo(
    () => [
      ...(channelTypes ?? []).map((type) => ({ value: type.code, label: type.name })),
      { value: "none", label: t("orders.filters.channelTypeNone", "Chưa phân loại") },
    ],
    [channelTypes, t],
  );
  const kocOrderTypeFilterOptions: FilterSelectOption[] = useMemo(
    () =>
      KOC_ORDER_TYPE_VALUES.map((v) => ({
        value: v,
        label: t(`kocOrderType.${v}`, v),
      })),
    [t],
  );
  const filterableChannels = useMemo(() => {
    const source: Array<{ code: string; name: string }> =
      allChannels && allChannels.length > 0 ? allChannels : channels;
    if (userAssignedChannels && userAssignedChannels.length > 0) {
      return source.filter((item) =>
        userAssignedChannels.some((assigned) => assigned.code === item.code),
      );
    }
    return source;
  }, [allChannels, channels, userAssignedChannels]);
  const channelOptions = useMemo(
    () =>
      filterableChannels.map((item) => ({
        value: item.code,
        label: item.name,
      })),
    [filterableChannels],
  );
  const productOptions = useMemo(
    () =>
      products.map((item) => ({
        value: String(item.id),
        label: item.sku || String(item.id),
        code: item.sku || undefined,
      })),
    [products],
  );
  // Dropdown nhân viên ở thanh bộ lọc. BE đã scope danh sách theo phòng ban của trang
  // (KOC -> Booking, còn lại -> Sales), FE chỉ hiển thị nguyên danh sách trả về.
  const staffOptions = useMemo(
    () =>
      staffUsers.map((item) => ({
        value: String(item.id),
        label: item.username,
      })),
    [staffUsers],
  );
  const deliveryBusinessStatusOptions: FilterSelectOption[] = useMemo(
    () => [
      { value: "__empty__", label: "-" },
      { value: "received", label: "Đã nhận" },
      { value: "not_received", label: "Chưa nhận" },
      { value: "stalled_complaint", label: "Đơn dừng hành trình nhiều ngày, đang khiếu nại" },
      { value: "post_office_lost", label: "Bưu cục làm mất" },
    ],
    [],
  );
  const selectedDeliveryBusinessStatusOptions = useMemo(
    () =>
      deliveryBusinessStatusOptions.filter((option) =>
        deliveryBusinessStatus.includes(option.value),
      ),
    [deliveryBusinessStatus, deliveryBusinessStatusOptions],
  );
  const salesStatusOptions: FilterSelectOption[] = useMemo(
    () => [
      { value: "__empty__", label: "-" },
      { value: "closed", label: "Đã chốt" },
      { value: "closed_express", label: "Đã chốt/Hỏa tốc" },
      { value: "closed_scheduled_date", label: "Đã chốt, hẹn ngày" },
      { value: "created_order", label: "Đã lên đơn" },
      { value: "no_answer_1", label: "Không nghe máy lần 1" },
      { value: "no_answer_2", label: "Không nghe máy lần 2" },
      { value: "no_answer_3", label: "Không nghe máy lần 3" },
      { value: "no_answer_4", label: "Không nghe máy lần 4" },
      { value: "no_answer_5", label: "Không nghe máy lần 5" },
      { value: "no_answer_6", label: "Không nghe máy lần 6" },
      { value: "unreachable", label: "Không liên hệ được" },
      { value: "wrong_number", label: "Sai số" },
      { value: "spam", label: "Spam" },
      { value: "duplicate", label: "Lặp" },
      { value: "poor_quality_data", label: "Data không chất lượng" },
      { value: "need_more_consulting", label: "Tư vấn thêm" },
      { value: "not_buying", label: "Không mua" },
      { value: "underlying_condition", label: "Khách bị bệnh nền" },
      { value: "scheduled", label: "Hẹn lịch" },
      { value: "call_back_later", label: "Gọi lại sau" },
      { value: "wants_store_visit", label: "Khách muốn đến cửa hàng" },
      { value: "cancelled", label: "Huỷ đơn" },
      { value: "warranty", label: "Bảo hành" },
    ],
    [],
  );
  const selectedSalesStatusOptions = useMemo(
    () => salesStatusOptions.filter((option) => salesStatus.includes(option.value)),
    [salesStatus, salesStatusOptions],
  );
  const kiotvietChannelOptions: FilterSelectOption[] = useMemo(
    () => [
      { value: "none", label: "Chưa có" },
      ...kiotvietOptions.map((item) => ({ value: String(item.id), label: item.name })),
    ],
    [kiotvietOptions],
  );
  const selectedKiotvietChannelOptions = useMemo(
    () => kiotvietChannelOptions.filter((option) => kiotvietChannel.includes(option.value)),
    [kiotvietChannel, kiotvietChannelOptions],
  );
  const branchIdOptions: FilterSelectOption[] = useMemo(() => {
    const branchNameMap: Record<string, string> = {
      "231174": "Chi nhánh trung tâm",
      "1000000477": "Kho HN 2 chính ngạch",
      "1000000139": "Kho SG",
      "30965": "Kho HN 1",
    };
    const seen = new Set<string>();
    const options: FilterSelectOption[] = [];
    for (const kv of kiotvietOptions) {
      const ids =
        kv.branch_ids && kv.branch_ids.length > 0
          ? kv.branch_ids
          : kv.branch_id
            ? [kv.branch_id]
            : [];
      for (const raw of ids) {
        const id = String(raw).trim();
        if (id && !seen.has(id)) {
          seen.add(id);
          const name = branchNameMap[id] ?? id;
          options.push({ value: id, label: name });
        }
      }
    }
    return options;
  }, [kiotvietOptions]);
  const selectedBranchIdOptions = useMemo(
    () => branchIdOptions.filter((option) => branchId.includes(option.value)),
    [branchId, branchIdOptions],
  );
  // "none" đứng đầu = đơn chưa gán kho (cùng token với "Kênh KiotViet"). Kho đã vô
  // hiệu vẫn liệt kê (đánh dấu) vì đơn cũ còn trỏ tới, không thì không lọc ra được.
  const fulfillmentWarehouseOptions: FilterSelectOption[] = useMemo(() => {
    const inactiveSuffix = t("orders.filters.fulfillmentWarehouseInactive", "(đã tắt)");
    return [
      {
        value: "none",
        label: t("orders.filters.fulfillmentWarehouseNone", "Chưa gán kho"),
      },
      ...(warehouses ?? []).map((w) => ({
        value: String(w.id),
        label: w.is_active ? w.name : `${w.name} ${inactiveSuffix}`,
      })),
    ];
  }, [t, warehouses]);
  const selectedFulfillmentWarehouseOptions = useMemo(
    () =>
      fulfillmentWarehouseOptions.filter((option) => fulfillmentWarehouse.includes(option.value)),
    [fulfillmentWarehouse, fulfillmentWarehouseOptions],
  );
  const selectedChannelOptions = useMemo(
    () => channelOptions.filter((option) => channel.includes(option.value)),
    [channel, channelOptions],
  );
  const selectedProductOptions = useMemo(
    () => productOptions.filter((option) => product.includes(option.value)),
    [product, productOptions],
  );
  const selectedStaffOptions = useMemo(
    () => staffOptions.filter((option) => staff.includes(option.value)),
    [staff, staffOptions],
  );

  return {
    statusLabel,
    statusOptions,
    invoiceStatusOptions,
    vatOptions,
    orderTypeFilterOptions,
    shippingTypeFilterOptions,
    channelTypeFilterOptions,
    kocOrderTypeFilterOptions,
    channelOptions,
    productOptions,
    staffOptions,
    deliveryBusinessStatusOptions,
    selectedDeliveryBusinessStatusOptions,
    salesStatusOptions,
    selectedSalesStatusOptions,
    kiotvietChannelOptions,
    selectedKiotvietChannelOptions,
    branchIdOptions,
    selectedBranchIdOptions,
    fulfillmentWarehouseOptions,
    selectedFulfillmentWarehouseOptions,
    selectedChannelOptions,
    selectedProductOptions,
    selectedStaffOptions,
  };
}
