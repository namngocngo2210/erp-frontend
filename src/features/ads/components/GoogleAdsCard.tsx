import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { GoogleAdsAccount } from "@/lib/api/google_ads";

export interface GoogleAdsSpendMetrics {
  spend: number;
  loading: boolean;
  error?: string;
}

interface GoogleAdsCardProps {
  account: GoogleAdsAccount;
  metrics?: GoogleAdsSpendMetrics;
  formatInt: (n: number) => string;
}

export function GoogleAdsCard({ account, metrics, formatInt }: GoogleAdsCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{account.name}</p>
          <p className="font-mono text-xs text-muted-foreground">{account.customer_id}</p>
        </div>
        <Badge variant={account.status === "active" ? "default" : "secondary"}>
          {account.status === "active" ? "Active" : "Removed"}
        </Badge>
      </div>

      <dl className="mt-2 space-y-1 text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Chi phí</dt>
          <dd className="text-right font-medium">
            {metrics?.loading ? (
              <Loader2 className="ml-auto h-4 w-4 animate-spin" />
            ) : metrics?.error ? (
              <span className="text-destructive" title={metrics.error}>
                Lỗi
              </span>
            ) : (
              formatInt(metrics?.spend ?? 0)
            )}
          </dd>
        </div>
        {account.currency && (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Tiền tệ</dt>
            <dd className="text-right">{account.currency}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
