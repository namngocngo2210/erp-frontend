import { useCallback, useEffect, useRef } from "react";

import { phoneDigits } from "@/lib/phone";
import { type OrderRow } from "@/features/orders/order-types";
import type { UseOrdersFiltersReturn } from "@/features/orders/use-orders-filters";

// Mirror _parse_local_datetime_boundary (backend): "YYYY-MM-DD" hiểu theo ngày
// local; biên "to" cộng 1 ngày rồi so sánh < (end-exclusive). Trả null khi giá
// trị không parse được — backend cũng bỏ qua biên hỏng thay vì lọc sai.
function parseLocalDateBoundary(value: string, endExclusive = false): number | null {
  const raw = value.trim();
  if (!raw) return null;
  const parsed = raw.length <= 10 ? new Date(`${raw}T00:00:00`) : new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  if (endExclusive && raw.length <= 10) parsed.setDate(parsed.getDate() + 1);
  return parsed.getTime();
}

const ISO_DATE_PREFIX_RE = /^\d{4}-\d{2}-\d{2}/;

/**
 * Mirror phía client của bộ lọc server: giữ snapshot bộ lọc hiện hành trong một
 * ref (không gây re-render) và cung cấp `rowPassesActiveFilters` để lớp realtime
 * quyết định đơn đến qua WebSocket có được vào list hay không (không lọt/không rò
 * filter).
 *
 * Snapshot KHÔNG dùng để loại row sau khi user sửa: nếu user vừa cập nhật trạng
 * thái thì giữ row tại chỗ để họ thấy kết quả, dù không còn match filter.
 *
 * Tách từ use-orders-table.ts (composition); hành vi giữ NGUYÊN từng dòng.
 */
