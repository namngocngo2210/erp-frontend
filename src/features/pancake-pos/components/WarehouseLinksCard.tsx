import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Save, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/i18n";
import { saveWarehouseLinks, type PancakePosStatus } from "@/lib/api/pancakePos";
import {
  pancakePosKeys,
  usePancakeWarehouses,
  useWarehouseLinks,
} from "@/features/pancake-pos/queries";
import {
  draftsFromRows,
  setDefault,
  takenElsewhere,
  toPayload,
  validateDrafts,
  type WarehouseDraft,
} from "@/features/pancake-pos/warehouse-logic";

const NONE = "__none__";

type Props = { status: PancakePosStatus | undefined; canEdit: boolean };

/**
 * Ghép kho CRM ↔ kho Pancake (docs/pancake-pos-two-way-sync.md §3): mỗi kho CRM chọn
 * một kho Pancake, thứ tự ưu tiên (nhỏ = trước) và một kho mặc định để đẩy đơn (A2).
 */
export function WarehouseLinksCard({ status, canEdit }: Props) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const linksQuery = useWarehouseLinks();
  const remoteQuery = usePancakeWarehouses(Boolean(status?.api_key_set && status?.shop_id));
  const [drafts, setDrafts] = useState<WarehouseDraft[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (linksQuery.data) setDrafts(draftsFromRows(linksQuery.data));
  }, [linksQuery.data]);

  const remote = useMemo(() => remoteQuery.data?.warehouses ?? [], [remoteQuery.data]);
  const remoteNames = useMemo(
    () => Object.fromEntries(remote.map((w) => [w.id, w.name])),
    [remote],
  );
  const error = validateDrafts(drafts);

  const update = (warehouseId: number, patch: Partial<WarehouseDraft>) =>
    setDrafts((prev) => prev.map((d) => (d.warehouseId === warehouseId ? { ...d, ...patch } : d)));

  const save = async () => {
    if (error) {
      toast.error(t(error));
      return;
    }
    setSaving(true);
    try {
      const rows = await saveWarehouseLinks(toPayload(drafts, remoteNames));
      setDrafts(draftsFromRows(rows));
      toast.success(t("pancakePos.warehouses.saved"));
    } catch (err) {
      toast.error((err as Error)?.message || t("pancakePos.warehouses.saveFailed"));
    } finally {
      setSaving(false);
      await queryClient.invalidateQueries({ queryKey: pancakePosKeys.all });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Warehouse className="h-4 w-4 text-sky-600" />
          {t("pancakePos.warehouses.title")}
        </CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => remoteQuery.refetch()}
          disabled={!status?.api_key_set || !status?.shop_id || remoteQuery.isFetching}
        >
          <RefreshCw className="mr-1 h-4 w-4" />
          {t("pancakePos.warehouses.reload")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-xs text-muted-foreground">{t("pancakePos.warehouses.hint")}</p>
        {remoteQuery.data && !remoteQuery.data.ok && (
          <p className="text-xs text-destructive">
            {t("pancakePos.connection.failed").replace("{error}", remoteQuery.data.error)}
          </p>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("pancakePos.warehouses.crm")}</TableHead>
                <TableHead>{t("pancakePos.warehouses.pancake")}</TableHead>
                <TableHead className="w-28">{t("pancakePos.warehouses.priority")}</TableHead>
                <TableHead className="w-28 text-center">
                  {t("pancakePos.warehouses.default")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drafts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    {t("pancakePos.warehouses.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                drafts.map((draft) => {
                  const taken = takenElsewhere(drafts, draft.warehouseId);
                  const options =
                    remote.some((w) => w.id === draft.pancakeId) || !draft.pancakeId
                      ? remote
                      : [
                          ...remote,
                          { id: draft.pancakeId, name: draft.pancakeName || draft.pancakeId },
                        ];
                  return (
                    <TableRow key={draft.warehouseId}>
                      <TableCell>
                        <div className="font-medium">{draft.name}</div>
                        <div className="text-xs text-muted-foreground">{draft.code}</div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={draft.pancakeId || NONE}
                          onValueChange={(value) =>
                            update(draft.warehouseId, {
                              pancakeId: value === NONE ? "" : value,
                              pancakeName: value === NONE ? "" : (remoteNames[value] ?? ""),
                              isDefault: value === NONE ? false : draft.isDefault,
                            })
                          }
                          disabled={!canEdit}
                        >
                          <SelectTrigger
                            className="w-56"
                            aria-label={t("pancakePos.warehouses.pancake")}
                          >
                            <SelectValue placeholder={t("pancakePos.warehouses.none")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>{t("pancakePos.warehouses.none")}</SelectItem>
                            {options
                              .filter((w) => !taken.has(w.id))
                              .map((w) => (
                                <SelectItem key={w.id} value={w.id}>
                                  {w.name || w.id}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          inputMode="numeric"
                          className="w-20"
                          value={draft.priority}
                          disabled={!canEdit || !draft.pancakeId}
                          aria-label={t("pancakePos.warehouses.priority")}
                          onChange={(e) => update(draft.warehouseId, { priority: e.target.value })}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <input
                          type="radio"
                          name="ppos-default-warehouse"
                          className="h-4 w-4 accent-sky-600"
                          checked={draft.isDefault}
                          disabled={!canEdit || !draft.pancakeId}
                          aria-label={t("pancakePos.warehouses.default")}
                          onChange={() => setDrafts((prev) => setDefault(prev, draft.warehouseId))}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" onClick={save} disabled={!canEdit || saving || Boolean(error)}>
            <Save className="mr-1 h-4 w-4" />
            {t("pancakePos.warehouses.save")}
          </Button>
          {error && <span className="text-xs text-destructive">{t(error)}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
