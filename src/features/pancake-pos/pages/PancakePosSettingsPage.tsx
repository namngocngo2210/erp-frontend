import { useState } from "react";

import { PageHeader } from "@/components/ui/page-header";
import { useAppShell } from "@/app/AppShellContext";
import { usePermission } from "@/hooks/usePermission";
import { useI18n } from "@/i18n";
import { ConnectionCard } from "@/features/pancake-pos/components/ConnectionCard";
import { InboundOrdersCard } from "@/features/pancake-pos/components/InboundOrdersCard";
import { InitialStockCard } from "@/features/pancake-pos/components/InitialStockCard";
import { LinksCard } from "@/features/pancake-pos/components/LinksCard";
import { MismatchCard } from "@/features/pancake-pos/components/MismatchCard";
import { OrderPushCard } from "@/features/pancake-pos/components/OrderPushCard";
import { RUNS_PAGE_SIZE, SyncRunsCard } from "@/features/pancake-pos/components/SyncRunsCard";
import { StuckOrdersCard } from "@/features/pancake-pos/components/StuckOrdersCard";
import { SyncRunnerCard } from "@/features/pancake-pos/components/SyncRunnerCard";
import { WarehouseLinksCard } from "@/features/pancake-pos/components/WarehouseLinksCard";
import { WebhookCard } from "@/features/pancake-pos/components/WebhookCard";
import { usePancakePosRuns, usePancakePosStatus } from "@/features/pancake-pos/queries";
import { hasRunningRun } from "@/features/pancake-pos/sync-logic";

/**
 * Cài đặt → Pancake POS: kết nối (kiểm tra key, chọn shop), chạy thử / đồng bộ,
 * nhật ký lượt chạy, liên kết lỗi/xung đột; ghép kho + tồn đầu kỳ (two-way-sync A1);
 * đẩy đơn CRM → Pancake (A2); webhook Pancake → CRM + chờ khớp đơn (B1); đơn treo + lệch KiotViet ↔ Pancake (MR D). Xem = `pancake-pos:view`; bấm chạy/thử
 * lại = `pancake-pos:edit` (BE gate lại). API key nhập ở Cấu hình hệ thống.
 */
export default function PancakePosSettingsPage() {
  const { t } = useI18n();
  const { user } = useAppShell();
  const can = usePermission();
  const canEdit = can("pancake-pos:edit");
  const [runsOffset, setRunsOffset] = useState(0);
  const [polling, setPolling] = useState(false);

  const statusQuery = usePancakePosStatus(polling);
  const runsQuery = usePancakePosRuns(runsOffset, RUNS_PAGE_SIZE, polling);
  const running = hasRunningRun(runsQuery.data?.items, statusQuery.data);
  // Bật/tắt polling theo dữ liệu mới nhất (tránh vòng lặp render: chỉ set khi đổi).
  if (running !== polling) setPolling(running);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("pancakePos.title")} description={t("pancakePos.description")} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ConnectionCard status={statusQuery.data} isSuperuser={Boolean(user?.is_superuser)} />
        <SyncRunnerCard status={statusQuery.data} canEdit={canEdit} />
      </div>
      <SyncRunsCard
        runs={runsQuery.data?.items ?? []}
        total={runsQuery.data?.total ?? 0}
        offset={runsOffset}
        onOffsetChange={setRunsOffset}
      />
      <LinksCard canEdit={canEdit} />
      <div className="grid gap-4 xl:grid-cols-2">
        <WarehouseLinksCard status={statusQuery.data} canEdit={canEdit} />
        <InitialStockCard status={statusQuery.data} canEdit={canEdit} />
      </div>
      <OrderPushCard status={statusQuery.data} canEdit={canEdit} />
      <WebhookCard canEdit={canEdit} />
      <InboundOrdersCard canEdit={canEdit} />
      <StuckOrdersCard />
      <MismatchCard />
    </div>
  );
}
