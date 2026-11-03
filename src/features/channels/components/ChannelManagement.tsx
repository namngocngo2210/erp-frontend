import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChannelCreateDialog } from "@/features/channels/ChannelCreateDialog";
import { ChannelManageDialog } from "@/features/channels/ChannelManageDialog";
import { ChannelsTable } from "@/features/channels/ChannelsTable";
import { ChannelTypesDialog } from "@/features/channels/ChannelTypesDialog";
import { PAGE_SIZE_OPTIONS_COMPACT } from "@/lib/constants/pagination";
import { DEPARTMENT_ID } from "@/lib/constants/departments";
import { useI18n } from "@/i18n";
import { useRangeSelect } from "@/hooks/use-range-select";
import { listAllFacebookAdAccounts } from "@/lib/api/facebook_ads";
import { listAllGoogleAdsAccounts } from "@/lib/api/google_ads";
import { listChannelTypes, type ChannelType } from "@/lib/api/channels";
import { getPriceBooks, type PriceBook } from "@/lib/api/price-books";
import type {
  ChannelKiotvietMapping,
  ChannelRow,
  FbAdAccountOption,
  GoogleAdAccountOption,
  StaffUser,
} from "@/features/channels/types";
import { parseLandingSources, validateLandingSources } from "@/features/channels/utils";
import { matchesSearchTerm } from "@/lib/text-search";
import { swallowError } from "@/lib/errors";

export type { ChannelRow, StaffUser };

type ChannelMutationPayload = {
  code?: string;
  name?: string;
  owner?: string;
  landingpage_source?: string[];
  fb_ads_accounts?: number[];
  google_ads_accounts?: number[];
  kiotviet_mappings?: ChannelKiotvietMapping[];
  is_active?: boolean;
  // null = gỡ gán, đơn tạo từ kênh này rơi về bảng giá mặc định.
  price_book_id?: number | null;
  // null = bỏ phân loại kênh.
  channel_type_id?: number | null;
};

type Props = {
  channels: ChannelRow[];
  canManage: boolean;
  staffUsers: StaffUser[];
  onCreate: (payload: {
    code: string;
    name: string;
    owner: string;
    landingpage_source: string[];
    fb_ads_accounts: number[];
    google_ads_accounts: number[];
    kiotviet_mappings: ChannelKiotvietMapping[];
    is_active: boolean;
    channel_type_id: number | null;
  }) => Promise<void>;
  onUpdate: (id: number, payload: ChannelMutationPayload, silent?: boolean) => Promise<void>;
  onBulkDelete: (ids: number[]) => Promise<void>;
  onLoadAssignments: (channelId: number) => Promise<StaffUser[]>;
  onAddAssignment: (channelId: number, userId: number, silent?: boolean) => Promise<StaffUser[]>;
  onRemoveAssignment: (channelId: number, userId: number) => Promise<StaffUser[]>;
  kiotvietChannels: { id: number; name: string }[];
};

