/**
 * Bucket state tác nghiệp CSKH (module contact_flow) cho cột "Tác nghiệp" +
 * chip lọc ở trang Danh sách contact. Key mirror BE `BucketEnum`
 * (apps/contact_flow/transport/serializers/runtime_serializers.bucket_of).
 * Đổi nhãn/mã ở đây, đổi enum values phải sửa cả BE.
 */
export type OperationBucketKey = "overdue" | "today" | "upcoming" | "ended" | "none";

export const OPERATION_BUCKETS: Record<OperationBucketKey, { label: string; badgeClass: string }> =
  {
    overdue: { label: "Quá hạn", badgeClass: "bg-action-danger text-white border-transparent" },
    today: { label: "Hôm nay", badgeClass: "bg-action-warning text-white border-transparent" },
    upcoming: { label: "Sắp tới", badgeClass: "bg-action-info text-white border-transparent" },
    ended: { label: "Kết thúc", badgeClass: "bg-slate-500 text-white border-transparent" },
    none: {
      label: "Chưa vào flow",
      badgeClass: "bg-muted text-muted-foreground border-transparent",
    },
  };

/** Thứ tự chip trên thanh lọc — bao gồm "none" (khác CHIP_ORDER của action_needed). */
export const OPERATION_BUCKET_ORDER: OperationBucketKey[] = [
  "overdue",
  "today",
  "upcoming",
  "ended",
  "none",
];
