import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { CARRIER_CHART_COLORS } from "../../dashboard-constants";
import { DistributionDonut } from "../DashboardCharts";
import { EmptyCard, type Derived, type Translate } from "./section-shared";
import { formatNumber } from "@/lib/format";

export function CarrierDataSection({
  t,
  carrierRows,
  carrierTotal,
}: {
  t: Translate;
  carrierRows: Derived["carrierRows"];
  carrierTotal: Derived["carrierTotal"];
}) {
  return (
    <Card className="rounded-xl border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {t("dashboard.carrierDataTitle", "Data theo nhà mạng")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t(
            "dashboard.carrierDataHint",
            "Nhận diện theo đầu số SĐT — số chuyển mạng giữ số vẫn tính theo nhà mạng gốc của đầu số.",
          )}
        </p>
      </CardHeader>
      <CardContent>
        {carrierTotal === 0 ? (
          <EmptyCard t={t} />
        ) : (
          <div className="mx-auto max-w-md rounded-xl border border-border bg-muted/20 p-4">
            <DistributionDonut
              data={carrierRows
                .filter((row) => row.total > 0)
                .map((row) => ({
                  name: row.label,
                  value: row.total,
                  color: CARRIER_CHART_COLORS[row.carrier] ?? CARRIER_CHART_COLORS.unknown,
                }))}
              centerValue={formatNumber(carrierTotal)}
              centerLabel={t("dashboard.totalDataColumn", "Tổng data")}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
