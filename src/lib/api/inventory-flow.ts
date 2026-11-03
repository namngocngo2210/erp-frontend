import type { components } from "@/api/schema.d.ts";

// Tab Xuất
export type IssueOrdersHistory = components["schemas"]["IssueOrdersHistory"];
export type IssueOrdersHistoryItem = components["schemas"]["IssueOrdersHistoryItem"];

// Tab Nhập hoàn
export type ReturnHistory = components["schemas"]["ReturnHistory"];
export type ReturnHistoryItem = components["schemas"]["ReturnHistoryItem"];

// Số tổng hợp đầu trang + phân loại ĐVVC
export type FlowSummary = components["schemas"]["FlowSummary"];
export type FlowSummaryCarrier = components["schemas"]["FlowSummaryCarrier"];

// Mã vận đơn chờ khớp (dùng chung 2 tab — schema gộp thành 1 component)
export type FlowPendingScans = components["schemas"]["FlowPendingScans"];
export type FlowPendingScanItem = components["schemas"]["FlowPendingScanItem"];

// Dòng SKU rút gọn hiển thị trong cell mã hóa đơn (dùng chung 2 tab)
export type FlowLineBrief = components["schemas"]["FlowLineBrief"];

// Khớp thủ công theo mã hóa đơn
export type FlowOrderLookup = components["schemas"]["FlowOrderLookup"];
export type FlowOrderLookupItem = components["schemas"]["FlowOrderLookupItem"];
export type FlowManualMatchResult = components["schemas"]["FlowManualMatchResult"];

// View Theo SKU — tab Xuất
export type IssueSkusHistory = components["schemas"]["IssueSkusHistory"];
export type IssueSkusHistoryItem = components["schemas"]["IssueSkusHistoryItem"];
export type IssueSkuOrders = components["schemas"]["IssueSkuOrders"];
export type IssueSkuOrderItem = components["schemas"]["IssueSkuOrderItem"];

// View Theo SKU — tab Nhập hoàn
export type ReturnSkusHistory = components["schemas"]["ReturnSkusHistory"];
export type ReturnSkusHistoryItem = components["schemas"]["ReturnSkusHistoryItem"];
export type ReturnSkuReturns = components["schemas"]["ReturnSkuReturns"];
export type ReturnSkuReturnItem = components["schemas"]["ReturnSkuReturnItem"];
