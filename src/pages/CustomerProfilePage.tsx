import { useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { PageHeader } from "@/components/ui/page-header";
import { useI18n } from "@/i18n";
import type { CustomerSearchHit } from "@/lib/api/customer-profile";

import { CustomerSearchBox } from "@/features/customer-profile/components/CustomerSearchBox";
import { ProfileBehaviour } from "@/features/customer-profile/components/ProfileBehaviour";
import { ProfileDeclared } from "@/features/customer-profile/components/ProfileDeclared";
import { ProfileSummary } from "@/features/customer-profile/components/ProfileSummary";
import { ProfileTimeline } from "@/features/customer-profile/components/ProfileTimeline";
import { useCustomerProfile } from "@/features/customer-profile/queries";

/**
 * Trang Hồ sơ khách hàng 360 (`/reports/customer-explorer`).
 *
 * Thay cho trang Khám phá dữ liệu cũ (hai tab bảng + xuất Excel, gỡ 2026-08-21
 * theo yêu cầu chủ sở hữu). Đường dẫn và mã section RBAC giữ nguyên có chủ ý:
 * đổi mã section kéo theo migration quyền và cập nhật `VALID_SECTIONS`, chỗ đã
 * ba lần khoá nhầm người dùng ra ngoài trong dự án này. Mã section không ai
 * nhìn thấy; nhãn hiển thị thì đổi được miễn phí.
 *
 * Khối hiển thị xếp theo độ phủ dữ liệu giảm dần, và khối nào rỗng thì ẩn hẳn
 * chứ không hiện khung trống — chân dung khai báo chỉ có ở khoảng 2/100 khách,
 * nên nếu để nó làm trung tâm thì hầu hết lần mở ra sẽ là một trang trống.
 */
export default function CustomerProfilePage() {
  const { t } = useI18n();
  const [selected, setSelected] = useState<CustomerSearchHit | null>(null);
  const { data, isLoading, isError, error } = useCustomerProfile(selected?.customer_id ?? null);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader title={t("page.title.customerExplorer")} />

      <CustomerSearchBox onSelect={setSelected} selectedId={selected?.customer_id ?? null} />

      {!selected && (
        <EmptyState
          title="Chưa chọn khách hàng"
          description="Tìm theo tên, mã khách, hoặc số điện thoại để xem hồ sơ đầy đủ của một người."
        />
      )}

      {selected && isLoading && (
        <div className="flex justify-center py-12">
          <LogoSpinner />
        </div>
      )}

      {selected && isError && (
        <EmptyState
          title="Không tải được hồ sơ"
          description={error instanceof Error ? error.message : "Vui lòng thử lại."}
        />
      )}

      {selected && data && (
        <div className="space-y-8">
          <ProfileSummary profile={data.profile} />
          <ProfileBehaviour profile={data.profile} />
          <ProfileDeclared profile={data.profile} />
          <ProfileTimeline orders={data.timeline} truncated={data.timeline_truncated} />
        </div>
      )}
    </div>
  );
}
