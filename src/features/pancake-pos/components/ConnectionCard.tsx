import { useState } from "react";
import { Link } from "react-router-dom";
import { PlugZap, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/i18n";
import {
  checkPancakePosHealth,
  setPancakePosShop,
  type PancakePosHealth,
  type PancakePosStatus,
} from "@/lib/api/pancakePos";
import { pathFromSection } from "@/lib/routes";
import { pancakePosKeys } from "@/features/pancake-pos/queries";

type Props = { status: PancakePosStatus | undefined; isSuperuser: boolean };

/** Trạng thái cấu hình + nút Kiểm tra (GET /shops qua BE) + chọn shop (superuser). */
export function ConnectionCard({ status, isSuperuser }: Props) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [health, setHealth] = useState<PancakePosHealth | null>(null);
  const [checking, setChecking] = useState(false);
  const [savingShop, setSavingShop] = useState(false);

  const handleCheck = async () => {
    setChecking(true);
    try {
      setHealth(await checkPancakePosHealth());
    } catch (error) {
      toast.error((error as Error)?.message || t("pancakePos.sync.failed"));
    } finally {
      setChecking(false);
    }
  };

  const handleShop = async (value: string) => {
    setSavingShop(true);
    try {
      await setPancakePosShop(Number(value));
      toast.success(t("pancakePos.shop.saved"));
      setHealth((prev) => (prev ? { ...prev, shop_id: Number(value), shop_found: true } : prev));
      await queryClient.invalidateQueries({ queryKey: pancakePosKeys.status });
    } catch (error) {
      toast.error((error as Error)?.message || t("pancakePos.shop.saveFailed"));
    } finally {
      setSavingShop(false);
    }
  };

  const shopId = status?.shop_id ?? 0;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">{t("pancakePos.connection.title")}</CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={handleCheck} disabled={checking}>
          <PlugZap className="mr-1 h-4 w-4" />
          {t("pancakePos.connection.check")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone={status?.enabled ? "success" : "neutral"}>
            {t(
              status?.enabled ? "pancakePos.connection.enabled" : "pancakePos.connection.disabled",
            )}
          </StatusBadge>
          <StatusBadge tone={status?.api_key_set ? "success" : "warning"}>
            {t(
              status?.api_key_set
                ? "pancakePos.connection.keySet"
                : "pancakePos.connection.keyUnset",
            )}
          </StatusBadge>
          <StatusBadge tone={shopId ? "info" : "warning"}>
            {shopId
              ? t("pancakePos.connection.shop").replace("{id}", String(shopId))
              : t("pancakePos.connection.noShop")}
          </StatusBadge>
          {status && status.dirty_count > 0 && (
            <StatusBadge tone="info">
              {t("pancakePos.connection.dirty").replace("{count}", String(status.dirty_count))}
            </StatusBadge>
          )}
        </div>

        {health && (
          <p className={health.ok ? "text-action-success" : "text-destructive"} role="status">
            {health.ok
              ? t("pancakePos.connection.ok")
              : t("pancakePos.connection.failed").replace("{error}", health.error)}
          </p>
        )}
        {health?.ok && shopId > 0 && !health.shop_found && (
          <p className="text-action-warning">{t("pancakePos.shop.notFound")}</p>
        )}
        {health?.ok && health.shops.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{t("pancakePos.shop.label")}</span>
            <Select
              value={shopId ? String(shopId) : undefined}
              onValueChange={handleShop}
              disabled={!isSuperuser || savingShop}
            >
              <SelectTrigger className="w-64" aria-label={t("pancakePos.shop.label")}>
                <SelectValue placeholder={t("pancakePos.shop.placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {health.shops.map((shop) => (
                  <SelectItem key={shop.id} value={String(shop.id)}>
                    {shop.name} ({shop.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isSuperuser && (
              <span className="text-xs text-muted-foreground">
                {t("pancakePos.shop.superuserOnly")}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{t("pancakePos.connection.settingsHint")}</span>
          {isSuperuser && (
            <Link
              to={pathFromSection("system-settings")}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <Settings2 className="h-3 w-3" />
              {t("pancakePos.connection.openSettings")}
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
