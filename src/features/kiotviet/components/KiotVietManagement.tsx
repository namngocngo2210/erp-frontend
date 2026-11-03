import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaginationPages } from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KiotVietDialog, type SyncBranchPairDraft } from "@/features/kiotviet/KiotVietDialog";
import { KiotVietTable } from "@/features/kiotviet/KiotVietTable";
import { useI18n } from "@/i18n";
import { useRangeSelect } from "@/hooks/use-range-select";
import { matchesSearchTerm } from "@/lib/text-search";
import type { KiotVietChannelRow, KiotVietPayload } from "@/features/kiotviet/types";

export type { KiotVietChannelRow };

type OldChannelOption = {
  id: number;
  name: string;
  branchIds: string[];
};

type Props = {
  rows: KiotVietChannelRow[];
  onCreate: (payload: KiotVietPayload) => Promise<void>;
  onUpdate: (id: number, payload: Partial<KiotVietPayload>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onBulkDelete: (ids: number[]) => Promise<void>;
};

function toBranchIds(text: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const cleaned = raw.trim();
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    result.push(cleaned);
  }
  return result;
}

function toBranchIdsText(row: KiotVietChannelRow): string {
  const source =
    row.branch_ids && row.branch_ids.length > 0
      ? row.branch_ids
      : row.branch_id
        ? [row.branch_id]
        : [];
  return source.join("\n");
}

function toSyncBranchPairs(row: KiotVietChannelRow): SyncBranchPairDraft[] {
  const pairs = (row.old_sync_branch_map || [])
    .map((pair) => ({
      source: (pair.source_branch_id || "").trim(),
      target: (pair.target_branch_id || "").trim(),
    }))
    .filter((pair) => pair.source && pair.target);
  if (pairs.length > 0) return pairs;
  // Kênh cũ chưa có map: seed từ cặp legacy (branch_id -> old_sync_branch_id).
  const legacyTarget = (row.old_sync_branch_id || "").trim();
  const legacySource = (row.branch_id || "").trim();
  if (legacyTarget && legacySource) {
    return [{ source: legacySource, target: legacyTarget }];
  }
  return [];
}

