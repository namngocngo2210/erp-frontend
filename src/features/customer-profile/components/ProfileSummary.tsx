import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { formatDateTime } from "@/lib/utils";
import type { CustomerProfile } from "@/lib/api/customer-profile";
import { GENDER_LABELS, RECENCY_LABELS } from "@/features/customer-profile/profile-labels";
import { ProfileStat } from "@/features/customer-profile/components/ProfileStat";

function daysLabel(days: number | null): string {
  if (days === null) return "Chưa mua bao giờ";
  if (days === 0) return "Hôm nay";
  return `${days} ngày trước`;
}

/** Đầu hồ sơ: ai, thuộc phân khúc nào, và bốn con số quyết định.
 *
 * "Đã chi" chỉ cộng đơn giao thành công, nên với khách huỷ sạch đơn nó bằng 0
 * trong khi ô "đơn" bên cạnh vẫn khác 0. Đó là chủ ý và được ghi rõ trên màn
 * hình — hai ô mâu thuẫn nhau mà không giải thích là cách nhanh nhất để người
 * xem kết luận báo cáo sai.
 */
export function ProfileSummary({ profile }: { profile: CustomerProfile }) {
  const gender = profile.gender ? GENDER_LABELS[profile.gender] : null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="text-xl font-semibold">{profile.full_name || "(không có tên)"}</h2>
        {profile.code && <span className="text-sm text-muted-foreground">{profile.code}</span>}
        {gender && <Badge variant="outline">{gender}</Badge>}
        {profile.segment_name && <Badge variant="info">{profile.segment_name}</Badge>}
        {profile.recency_bucket && (
          <Badge variant={profile.recency_bucket === "active" ? "success" : "warning"}>
            {RECENCY_LABELS[profile.recency_bucket]}
          </Badge>
        )}
        {profile.has_problem && (
          <Badge variant="destructive">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Có vấn đề
          </Badge>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ProfileStat
          label="Đã chi"
          value={formatCurrency(profile.total_spent, { style: "suffix" })}
          hint="Chỉ tính đơn giao thành công"
        />
        <ProfileStat
          label="Đơn thành công"
          value={profile.orders_gtc}
          hint={
            profile.orders_cancelled > 0
              ? `${profile.orders_cancelled} đơn đã huỷ`
              : `${profile.orders_all} đơn tổng cộng`
          }
        />
        <ProfileStat
          label="Giá trị đơn trung bình"
          value={formatCurrency(profile.avg_order_value, { style: "suffix" })}
        />
        <ProfileStat
          label="Mua lần cuối"
          value={daysLabel(profile.days_since_last_purchase)}
          hint={profile.last_purchase_at ? formatDateTime(profile.last_purchase_at) : undefined}
        />
      </div>
    </section>
  );
}