export function useOrdersFilterMirror(filters: UseOrdersFiltersReturn) {
  const {
    q,
    dateFilter,
    returnDateFilter,
    kiotvietPurchaseDateFilter,
    status,
    channel,
    product,
    staff,
    deliveryBusinessStatus,
    salesStatus,
    kiotvietChannel,
    branchId,
    fulfillmentWarehouse,
    invoiceStatus,
    vat,
    orderType,
    shippingType,
    channelType,
    kocOrderType,
    kiotvietChannelNull,
    showOrders,
    hasShippingCode,
    hasInvoiceCode,
    isDeliveryInvoicePrinted,
    customerReturn,
    hasInternalNote,
    hasAddress,
    hasReturnSlip,
    hasRecallCode,
    hasCallRecording,
  } = filters;

  // Snapshot filter hiện hành để upsert handler quyết định có thêm đơn mới
  // (đến qua WebSocket) vào list hay không khi đang có filter active. Không
  // dùng để loại row sau khi user sửa: nếu user vừa cập nhật trạng thái thì
  // giữ row tại chỗ để họ thấy kết quả, dù không còn match filter.
  const filterSnapshotRef = useRef<{
    q: string;
    dateFrom: string;
    dateTo: string;
    returnDateFrom: string;
    returnDateTo: string;
    kiotvietPurchaseDateFrom: string;
    kiotvietPurchaseDateTo: string;
    status: string[];
    channel: string[];
    product: string[];
    staff: string[];
    deliveryBusinessStatus: string[];
    salesStatus: string[];
    kiotvietChannel: string[];
    branchId: string[];
    fulfillmentWarehouse: string[];
    invoiceStatus: string[];
    vat: string[];
    orderType: string[];
    shippingType: string[];
    channelType: string[];
    kocOrderType: string[];
    kiotvietChannelNull: string;
    showOrders: string;
    hasShippingCode: string;
    hasInvoiceCode: string;
    isDeliveryInvoicePrinted: string;
    customerReturn: string;
    hasInternalNote: string;
    hasAddress: string;
    hasReturnSlip: string;
    hasRecallCode: string;
    hasCallRecording: string;
  }>({
    q: "",
    dateFrom: "",
    dateTo: "",
    returnDateFrom: "",
    returnDateTo: "",
    kiotvietPurchaseDateFrom: "",
    kiotvietPurchaseDateTo: "",
    status: [],
    channel: [],
    product: [],
    staff: [],
    deliveryBusinessStatus: [],
    salesStatus: [],
    kiotvietChannel: [],
    branchId: [],
    fulfillmentWarehouse: [],
    invoiceStatus: [],
    vat: [],
    orderType: [],
    shippingType: [],
    channelType: [],
    kocOrderType: [],
    kiotvietChannelNull: "",
    showOrders: "",
    hasShippingCode: "",
    hasInvoiceCode: "",
    isDeliveryInvoicePrinted: "",
    customerReturn: "",
    hasInternalNote: "",
    hasAddress: "",
    hasReturnSlip: "",
    hasRecallCode: "",
    hasCallRecording: "",
  });

  // isNewArrival: true khi row là ĐƠN MỚI sắp được thêm vào list (không phải
  // revalidate row sẵn có). Filter chỉ server-side trả lời được (vd Ghi âm cuộc
  // gọi — Exists trên callcenter_call_records, row không mang field) xử lý khác
  // nhau: đơn mới fail-closed, row sẵn có giữ nguyên (server đã xác nhận khớp).
  const rowPassesActiveFilters = useCallback((row: OrderRow, isNewArrival = false): boolean => {
    const f = filterSnapshotRef.current;
    const rawQ = f.q.trim();
    if (rawQ) {
      // Mirror backend list_orders search (OR over shipping_code / invoice_code /
      // old_invoice_code / phone / customer_phone, plus normalized-digit match for
      // phone fields) so realtime upserts don't bypass an active search.
      const keywords = rawQ
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      if (keywords.length > 0) {
        const textHaystacks = [
          row.shipping_code,
          row.invoice_code,
          row.old_invoice_code,
          row.phone,
          row.customer_phone,
        ]
          .filter((value): value is string => typeof value === "string" && value !== "")
          .map((value) => value.toLowerCase());
        const phoneHaystacks = [row.phone, row.customer_phone]
          .map((value) => phoneDigits(typeof value === "string" ? value : ""))
          .filter((value) => value !== "");
        const matchesAny = keywords.some((keyword) => {
          const lower = keyword.toLowerCase();
          if (textHaystacks.some((h) => h.includes(lower))) return true;
          const normalizedKeyword = phoneDigits(keyword);
          if (normalizedKeyword) {
            return phoneHaystacks.some((p) => p.includes(normalizedKeyword));
          }
          return false;
        });
        if (!matchesAny) return false;
      }
    }
    if (f.salesStatus.length > 0) {
      const code = row.crm?.sales_status_code ?? "";
      if (!f.salesStatus.includes(code)) return false;
    }
    if (f.deliveryBusinessStatus.length > 0) {
      const code = row.crm?.delivery_business_status_code ?? "";
      if (!f.deliveryBusinessStatus.includes(code)) return false;
    }
    if (f.status.length > 0) {
      if (!f.status.includes(String(row.status))) return false;
    }
    if (f.channel.length > 0) {
      if (!f.channel.includes(row.channel_code ?? "")) return false;
    }
    // Lọc ngày tạo — backend bỏ qua khi đang search q (search quét toàn lịch sử).
    if (!rawQ && (f.dateFrom || f.dateTo)) {
      const fromTs = f.dateFrom ? parseLocalDateBoundary(f.dateFrom) : null;
      const toTs = f.dateTo ? parseLocalDateBoundary(f.dateTo, true) : null;
      if (fromTs !== null || toTs !== null) {
        const createdTs =
          typeof row.created_at === "string" && row.created_at !== ""
            ? new Date(row.created_at).getTime()
            : Number.NaN;
        if (Number.isNaN(createdTs)) {
          // Row không mang created_at thì không đánh giá được: đơn mới fail-closed,
          // row sẵn có giữ nguyên (server đã xác nhận khớp lúc load).
          if (isNewArrival) return false;
        } else {
          if (fromTs !== null && createdTs < fromTs) return false;
          if (toTs !== null && createdTs >= toTs) return false;
        }
      }
    }
    // Lọc ngày hoàn hàng (return_date) — backend áp cả khi có q.
    {
      const returnFrom = ISO_DATE_PREFIX_RE.test(f.returnDateFrom) ? f.returnDateFrom : "";
      const returnTo = ISO_DATE_PREFIX_RE.test(f.returnDateTo) ? f.returnDateTo : "";
      if (returnFrom || returnTo) {
        const rowReturn = typeof row.return_date === "string" ? row.return_date.slice(0, 10) : "";
        if (!ISO_DATE_PREFIX_RE.test(rowReturn)) return false;
        if (returnFrom && rowReturn < returnFrom.slice(0, 10)) return false;
        if (returnTo && rowReturn > returnTo.slice(0, 10)) return false;
      }
    }
    // Lọc "Ngày tạo trên KiotViet" (kiotviet_purchase_date) — backend áp cả khi
    // có q, biên ngày local như created_at. Đơn NULL (chưa có hoá đơn) bị loại.
    if (f.kiotvietPurchaseDateFrom || f.kiotvietPurchaseDateTo) {
      const fromTs = f.kiotvietPurchaseDateFrom
        ? parseLocalDateBoundary(f.kiotvietPurchaseDateFrom)
        : null;
      const toTs = f.kiotvietPurchaseDateTo
        ? parseLocalDateBoundary(f.kiotvietPurchaseDateTo, true)
        : null;
      if (fromTs !== null || toTs !== null) {
        const raw = row.kiotviet_purchase_date;
        if (raw === undefined) {
          // Row không mang trường này thì không đánh giá được: đơn mới fail-closed,
          // row sẵn có giữ nguyên (server đã xác nhận khớp lúc load).
          if (isNewArrival) return false;
        } else {
          const ts = typeof raw === "string" && raw !== "" ? new Date(raw).getTime() : Number.NaN;
          if (Number.isNaN(ts)) return false;
          if (fromTs !== null && ts < fromTs) return false;
          if (toTs !== null && ts >= toTs) return false;
        }
      }
    }
    // Lọc Sản phẩm — mirror backend: giá trị số match OrderItem.product_id, giá
    // trị text match tên/SKU dòng hàng (+ product/sku denormalized trên đơn).
    if (f.product.length > 0) {
      const items = Array.isArray(row.items) ? row.items : [];
      const numericIds = f.product.filter((v) => /^\d+$/.test(v)).map(Number);
      const textValues = f.product.filter((v) => !/^\d+$/.test(v)).map((v) => v.toLowerCase());
      const matchesNumeric =
        numericIds.length > 0 && items.some((item) => numericIds.includes(Number(item.product_id)));
      const productHaystacks = [
        ...items.flatMap((item) => [item.product_name, item.sku]),
        row.product,
        row.sku,
      ]
        .filter((value): value is string => typeof value === "string" && value !== "")
        .map((value) => value.toLowerCase());
      const matchesText = textValues.some((v) => productHaystacks.some((h) => h.includes(v)));
      if (!matchesNumeric && !matchesText) return false;
    }
    // "Ghi âm cuộc gọi" = Exists server-side, row không có field để kiểm tra.
    // Đơn MỚI chắc chắn chưa có ghi âm → fail-closed khi lọc "yes"; row sẵn có
    // không dùng filter này để loại (tránh remove nhầm khi patch realtime tới).
    if (isNewArrival && f.hasCallRecording === "yes") return false;
    if (f.staff.length > 0) {
      const sid = row.staff_id != null ? String(row.staff_id) : "";
      if (!f.staff.includes(sid)) return false;
    }
    if (f.kiotvietChannel.length > 0) {
      const includesNone = f.kiotvietChannel.includes("none");
      const idStr = row.kiotviet_channel_id != null ? String(row.kiotviet_channel_id) : "";
      if (!idStr) {
        if (!includesNone) return false;
      } else if (!f.kiotvietChannel.includes(idStr)) {
        return false;
      }
    }
    if (f.branchId.length > 0) {
      if (!f.branchId.includes(row.branch_id ?? "")) return false;
    }
    if (f.fulfillmentWarehouse.length > 0) {
      // Cùng quy ước với kiotviet_channel: "none" = chưa gán kho.
      const includesNone = f.fulfillmentWarehouse.includes("none");
      const whStr = row.fulfillment_warehouse != null ? String(row.fulfillment_warehouse) : "";
      if (!whStr) {
        if (!includesNone) return false;
      } else if (!f.fulfillmentWarehouse.includes(whStr)) {
        return false;
      }
    }
    if (f.invoiceStatus.length > 0) {
      const inv = row.invoice_status != null ? String(row.invoice_status) : "";
      if (!f.invoiceStatus.includes(inv)) return false;
    } else if (Number(row.status) === 6 || row.invoice_status === 2) {
      return false;
    }
    if (f.vat.length > 0) {
      if (!f.vat.includes(row.vat ?? "")) return false;
    }
    if (f.orderType.length > 0) {
      if (!f.orderType.includes(row.order_type ?? "")) return false;
    }
    if (f.channelType.length > 0) {
      // Hàng realtime mang code loại kênh (null = kênh chưa phân loại) — cùng
      // quy ước token "none" với bộ lọc phía server.
      const rowChannelType = row.channel_type ?? null;
      const matchesNoneType = rowChannelType === null && f.channelType.includes("none");
      const matchesTypeValue = rowChannelType !== null && f.channelType.includes(rowChannelType);
      if (!matchesNoneType && !matchesTypeValue) return false;
    }
    if (f.shippingType.length > 0) {
      // "none" là token đại diện shipping_type IS NULL (đơn cũ chưa xác định) — khác
      // order_type ở trên vì "" không phải giá trị thật trên trục này, phải so sánh
      // riêng null thay vì includes(row.shipping_type ?? "").
      const rowShippingType = row.shipping_type ?? null;
      const matchesNone = rowShippingType === null && f.shippingType.includes("none");
      const matchesValue = rowShippingType !== null && f.shippingType.includes(rowShippingType);
      if (!matchesNone && !matchesValue) return false;
    }
    if (f.kocOrderType.length > 0) {
      if (!f.kocOrderType.includes(row.koc_order_type ?? "")) return false;
    }
    if (f.kiotvietChannelNull === "true" && row.kiotviet_channel_id != null) return false;
    if (f.kiotvietChannelNull === "false" && row.kiotviet_channel_id == null) return false;
    // Khi đang tìm kiếm (q), bỏ qua lọc show_orders để search ra đơn bất kể
    // show_orders — giống backend và trang Landing.
    if (!rawQ) {
      if (f.showOrders === "true" && !row.show_orders) return false;
      if (f.showOrders === "false" && row.show_orders) return false;
    }
    const hasShippingCode = !!(row.shipping_code && String(row.shipping_code).trim());
    if (f.hasShippingCode === "true" && !hasShippingCode) return false;
    if (f.hasShippingCode === "false" && hasShippingCode) return false;
    const hasInvoiceCode = !!(row.invoice_code && String(row.invoice_code).trim());
    if (f.hasInvoiceCode === "true" && !hasInvoiceCode) return false;
    if (f.hasInvoiceCode === "false" && hasInvoiceCode) return false;
    if (f.isDeliveryInvoicePrinted === "yes" && !row.is_delivery_invoice_printed) return false;
    if (f.isDeliveryInvoicePrinted === "no" && row.is_delivery_invoice_printed) return false;
    if (f.customerReturn === "yes" && !row.customer_return) return false;
    if (f.customerReturn === "no" && row.customer_return) return false;
    const hasInternalNote = !!(row.crm?.internal_note && String(row.crm.internal_note).trim());
    if (f.hasInternalNote === "yes" && !hasInternalNote) return false;
    if (f.hasInternalNote === "no" && hasInternalNote) return false;
    // has_address là cờ bất biến lúc ingest (khác các cờ suy ra từ field hiện tại).
    if (f.hasAddress === "yes" && row.has_address === false) return false;
    if (f.hasAddress === "no" && row.has_address !== false) return false;
    // "Phiếu trả hàng" nằm trên block recall — ngữ nghĩa khớp BE (slip khác rỗng).
    const rowHasReturnSlip = !!(
      row.recall?.return_slip_code && String(row.recall.return_slip_code).trim()
    );
    if (f.hasReturnSlip === "yes" && !rowHasReturnSlip) return false;
    if (f.hasReturnSlip === "no" && rowHasReturnSlip) return false;
    // "Mã đơn thu hồi" nằm trên cột lưới nhiều nhóm — ngữ nghĩa khớp BE (có ít
    // nhất một nhóm recall_entries mang recall_code khác rỗng).
    const rowHasRecallCode = !!row.recall_entries?.some(
      (entry) => entry.recall_code && String(entry.recall_code).trim(),
    );
    if (f.hasRecallCode === "yes" && !rowHasRecallCode) return false;
    if (f.hasRecallCode === "no" && rowHasRecallCode) return false;
    return true;
  }, []);

  // Đồng bộ snapshot filter để upsert handler quyết định có thêm đơn mới
  // đến qua WebSocket vào list hay không (xem applyOrderUpsertInMemory).
  useEffect(() => {
    filterSnapshotRef.current = {
      q,
      dateFrom: dateFilter.from || "",
      dateTo: dateFilter.to || "",
      returnDateFrom: returnDateFilter.from || "",
      returnDateTo: returnDateFilter.to || "",
      kiotvietPurchaseDateFrom: kiotvietPurchaseDateFilter.from || "",
      kiotvietPurchaseDateTo: kiotvietPurchaseDateFilter.to || "",
      status,
      channel,
      product,
      staff,
      deliveryBusinessStatus,
      salesStatus,
      kiotvietChannel,
      branchId,
      fulfillmentWarehouse,
      invoiceStatus,
      vat,
      orderType,
      shippingType,
      channelType,
      kocOrderType,
      kiotvietChannelNull,
      showOrders,
      hasShippingCode,
      hasInvoiceCode,
      isDeliveryInvoicePrinted,
      customerReturn,
      hasInternalNote,
      hasAddress,
      hasReturnSlip,
      hasRecallCode,
      hasCallRecording,
    };
  }, [
    q,
    dateFilter,
    returnDateFilter,
    kiotvietPurchaseDateFilter,
    status,
    channel,
    product,
    staff,
    deliveryBusinessStatus,
    salesStatus,
    kiotvietChannel,
    branchId,
    fulfillmentWarehouse,
    invoiceStatus,
    vat,
    orderType,
    shippingType,
    channelType,
    kocOrderType,
    kiotvietChannelNull,
    showOrders,
    hasShippingCode,
    hasInvoiceCode,
    isDeliveryInvoicePrinted,
    customerReturn,
    hasInternalNote,
    hasAddress,
    hasReturnSlip,
    hasRecallCode,
    hasCallRecording,
  ]);

  return { rowPassesActiveFilters };
}