export function ChannelManagement({
  channels,
  canManage,
  staffUsers,
  onCreate,
  onUpdate,
  onBulkDelete,
  onLoadAssignments,
  onAddAssignment,
  onRemoveAssignment,
  kiotvietChannels,
}: Props) {
  const { t } = useI18n();
  const [openCreate, setOpenCreate] = useState(false);
  const [openManage, setOpenManage] = useState(false);
  const [manageRow, setManageRow] = useState<ChannelRow | null>(null);
  const [savingInfo, setSavingInfo] = useState(false);
  const [assignedUsers, setAssignedUsers] = useState<StaffUser[]>([]);
  const [selectedAssignmentUserId, setSelectedAssignmentUserId] = useState<number | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [createForm, setCreateForm] = useState({
    code: "",
    name: "",
    owner: "",
    landingpageSource: "",
    status: "true",
    kiotvietMappings: [] as ChannelKiotvietMapping[],
    fbAdsAccounts: [] as number[],
    googleAdsAccounts: [] as number[],
    channelTypeId: null as number | null,
  });
  const [editForm, setEditForm] = useState({
    name: "",
    owner: "",
    landingpageSource: "",
    status: "true",
    kiotvietMappings: [] as ChannelKiotvietMapping[],
    fbAdsAccounts: [] as number[],
    googleAdsAccounts: [] as number[],
    priceBookId: null as number | null,
    channelTypeId: null as number | null,
  });
  const [availableFbAdsAccounts, setAvailableFbAdsAccounts] = useState<FbAdAccountOption[]>([]);
  const [availableGoogleAdsAccounts, setAvailableGoogleAdsAccounts] = useState<
    GoogleAdAccountOption[]
  >([]);
  const [priceBooks, setPriceBooks] = useState<PriceBook[]>([]);
  const [channelTypes, setChannelTypes] = useState<ChannelType[]>([]);
  const [openChannelTypes, setOpenChannelTypes] = useState(false);
  const [selectedChannelIds, setSelectedChannelIds] = useState<number[]>([]);
  const [togglingChannelIds, setTogglingChannelIds] = useState<number[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");

  const normalizedSearchTerm = searchTerm.trim();
  // Danh sách kênh đã nằm sẵn ở client (không phân trang server) nên lọc tại chỗ.
  const filteredChannels = useMemo(() => {
    if (!normalizedSearchTerm) return channels;
    return channels.filter((row) =>
      matchesSearchTerm(normalizedSearchTerm, [
        row.code,
        row.name,
        row.owner,
        ...(row.landingpage_source ?? []),
        ...(row.assigned_users ?? []),
        row.channel_type?.name,
        ...(row.kiotviet_mappings ?? []).flatMap((mapping) => [
          mapping.kiotviet_channel_name,
          mapping.external_sale_channel_id,
        ]),
      ]),
    );
  }, [channels, normalizedSearchTerm]);

  const totalActive = useMemo(() => channels.filter((x) => x.is_active).length, [channels]);
  const adsStaffUsers = useMemo(
    () => staffUsers.filter((user) => user.department_id === DEPARTMENT_ID.ADS),
    [staffUsers],
  );
  const assignableStaff = useMemo(
    () =>
      adsStaffUsers.filter((user) => !assignedUsers.some((assigned) => assigned.id === user.id)),
    [adsStaffUsers, assignedUsers],
  );
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredChannels.length / pageSize)),
    [filteredChannels.length, pageSize],
  );
  const paginatedChannels = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredChannels.slice(start, start + pageSize);
  }, [filteredChannels, currentPage, pageSize]);
  const handleToggleOneChannel = useRangeSelect(
    paginatedChannels,
    selectedChannelIds,
    setSelectedChannelIds,
  );

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
    if (!canManage) return;
    let cancelled = false;
    void (async () => {
      try {
        const accounts = await listAllFacebookAdAccounts();
        if (cancelled) return;
        setAvailableFbAdsAccounts(
          accounts.map((acc) => ({ id: acc.id, name: acc.name, account_id: acc.account_id })),
        );
      } catch (err) {
        // Silent fail — multi-select just shows "no options" until the user retries.
        swallowError(err, "channels.fbAdsAccounts");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canManage]);

  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    void (async () => {
      try {
        const accounts = await listAllGoogleAdsAccounts();
        if (cancelled) return;
        setAvailableGoogleAdsAccounts(
          accounts.map((acc) => ({ id: acc.id, name: acc.name, customer_id: acc.customer_id })),
        );
      } catch (err) {
        // Silent fail — multi-select just shows "no options" until the user retries.
        swallowError(err, "channels.googleAdsAccounts");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canManage]);

  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    void (async () => {
      try {
        const books = await getPriceBooks();
        if (cancelled) return;
        setPriceBooks(books);
      } catch (err) {
        // Silent fail — select just shows only "(Theo mặc định)" until the user retries.
        swallowError(err, "channels.priceBooks");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canManage]);

  const reloadChannelTypes = useCallback(async () => {
    try {
      setChannelTypes(await listChannelTypes());
    } catch (err) {
      // Silent fail — select chỉ còn "(Chưa phân loại)" cho tới khi user thử lại.
      swallowError(err, "channels.channelTypes");
    }
  }, []);

  useEffect(() => {
    if (!canManage) return;
    void reloadChannelTypes();
  }, [canManage, reloadChannelTypes]);

  const submitCreate = async () => {
    if (!createForm.code.trim() || !createForm.name.trim()) {
      toast.error(t("channels.toast.required"));
      return;
    }

    const createSources = parseLandingSources(createForm.landingpageSource);
    const invalidSources = validateLandingSources(createSources);
    if (invalidSources.length > 0) {
      toast.error(
        t("channels.toast.invalidLinks", `Invalid links: ${invalidSources.join(", ")}`).replace(
          "{links}",
          invalidSources.join(", "),
        ),
      );
      return;
    }

    const mappings = createForm.kiotvietMappings
      .map((m) => ({ ...m, external_sale_channel_id: m.external_sale_channel_id.trim() }))
      .filter((m) => m.external_sale_channel_id);

    await onCreate({
      code: createForm.code.trim(),
      name: createForm.name.trim(),
      owner: createForm.owner.trim(),
      landingpage_source: createSources,
      fb_ads_accounts: createForm.fbAdsAccounts,
      google_ads_accounts: createForm.googleAdsAccounts,
      is_active: createForm.status === "true",
      kiotviet_mappings: mappings,
      channel_type_id: createForm.channelTypeId,
    });

    setOpenCreate(false);
    setCreateForm({
      code: "",
      name: "",
      owner: "",
      landingpageSource: "",
      status: "true",
      kiotvietMappings: [],
      fbAdsAccounts: [],
      googleAdsAccounts: [],
      channelTypeId: null,
    });
  };

  const confirmBulkDeleteChannels = () => {
    if (selectedChannelIds.length === 0) return;
    setBulkDeleteDialogOpen(true);
  };

  const executeBulkDeleteChannels = async () => {
    if (selectedChannelIds.length === 0) return;
    try {
      await onBulkDelete(selectedChannelIds);
      toast.success(
        t(
          "channels.toast.bulkDeleted",
          `Deleted ${selectedChannelIds.length} selected channels.`,
        ).replace("{count}", String(selectedChannelIds.length)),
      );
      setSelectedChannelIds([]);
    } catch {
      toast.error(t("channels.toast.bulkDeleteFailed"));
    } finally {
      setBulkDeleteDialogOpen(false);
    }
  };

  const openManageDialog = async (row: ChannelRow) => {
    setManageRow(row);
    setEditForm({
      name: row.name,
      owner: row.owner ?? "",
      landingpageSource: (row.landingpage_source ?? []).join("\n"),
      status: row.is_active ? "true" : "false",
      kiotvietMappings: (row.kiotviet_mappings ?? []).map((m) => ({ ...m })),
      fbAdsAccounts: row.fb_ads_accounts ?? [],
      googleAdsAccounts: row.google_ads_accounts ?? [],
      priceBookId: row.price_book?.id ?? null,
      channelTypeId: row.channel_type?.id ?? null,
    });

    const list = await onLoadAssignments(row.id);
    setAssignedUsers(list);
    setSelectedAssignmentUserId(null);
    setOpenManage(true);
  };

  const saveChannelInfo = async () => {
    if (!manageRow) return;

    const editSources = parseLandingSources(editForm.landingpageSource);
    const originalSources = manageRow.landingpage_source ?? [];
    const addedSources = editSources.filter((src) => !originalSources.includes(src));
    const invalidSources = validateLandingSources(addedSources);
    if (invalidSources.length > 0) {
      toast.error(
        t("channels.toast.invalidLinks", `Invalid links: ${invalidSources.join(", ")}`).replace(
          "{links}",
          invalidSources.join(", "),
        ),
      );
      return;
    }

    const mappings = editForm.kiotvietMappings
      .map((m) => ({ ...m, external_sale_channel_id: m.external_sale_channel_id.trim() }))
      .filter((m) => m.external_sale_channel_id);

    const selectedPriceBook = priceBooks.find((book) => book.id === editForm.priceBookId) ?? null;
    // Ưu tiên danh mục vừa tải; loại kênh đã bị tắt không nằm trong đó nên fallback
    // về giá trị đang gán trên dòng để optimistic update không xoá trắng ô.
    const selectedChannelType =
      channelTypes.find((type) => type.id === editForm.channelTypeId) ??
      (manageRow.channel_type?.id === editForm.channelTypeId ? manageRow.channel_type : null);

    setSavingInfo(true);
    try {
      await onUpdate(manageRow.id, {
        name: editForm.name.trim(),
        owner: editForm.owner.trim(),
        landingpage_source: editSources,
        fb_ads_accounts: editForm.fbAdsAccounts,
        google_ads_accounts: editForm.googleAdsAccounts,
        is_active: editForm.status === "true",
        kiotviet_mappings: mappings,
        price_book_id: editForm.priceBookId,
        channel_type_id: editForm.channelTypeId,
      });
      setManageRow((prev) =>
        prev
          ? {
              ...prev,
              name: editForm.name.trim(),
              owner: editForm.owner.trim(),
              landingpage_source: editSources,
              fb_ads_accounts: editForm.fbAdsAccounts,
              google_ads_accounts: editForm.googleAdsAccounts,
              is_active: editForm.status === "true",
              kiotviet_mappings: mappings,
              price_book: selectedPriceBook
                ? {
                    id: selectedPriceBook.id,
                    code: selectedPriceBook.code,
                    name: selectedPriceBook.name,
                  }
                : null,
              channel_type: selectedChannelType
                ? {
                    id: selectedChannelType.id,
                    code: selectedChannelType.code,
                    name: selectedChannelType.name,
                  }
                : null,
            }
          : prev,
      );
    } finally {
      setSavingInfo(false);
    }
  };

  const addAssignments = async () => {
    if (!manageRow) return;
    if (!selectedAssignmentUserId) {
      toast.error(t("channels.toast.assignmentUsernameRequired"));
      return;
    }

    const target = assignableStaff.find((staff) => staff.id === selectedAssignmentUserId);
    if (!target) {
      toast.error(t("channels.toast.assignmentNotFound"));
      return;
    }

    setIsAssigning(true);
    try {
      await onAddAssignment(manageRow.id, target.id, true);
      const updated = await onLoadAssignments(manageRow.id);
      setAssignedUsers(updated);
      toast.success(
        t("channels.toast.assignmentAdded", `Added ${target.username} to channel.`).replace(
          "{username}",
          target.username,
        ),
      );
      setSelectedAssignmentUserId(null);
    } catch {
      toast.error(t("channels.toast.assignmentAddFailed"));
    } finally {
      setIsAssigning(false);
    }
  };

  const removeAssignment = async (userId: number) => {
    if (!manageRow) return;
    const updated = await onRemoveAssignment(manageRow.id, userId);
    setAssignedUsers(updated);
  };

  const toggleChannelStatus = async (row: ChannelRow, checked: boolean) => {
    if (row.is_active === checked) return;

    setTogglingChannelIds((prev) => [...prev, row.id]);
    try {
      await onUpdate(row.id, { is_active: checked }, true);
      toast.success(t("channels.toast.updated", "Channel updated"));
    } catch {
      toast.error(t("channels.toast.updateFailed", "Failed to update channel"));
    } finally {
      setTogglingChannelIds((prev) => prev.filter((id) => id !== row.id));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{t("channels.management.title")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("channels.management.summary", `Total: ${channels.length} | Active: ${totalActive}`)
              .replace("{total}", String(channels.length))
              .replace("{active}", String(totalActive))}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("channels.search.placeholder")}
              className="pl-8 pr-8"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label={t("channels.search.clear")}
                title={t("channels.search.clear")}
                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {canManage && (
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setOpenChannelTypes(true)}
            >
              {t("channels.types.open", "Loại kênh")}
            </Button>
          )}
          {canManage && (
            <Button
              className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => setOpenCreate(true)}
            >
              {t("channels.management.create")}
            </Button>
          )}
        </div>
      </div>

      <ChannelsTable
        channels={paginatedChannels}
        canManage={canManage}
        selectedIds={selectedChannelIds}
        onClearSelection={() => setSelectedChannelIds([])}
        onToggleAll={() =>
          setSelectedChannelIds(
            paginatedChannels.length > 0 &&
              paginatedChannels.every((row) => selectedChannelIds.includes(row.id))
              ? selectedChannelIds.filter((id) => !paginatedChannels.some((row) => row.id === id))
              : [...new Set([...selectedChannelIds, ...paginatedChannels.map((row) => row.id)])],
          )
        }
        onToggleOne={handleToggleOneChannel}
        onBulkDelete={confirmBulkDeleteChannels}
        onManage={openManageDialog}
        togglingIds={togglingChannelIds}
        onToggleStatus={toggleChannelStatus}
        emptyText={
          normalizedSearchTerm ? t("channels.list.emptyFiltered") : t("channels.list.empty")
        }
      />
      <TablePagination
        className="mt-2 gap-3"
        total={filteredChannels.length}
        page={currentPage}
        pageSize={pageSize}
        totalPages={totalPages}
        pageSizeOptions={PAGE_SIZE_OPTIONS_COMPACT}
        pageSizeLabel={t("channels.pagination.pageSize", "Mỗi trang")}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        onPageChange={setCurrentPage}
        summary={
          <div className="text-sm text-muted-foreground">
            {normalizedSearchTerm
              ? t("channels.pagination.summaryFiltered")
                  .replace("{{count}}", String(filteredChannels.length))
                  .replace("{{total}}", String(channels.length))
              : t("channels.pagination.summary").replace("{{count}}", String(channels.length))}
          </div>
        }
      />

      <ChannelCreateDialog
        open={openCreate}
        code={createForm.code}
        name={createForm.name}
        owner={createForm.owner}
        landingpageSource={createForm.landingpageSource}
        status={createForm.status}
        channelTypeId={createForm.channelTypeId}
        channelTypes={channelTypes}
        kiotvietMappings={createForm.kiotvietMappings}
        fbAdsAccounts={createForm.fbAdsAccounts}
        availableFbAdsAccounts={availableFbAdsAccounts}
        googleAdsAccounts={createForm.googleAdsAccounts}
        availableGoogleAdsAccounts={availableGoogleAdsAccounts}
        kiotvietChannels={kiotvietChannels}
        onOpenChange={setOpenCreate}
        onCodeChange={(v) => setCreateForm((p) => ({ ...p, code: v }))}
        onNameChange={(v) => setCreateForm((p) => ({ ...p, name: v }))}
        onOwnerChange={(v) => setCreateForm((p) => ({ ...p, owner: v }))}
        onLandingpageSourceChange={(v) => setCreateForm((p) => ({ ...p, landingpageSource: v }))}
        onStatusChange={(v) => setCreateForm((p) => ({ ...p, status: v }))}
        onChannelTypeIdChange={(v) => setCreateForm((p) => ({ ...p, channelTypeId: v }))}
        onKiotvietMappingsChange={(v) => setCreateForm((p) => ({ ...p, kiotvietMappings: v }))}
        onFbAdsAccountsChange={(v) => setCreateForm((p) => ({ ...p, fbAdsAccounts: v }))}
        onGoogleAdsAccountsChange={(v) => setCreateForm((p) => ({ ...p, googleAdsAccounts: v }))}
        onSubmit={submitCreate}
      />

      <ChannelManageDialog
        open={openManage}
        manageRow={manageRow}
        editName={editForm.name}
        editOwner={editForm.owner}
        editLandingpageSource={editForm.landingpageSource}
        editStatus={editForm.status}
        editKiotvietMappings={editForm.kiotvietMappings}
        editFbAdsAccounts={editForm.fbAdsAccounts}
        editGoogleAdsAccounts={editForm.googleAdsAccounts}
        editPriceBookId={editForm.priceBookId}
        editChannelTypeId={editForm.channelTypeId}
        savingInfo={savingInfo}
        assignedUsers={assignedUsers}
        assignableStaff={assignableStaff}
        selectedAssignmentUserId={selectedAssignmentUserId}
        isAssigning={isAssigning}
        availableFbAdsAccounts={availableFbAdsAccounts}
        availableGoogleAdsAccounts={availableGoogleAdsAccounts}
        priceBooks={priceBooks}
        channelTypes={channelTypes}
        kiotvietChannels={kiotvietChannels}
        onOpenChange={setOpenManage}
        onEditNameChange={(v) => setEditForm((p) => ({ ...p, name: v }))}
        onEditOwnerChange={(v) => setEditForm((p) => ({ ...p, owner: v }))}
        onEditLandingpageSourceChange={(v) => setEditForm((p) => ({ ...p, landingpageSource: v }))}
        onEditStatusChange={(v) => setEditForm((p) => ({ ...p, status: v }))}
        onEditKiotvietMappingsChange={(v) => setEditForm((p) => ({ ...p, kiotvietMappings: v }))}
        onEditFbAdsAccountsChange={(v) => setEditForm((p) => ({ ...p, fbAdsAccounts: v }))}
        onEditGoogleAdsAccountsChange={(v) => setEditForm((p) => ({ ...p, googleAdsAccounts: v }))}
        onEditPriceBookIdChange={(v) => setEditForm((p) => ({ ...p, priceBookId: v }))}
        onEditChannelTypeIdChange={(v) => setEditForm((p) => ({ ...p, channelTypeId: v }))}
        onSaveInfo={saveChannelInfo}
        onSelectedAssignmentUserIdChange={setSelectedAssignmentUserId}
        onAddAssignments={addAssignments}
        onRemoveAssignment={removeAssignment}
      />

      <ChannelTypesDialog
        open={openChannelTypes}
        onOpenChange={setOpenChannelTypes}
        onChanged={() => void reloadChannelTypes()}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("channels.dialog.bulkDeleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t(
                "channels.dialog.bulkDeleteConfirmDesc",
                `Are you sure you want to delete ${selectedChannelIds.length} selected channels? This action cannot be undone.`,
              ).replace("{count}", String(selectedChannelIds.length))}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={executeBulkDeleteChannels}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
