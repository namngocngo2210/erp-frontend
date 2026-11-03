import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { BombReasonsChart } from "../DashboardCharts";
import { EmptyCard, type Derived, type Translate } from "./section-shared";

export function BombReasonsSection({
  t,
  bombReasons,
  bombTotal,
}: {
  t: Translate;
  bombReasons: Derived["bombReasons"];
  bombTotal: number;
}) {
  return (
    <Card className="rounded-xl border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {t("dashboard.bombReasonsTitle", "Nhóm 5c — Tỷ trọng lý do bom hàng")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t("dashboard.bombReasonsHint", "Tính trên các đơn có status = Đã hoàn (RETURNED).")}
        </p>
      </CardHeader>
      <CardContent>
        {bombTotal === 0 ? (
          <EmptyCard t={t} />
        ) : (
          <BombReasonsChart reasons={bombReasons} total={bombTotal} />
        )}
      </CardContent>
    </Card>
  );
}
