export const dashboard = {
  "dashboard.summaryHint": "Overview of system activity",
  "dashboard.landingDeliveredHint":
    "Number of successfully delivered Landing orders per staff member.",
  "dashboard.landingDeliveredByStaff": "Delivered Landing orders by staff",
  "dashboard.staffColumn": "Staff",
  "dashboard.usernameColumn": "Username",
  "dashboard.deliveredColumn": "Delivered orders",
  "dashboard.totalRow": "Total",
  "dashboard.unknownStaff": "Unknown",
  "dashboard.empty": "No data to display",
  "dashboard.closeRateTitle": "Close rate by sale",
  "dashboard.closeRateHint":
    "Closed = closed, closed_express, created_order. Unreachable includes unreachable and no_answer 1/2/3/4.",
  "dashboard.totalDataColumn": "Total data",
  "dashboard.closedColumn": "Closed",
  "dashboard.spamColumn": "Spam",
  "dashboard.unreachableColumn": "Unreachable",
  "dashboard.rateExclSpamColumn": "% close (−spam)",
  "dashboard.rateExclSpamUnreachableColumn": "% close (−spam −unreach.)",
  "dashboard.saleFbRevenueTitle": "Closed-order revenue – Sale FB channel",
  "dashboard.saleFbRevenueHint":
    "Only orders with sales_status_code ∈ {closed, closed_express, created_order}. Revenue = total_after_discount.",
  "dashboard.closedOrdersColumn": "Closed orders",
  "dashboard.revenueColumn": "Revenue (VND)",
  "dashboard.closedRevenueTitle": "Group 9 — Assigned data & closed revenue by sale",
  "dashboard.closedRevenueHint":
    'Closed revenue = total amount of orders whose assessment is in a closed status (closed / express / order created) — excluding "closed, scheduled date". Includes orders later returned; excludes cancelled orders. The order count here is therefore lower than Group 1\'s closed total. Group 4 uses a different criterion — successfully delivered orders regardless of assessment.',
  "dashboard.assignedDataColumn": "Assigned data",
  "dashboard.closeRateColumn": "% close",
  "dashboard.closedRevenueColumn": "Closed revenue",
} as const;
