import { useState } from "react";
import { FlaskConical, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/hooks/use-confirm";
import { useI18n } from "@/i18n";
import {
  startPancakePosSync,
  type PancakePosStatus,
  type PancakePosSyncMode,
} from "@/lib/api/pancakePos";
import { pancakePosKeys } from "@/features/pancake-pos/queries";
import { blockReason, MAX_SKUS, parseLimit, parseSkuList } from "@/features/pancake-pos/sync-logic";

type Props = { status: PancakePosStatus | undefined; canEdit: boolean };

/** Nút Chạy thử / Đồng bộ (confirm) + lọc tuỳ chọn theo số nhóm / SKU. */
export function SyncRunnerCard({ status, canEdit }: Props) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [limitText, setLimitText] = useState("");
  const [skuText, setSkuText] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (mode: PancakePosSyncMode) => {
    const limit = parseLimit(limitText);
    if (limit === null) {
      toast.error(t("pancakePos.sync.invalidLimit"));
      return;
    }
    const skus = parseSkuList(skuText);
    if (skus.length > MAX_SKUS) {
      toast.error(t("pancakePos.sync.tooManySkus").replace("{max}", String(MAX_SKUS)));
      return;
    }
    if (
      mode === "full" &&
      !(await confirm({
        title: t("pancakePos.sync.confirmTitle"),
        description: t("pancakePos.sync.confirmDescription"),
        confirmText: t("pancakePos.sync.full"),
      }))
    ) {
      return;
    }
    setBusy(true);
    try {
      const { run_id } = await startPancakePosSync({
        mode,
        limit,
        skus: skus.length ? skus : undefined,
      });
      toast.success(t("pancakePos.sync.queued").replace("{id}", String(run_id)));
    } catch (error) {
      toast.error((error as Error)?.message || t("pancakePos.sync.failed"));
    } finally {
      setBusy(false);
      await queryClient.invalidateQueries({ queryKey: pancakePosKeys.all });
    }
  };

  const dryBlock = blockReason(status, "dry_run");
  const fullBlock = blockReason(status, "full");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("pancakePos.sync.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-3 md:grid-cols-[12rem_1fr]">
          <label className="grid gap-1">
            <span className="text-xs text-muted-foreground">{t("pancakePos.sync.limit")}</span>
            <Input
              inputMode="numeric"
              value={limitText}
              onChange={(e) => setLimitText(e.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-muted-foreground">{t("pancakePos.sync.skus")}</span>
            <Textarea rows={2} value={skuText} onChange={(e) => setSkuText(e.target.value)} />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => run("dry_run")}
            disabled={!canEdit || busy || dryBlock !== null}
            title={dryBlock ? t(dryBlock) : undefined}
          >
            <FlaskConical className="mr-1 h-4 w-4" />
            {t("pancakePos.sync.dryRun")}
          </Button>
          <Button
            type="button"
            onClick={() => run("full")}
            disabled={!canEdit || busy || fullBlock !== null}
            title={fullBlock ? t(fullBlock) : undefined}
          >
            <UploadCloud className="mr-1 h-4 w-4" />
            {t("pancakePos.sync.full")}
          </Button>
          {canEdit && (fullBlock || dryBlock) && (
            <span className="text-xs text-muted-foreground">
              {t((dryBlock ?? fullBlock) as string)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