export function KiotVietManagement({ rows, onCreate, onUpdate, onDelete, onBulkDelete }: Props) {
  const { t } = useI18n();
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState<KiotVietChannelRow | null>(null);
  const [form, setForm] = useState({
    name: "",
    branchIdsText: "",
    syncBranchPairs: [] as SyncBranchPairDraft[],
    clientId: "",
    clientSecret: "",
    retailer: "",
    username: "",
    password: "",
    isOldKiot: false,
    vatTaxIdText: "",
    pairedOldChannelId: null as number | null,
  });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<KiotVietChannelRow | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");

  const normalizedSearchTerm = searchTerm.trim();
  // Toàn bộ kênh KiotViet đã có sẵn ở client nên lọc tại chỗ, không gọi lại API.
  const filteredRows = useMemo(() => {
    if (!normalizedSearchTerm) return rows;
    return rows.filter((row) =>
      matchesSearchTerm(normalizedSearchTerm, [
        row.name,
        row.retailer,
        row.client_id,
        row.username,
        row.branch_id,
        ...(row.branch_ids ?? []),
        row.paired_old_channel_name,
      ]),
    );
  }, [rows, normalizedSearchTerm]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredRows.length / pageSize)),
    [filteredRows.length, pageSize],
  );
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Đổi từ khoá thì luôn về trang 1, tránh đứng ở trang trống.
  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedSearchTerm]);

  useEffect(() => {
    if (form.isOldKiot && (form.pairedOldChannelId !== null || form.syncBranchPairs.length > 0)) {
      setForm((prev) => ({ ...prev, pairedOldChannelId: null, syncBranchPairs: [] }));
    }
  }, [form.isOldKiot, form.pairedOldChannelId, form.syncBranchPairs]);

  const oldChannelOptions = useMemo<OldChannelOption[]>(() => {
    const currentEditingId = editing?.id ?? null;
    return rows
      .filter((row) => row.old && row.id !== currentEditingId)
      .map((row) => {
        const branchIds =
          row.branch_ids && row.branch_ids.length > 0
            ? row.branch_ids
            : row.branch_id
              ? [row.branch_id]
              : [];
        return { id: row.id, name: row.name, branchIds };
      });
  }, [rows, editing]);

  const selectedPairedOldChannel = useMemo(
    () => oldChannelOptions.find((channel) => channel.id === form.pairedOldChannelId) ?? null,
    [oldChannelOptions, form.pairedOldChannelId],
  );

  useEffect(() => {
    if (form.isOldKiot || !selectedPairedOldChannel) {
      if (form.syncBranchPairs.length > 0) {
        setForm((prev) => ({ ...prev, syncBranchPairs: [] }));
      }
      return;
    }
    // Đổi kênh Kiot cũ: kho đích không còn thuộc kênh mới chọn thì reset về rỗng.
    const hasStaleTarget = form.syncBranchPairs.some(
      (pair) => pair.target && !selectedPairedOldChannel.branchIds.includes(pair.target),
    );
    if (hasStaleTarget) {
      setForm((prev) => ({
        ...prev,
        syncBranchPairs: prev.syncBranchPairs.map((pair) =>
          pair.target && !selectedPairedOldChannel.branchIds.includes(pair.target)
            ? { ...pair, target: "" }
            : pair,
        ),
      }));
    }
  }, [form.isOldKiot, selectedPairedOldChannel, form.syncBranchPairs]);

  const resetForm = () => {
    setForm({
      name: "",
      branchIdsText: "",
      syncBranchPairs: [],
      clientId: "",
      clientSecret: "",
      retailer: "",
      username: "",
      password: "",
      isOldKiot: false,
      vatTaxIdText: "",
      pairedOldChannelId: null,
    });
  };

  const allChecked =
    paginatedRows.length > 0 && paginatedRows.every((row) => selectedIds.includes(row.id));
  const handleToggleOne = useRangeSelect(paginatedRows, selectedIds, setSelectedIds);

  const startEdit = (row: KiotVietChannelRow) => {
    setEditing(row);
    setForm({
      name: row.name,
      branchIdsText: toBranchIdsText(row),
      clientId: row.client_id,
      clientSecret: row.client_secret,
      retailer: row.retailer,
      username: row.username || "",
      password: row.password || "",
      syncBranchPairs: toSyncBranchPairs(row),
      isOldKiot: row.old,
      vatTaxIdText: row.vat_tax_id == null ? "" : String(row.vat_tax_id),
      pairedOldChannelId: row.paired_old_channel_id ?? null,
    });
    setOpenEdit(true);
  };

  // Validate + chuẩn hoá cặp kho đồng bộ; trả null (kèm toast) khi không hợp lệ.
  const buildSyncBranchPairs = (branchIds: string[]): SyncBranchPairDraft[] | null => {
    if (form.isOldKiot || form.pairedOldChannelId === null) return [];
    const filledPairs = form.syncBranchPairs.filter((pair) => pair.source || pair.target);
    if (filledPairs.some((pair) => !pair.source || !pair.target)) {
      toast.error(t("kiotviet.toast.syncBranchPairIncomplete"));
      return null;
    }
    if (filledPairs.length === 0) {
      toast.error(t("kiotviet.toast.syncBranchPairsRequired"));
      return null;
    }
    const seenSources = new Set<string>();
    for (const pair of filledPairs) {
      if (seenSources.has(pair.source)) {
        toast.error(t("kiotviet.toast.syncBranchPairDuplicate").replace("{branch}", pair.source));
        return null;
      }
      seenSources.add(pair.source);
      if (!branchIds.includes(pair.source)) {
        toast.error(
          t("kiotviet.toast.syncBranchPairSourceInvalid").replace("{branch}", pair.source),
        );
        return null;
      }
      if (
        selectedPairedOldChannel &&
        selectedPairedOldChannel.branchIds.length > 0 &&
        !selectedPairedOldChannel.branchIds.includes(pair.target)
      ) {
        toast.error(
          t("kiotviet.toast.syncBranchPairTargetInvalid").replace("{branch}", pair.target),
        );
        return null;
      }
    }
    return filledPairs;
  };

  const buildPayload = (branchIds: string[], pairs: SyncBranchPairDraft[]): KiotVietPayload => ({
    name: form.name.trim(),
    branch_id: branchIds[0],
    branch_ids: branchIds,
    client_id: form.clientId.trim(),
    client_secret: form.clientSecret.trim(),
    retailer: form.retailer.trim(),
    username: form.username.trim(),
    password: form.password.trim(),
    old: form.isOldKiot,
    // Trống = kênh không áp VAT (hộ kinh doanh) → BE không gửi TaxId sang KiotViet.
    vat_tax_id: form.vatTaxIdText.trim() === "" ? null : Number(form.vatTaxIdText.trim()),
    // old_sync_branch_id để "" cho BE tự dẫn xuất fallback từ map (target của kho chính).
    old_sync_branch_id: "",
    old_sync_branch_map: pairs.map((pair) => ({
      source_branch_id: pair.source,
      target_branch_id: pair.target,
    })),
    paired_old_channel_id: form.isOldKiot ? null : form.pairedOldChannelId,
  });

  const submitCreate = async () => {
    const branchIds = toBranchIds(form.branchIdsText);
    if (branchIds.length === 0) {
      toast.error(t("kiotviet.toast.branchRequired"));
      return;
    }
    const pairs = buildSyncBranchPairs(branchIds);
    if (pairs === null) return;
    await onCreate(buildPayload(branchIds, pairs));
    setOpenCreate(false);
    resetForm();
  };

  const submitEdit = async () => {
    if (!editing) return;
    const branchIds = toBranchIds(form.branchIdsText);
    if (branchIds.length === 0) {
      toast.error(t("kiotviet.toast.branchRequired"));
      return;
    }
    const pairs = buildSyncBranchPairs(branchIds);
    if (pairs === null) return;
    await onUpdate(editing.id, buildPayload(branchIds, pairs));
    setOpenEdit(false);
    setEditing(null);
    resetForm();
  };

  const confirmDelete = (id: number) => {
    const row = rows.find((r) => r.id === id) || null;
    setRowToDelete(row);
    setDeleteDialogOpen(true);
  };

  const confirmBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setBulkDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    if (!rowToDelete) return;
    try {
      await onDelete(rowToDelete.id);
      toast.success(t("kiotviet.toast.deleted", "Deleted KiotViet channel."));
    } catch {
      toast.error(t("kiotviet.toast.deleteFailed"));
    } finally {
      setDeleteDialogOpen(false);
      setRowToDelete(null);
    }
  };

  const executeBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await onBulkDelete(selectedIds);
      toast.success(
        t("kiotviet.toast.bulkDeleted", `Deleted ${selectedIds.length} KiotViet channels.`).replace(
          "{count}",
          String(selectedIds.length),
        ),
      );
      setSelectedIds([]);
    } catch {
      toast.error(t("kiotviet.toast.bulkDeleteFailed"));
    } finally {
      setBulkDeleteDialogOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{t("kiotviet.management.title")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("kiotviet.management.total", `Total: ${rows.length}`).replace(
              "{count}",
              String(rows.length),
            )}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("kiotviet.search.placeholder")}
              className="pl-8 pr-8"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label={t("kiotviet.search.clear")}
                title={t("kiotviet.search.clear")}
                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setOpenCreate(true)}
          >
            {t("kiotviet.management.add")}
          </Button>
        </div>
      </div>

      <KiotVietTable
        rows={paginatedRows}
        selectedIds={selectedIds}
        allChecked={allChecked}
        onToggleAll={() =>
          setSelectedIds(
            allChecked
              ? selectedIds.filter((id) => !paginatedRows.some((row) => row.id === id))
              : [...new Set([...selectedIds, ...paginatedRows.map((row) => row.id)])],
          )
        }
        onToggleOne={handleToggleOne}
        onBulkDelete={confirmBulkDelete}
        onEdit={startEdit}
        onDelete={confirmDelete}
        emptyText={
          normalizedSearchTerm ? t("kiotviet.list.emptyFiltered") : t("kiotviet.list.empty")
        }
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {normalizedSearchTerm
            ? t("kiotviet.pagination.summaryFiltered")
                .replace("{{count}}", String(filteredRows.length))
                .replace("{{total}}", String(rows.length))
            : t("kiotviet.pagination.summary").replace("{{count}}", String(rows.length))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {t("kiotviet.pagination.pageSize", "Mỗi trang")}
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <PaginationPages
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <KiotVietDialog
        open={openCreate}
        title={t("kiotviet.dialog.createTitle")}
        description={t("kiotviet.dialog.createDesc")}
        name={form.name}
        branchIdsText={form.branchIdsText}
        syncBranchPairs={form.syncBranchPairs}
        sourceBranchIds={toBranchIds(form.branchIdsText)}
        clientId={form.clientId}
        clientSecret={form.clientSecret}
        retailer={form.retailer}
        username={form.username}
        password={form.password}
        isOldKiot={form.isOldKiot}
        vatTaxIdText={form.vatTaxIdText}
        onOpenChange={setOpenCreate}
        onNameChange={(v) => setForm((p) => ({ ...p, name: v }))}
        onBranchIdsTextChange={(v) => setForm((p) => ({ ...p, branchIdsText: v }))}
        onSyncBranchPairsChange={(v) => setForm((p) => ({ ...p, syncBranchPairs: v }))}
        onClientIdChange={(v) => setForm((p) => ({ ...p, clientId: v }))}
        onClientSecretChange={(v) => setForm((p) => ({ ...p, clientSecret: v }))}
        onRetailerChange={(v) => setForm((p) => ({ ...p, retailer: v }))}
        onUsernameChange={(v) => setForm((p) => ({ ...p, username: v }))}
        onPasswordChange={(v) => setForm((p) => ({ ...p, password: v }))}
        onIsOldKiotChange={(v) => setForm((p) => ({ ...p, isOldKiot: v }))}
        onVatTaxIdTextChange={(v) => setForm((p) => ({ ...p, vatTaxIdText: v }))}
        oldChannelOptions={oldChannelOptions}
        pairedOldChannelId={form.pairedOldChannelId}
        onPairedOldChannelIdChange={(v) => setForm((p) => ({ ...p, pairedOldChannelId: v }))}
        onSubmit={submitCreate}
      />

      <KiotVietDialog
        open={openEdit}
        title={t("kiotviet.dialog.editTitle")}
        description={t("kiotviet.dialog.editDesc")}
        name={form.name}
        branchIdsText={form.branchIdsText}
        syncBranchPairs={form.syncBranchPairs}
        sourceBranchIds={toBranchIds(form.branchIdsText)}
        clientId={form.clientId}
        clientSecret={form.clientSecret}
        retailer={form.retailer}
        username={form.username}
        password={form.password}
        isOldKiot={form.isOldKiot}
        vatTaxIdText={form.vatTaxIdText}
        onOpenChange={setOpenEdit}
        onNameChange={(v) => setForm((p) => ({ ...p, name: v }))}
        onBranchIdsTextChange={(v) => setForm((p) => ({ ...p, branchIdsText: v }))}
        onSyncBranchPairsChange={(v) => setForm((p) => ({ ...p, syncBranchPairs: v }))}
        onClientIdChange={(v) => setForm((p) => ({ ...p, clientId: v }))}
        onClientSecretChange={(v) => setForm((p) => ({ ...p, clientSecret: v }))}
        onRetailerChange={(v) => setForm((p) => ({ ...p, retailer: v }))}
        onUsernameChange={(v) => setForm((p) => ({ ...p, username: v }))}
        onPasswordChange={(v) => setForm((p) => ({ ...p, password: v }))}
        onIsOldKiotChange={(v) => setForm((p) => ({ ...p, isOldKiot: v }))}
        onVatTaxIdTextChange={(v) => setForm((p) => ({ ...p, vatTaxIdText: v }))}
        oldChannelOptions={oldChannelOptions}
        pairedOldChannelId={form.pairedOldChannelId}
        onPairedOldChannelIdChange={(v) => setForm((p) => ({ ...p, pairedOldChannelId: v }))}
        onSubmit={submitEdit}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("kiotviet.dialog.deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("kiotviet.dialog.deleteConfirmDesc")}
              {rowToDelete && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <p className="font-medium">{rowToDelete.name}</p>
                  <p className="text-sm text-muted-foreground">ID: {rowToDelete.id}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={executeDelete}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("kiotviet.dialog.bulkDeleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t(
                "kiotviet.dialog.bulkDeleteConfirmDesc",
                `Are you sure you want to delete ${selectedIds.length} selected KiotViet channels? This action cannot be undone.`,
              ).replace("{count}", String(selectedIds.length))}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={executeBulkDelete}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
