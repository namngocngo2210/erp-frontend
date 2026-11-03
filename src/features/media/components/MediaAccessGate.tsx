import type { ReactNode } from "react";
import { ShieldOff } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { useI18n } from "@/i18n";
import type { MediaMe } from "@/lib/api/media";

import { useMediaMe } from "../queries";

/** Bọc mọi trang Media: chờ /api/media/me, chặn khi chưa provisioned, banner khi kết nối lỗi. */
export function MediaAccessGate({ children }: { children: (me: MediaMe) => ReactNode }) {
  const { t } = useI18n();
  const { data: me, isLoading, error } = useMediaMe();
  if (isLoading) return <LogoSpinner />;
  if (error || !me) {
    return (
      <EmptyState
        icon={ShieldOff}
        title={t("media.gate.connectionError")}
        description={error instanceof Error ? error.message : undefined}
      />
    );
  }
  if (!me.provisioned) {
    return (
      <EmptyState
        icon={ShieldOff}
        title={t("media.gate.notProvisioned.title")}
        description={t("media.gate.notProvisioned.desc")}
      />
    );
  }
  return (
    <>
      {!me.connection_ok ? (
        <div className="mb-3 rounded-lg border border-action-danger/30 bg-action-danger/10 px-4 py-3 text-sm text-action-danger">
          {t("media.gate.connectionError")}
        </div>
      ) : null}
      {children(me)}
    </>
  );
}
