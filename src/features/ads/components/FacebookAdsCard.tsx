import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { FacebookAdAccount } from "@/lib/api/facebook_ads";

export interface FacebookAdsMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  loading: boolean;
  error?: string;
}

interface FacebookAdsCardProps {
  account: FacebookAdAccount;
  metrics?: FacebookAdsMetrics;
  formatInt: (n: number) => string;
}

export function FacebookAdsCard({ account, metrics, formatInt }: FacebookAdsCardProps) {
  const renderMetric = (value: number) => {
    if (metrics?.loading) return <Loader2 className="ml-auto h-4 w-4 animate-spin" />;
    if (metrics?.error)
      return (
        <span className="text-destructive" title={metrics.error}>
          Lỗi
        </span>
      );
    return formatInt(value);
  };

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{account.name}</p>
          {account.account_id && (
            <p className="font-mono text-xs text-muted-foreground">{account.account_id}</p>
          )}
        </div>
        <Badge variant={account.status === "active" ? "default" : "secondary"}>
          {account.status === "active" ? "Active" : "Removed"}
        </Badge>
      </div>

      <dl className="mt-2 space-y-1 text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Chi phí</dt>
          <dd className="text-right font-medium">{renderMetric(metrics?.spend ?? 0)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Hiển thị</dt>
          <dd className="text-right">{renderMetric(metrics?.impressions ?? 0)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Click</dt>
          <dd className="text-right">{renderMetric(metrics?.clicks ?? 0)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Tiếp cận</dt>
          <dd className="text-right">{renderMetric(metrics?.reach ?? 0)}</dd>
        </div>
      </dl>
    </div>
  );
}
