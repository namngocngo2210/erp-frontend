import { Inbox } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import type { useI18n } from "@/i18n";

import type { useDashboardSummary } from "../../use-dashboard-summary";

export type Translate = ReturnType<typeof useI18n>["t"];
export type Derived = ReturnType<typeof useDashboardSummary>;

export function EmptyCard({ t }: { t: Translate }) {
  return <EmptyState icon={Inbox} title={t("dashboard.empty", "No data yet.")} className="py-6" />;
}
