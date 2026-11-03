import { Badge } from "@/components/ui/badge";
import type { CustomerProfile } from "@/lib/api/customer-profile";
import {
  BUYER_ROLE_LABELS,
  ERA_HINTS,
  ERA_LABELS,
  PRICE_TIER_LABELS,
  RHYTHM_LABELS,
} from "@/features/customer-profile/profile-labels";
import { ProfileStat } from "@/features/customer-profile/components/ProfileStat";

function ChipList({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <Badge key={v} variant="secondary">
            {v}
          </Badge>
        ))}
      </div>
    </div>
  );
}

/** Chân dung suy ra từ hành vi mua — khối phủ gần như toàn bộ khách.
 *
 * `era` đứng đầu vì nó là câu hỏi bán hàng thực sự: khách chỉ mua dòng cũ thì
 * chưa từng chạm tới dòng sản phẩm hiện tại, và đó là phần lớn tệp khách.
 */
export function ProfileBehaviour({ profile }: { profile: CustomerProfile }) {
  if (profile.orders_gtc === 0) {
    return (
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Hành vi mua</h3>
        <p className="text-sm text-muted-foreground">
          Khách chưa có đơn giao thành công nào, nên chưa suy ra được hành vi mua. Dòng thời gian
          bên dưới vẫn cho thấy các đơn đã đặt.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold">Hành vi mua</h3>

      {profile.era && (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Thế hệ sản phẩm</span>
            <Badge variant={profile.era === "both" ? "success" : "outline"}>
              {ERA_LABELS[profile.era]}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{ERA_HINTS[profile.era]}</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ProfileStat
          label="Nhịp mua"
          value={
            profile.purchase_rhythm_lifetime ? RHYTHM_LABELS[profile.purchase_rhythm_lifetime] : "—"
          }
          hint={
            profile.repurchase_gap_median_days !== null
              ? `Trung vị ${Math.round(profile.repurchase_gap_median_days)} ngày giữa hai đơn`
              : undefined
          }
        />
        <ProfileStat
          label="Mức giá thường mua"
          value={profile.price_tier_lifetime ? PRICE_TIER_LABELS[profile.price_tier_lifetime] : "—"}
          hint="Tính trên toàn bộ lịch sử, không tách theo thế hệ"
        />
        <ProfileStat label="Số sản phẩm khác nhau" value={profile.distinct_products} />
        <ProfileStat
          label="Mua cho ai"
          value={profile.buyer_role ? BUYER_ROLE_LABELS[profile.buyer_role] : "—"}
          hint={profile.buyer_role ? undefined : "Chỉ suy ra được khi khách có khai báo nhu cầu"}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <ChipList label="Kênh đã mua" values={profile.channels} />
        <ChipList label="Tỉnh/thành giao hàng" values={profile.provinces} />
        <ChipList label="Sản phẩm đã mua" values={profile.top_skus} />
      </div>
    </section>
  );
}
