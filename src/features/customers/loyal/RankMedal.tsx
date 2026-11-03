import { Medal } from "lucide-react";

import { useI18n } from "@/i18n";

/** Huy chương vàng/bạc/đồng cho 3 hạng đầu tiên, các hạng còn lại để trống. */
export function RankMedal({ rank }: { rank: number }) {
  const { t } = useI18n();
  const config: Record<number, { color: string; label: string }> = {
    1: { color: "text-yellow-500", label: t("loyalCustomers.medal.gold", "Huy chương vàng") },
    2: { color: "text-slate-400", label: t("loyalCustomers.medal.silver", "Huy chương bạc") },
    3: { color: "text-amber-700", label: t("loyalCustomers.medal.bronze", "Huy chương đồng") },
  };
  const medal = config[rank];
  if (!medal) return <span className="text-muted-foreground">-</span>;
  return (
    <span className="inline-flex items-center gap-1" title={medal.label} aria-label={medal.label}>
      <Medal className={`h-5 w-5 ${medal.color}`} />
      <span className="text-sm font-semibold text-foreground">{rank}</span>
    </span>
  );
}
