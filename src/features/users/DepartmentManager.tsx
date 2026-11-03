import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormDialogShell, FormGrid } from "@/components/ui/form-dialog-content";
import { Input } from "@/components/ui/input";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import { useI18n } from "@/i18n";
import type { Department } from "@/features/users/types";
import { DepartmentHeadField } from "@/features/hr/components/DepartmentHeadField";
import { DepartmentTeamsManager } from "@/features/users/components/DepartmentTeamsManager";
import { useDepartmentOrg } from "@/features/hr/queries";

export type DepartmentChannelOption = { id: number; code: string; name: string };

type Props = {
  departments: Department[];
  channels: DepartmentChannelOption[];
  onCreate: (payload: {
    name: string;
    is_active: boolean;
    channel_ids?: number[];
  }) => Promise<void>;
  onUpdate: (
    id: number,
    payload: {
      name?: string;
      is_active?: boolean;
      channel_ids?: number[];
    },
  ) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

export function DepartmentManager({ departments, channels, onCreate, onUpdate, onDelete }: Props) {
  const { t } = useI18n();
  const { data: org } = useDepartmentOrg();
  const orgFor = (id: number) => org?.find((o) => o.department_id === id);
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState<Department | null>(null);

  const [createName, setCreateName] = useState("");
  const [createChannelIds, setCreateChannelIds] = useState<number[]>([]);

  const [editName, setEditName] = useState("");
  const [editChannelIds, setEditChannelIds] = useState<number[]>([]);

  const channelOptions = useMemo<MultiSelectOption[]>(
    () => channels.map((c) => ({ value: String(c.id), label: c.name })),
    [channels],
  );
  // Chỉ giữ id có trong danh mục kênh (như trước) — id lạ không hiện và bị bỏ khi đổi.
  const channelValueFor = (ids: number[]) =>
    channelOptions.filter((opt) => ids.includes(Number(opt.value))).map((opt) => opt.value);

  const handleCreate = async () => {
    if (!createName.trim()) {
      toast.error(t("departments.toast.nameRequired", "Vui lòng nhập tên phòng ban."));
      return;
    }
    try {
      await onCreate({
        name: createName.trim(),
        is_active: true,
        channel_ids: createChannelIds,
      });
      toast.success(t("departments.toast.created", "Tạo phòng ban thành công."));
      setOpenCreate(false);
      setCreateName("");
      setCreateChannelIds([]);
    } catch {
      toast.error(t("departments.toast.createFailed", "Tạo phòng ban thất bại."));
    }
  };

  const startEdit = (dept: Department) => {
    setEditingDept(dept);
    setEditName(dept.name);
    setEditChannelIds([...(dept.channel_ids || [])]);
    setOpenEdit(true);
  };

  const handleEdit = async () => {
    if (!editingDept || !editName.trim()) return;
    try {
      await onUpdate(editingDept.id, {
        name: editName.trim(),
        channel_ids: editChannelIds,
      });
      toast.success(t("departments.toast.updated", "Cập nhật phòng ban thành công."));
      setOpenEdit(false);
      setEditingDept(null);
    } catch {
      toast.error(t("departments.toast.updateFailed", "Cập nhật phòng ban thất bại."));
    }
  };

  const handleDelete = async () => {
    if (!deptToDelete) return;
    try {
      await onDelete(deptToDelete.id);
      toast.success(t("departments.toast.deleted", "Xóa phòng ban thành công."));
    } catch {
      toast.error(t("departments.toast.deleteFailed", "Xóa phòng ban thất bại."));
    } finally {
      setDeleteDialogOpen(false);
      setDeptToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {t("departments.title", "Phòng ban")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("departments.summary", `Tổng: ${departments.length} phòng ban`).replace(
              "{total}",
              String(departments.length),
            )}
          </p>
        </div>
        <Button
          className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setOpenCreate(true)}
        >
          <Plus className="mr-1 h-4 w-4" />
          {t("departments.create", "Tạo phòng ban")}
        </Button>
      </div>

      {departments.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {t("departments.empty", "Chưa có phòng ban nào.")}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <div key={dept.id} className="rounded-lg border border-border bg-card p-4 shadow-xs">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">{dept.name}</p>
                  <Badge
                    className={
                      dept.is_active
                        ? "mt-1 border-0 bg-primary/15 text-primary"
                        : "mt-1 border-0 bg-muted text-muted-foreground"
                    }
                  >
                    {dept.is_active
                      ? t("common.active", "Active")
                      : t("common.inactive", "Inactive")}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon-sm"
                    variant="outline"
                    onClick={() => startEdit(dept)}
                    title={t("common.edit", "Edit")}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    className="border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
                    onClick={() => {
                      setDeptToDelete(dept);
                      setDeleteDialogOpen(true);
                    }}
                    title={t("common.delete", "Delete")}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                {t("departments.head.label", "Trưởng phòng")}:{" "}
                <span className="font-medium text-foreground">
                  {orgFor(dept.id)?.head?.full_name ?? t("departments.head.none", "— Chưa gán —")}
                </span>
                {" · "}
                {/* Nguồn là `team_count` của chính phòng ban. Trước đây đọc từ
                    `department-org` của `hr` nên luôn hiện 0 dù đã tạo nhóm. */}
                <span className="font-medium text-foreground">
                  {t("departments.team.count", "{n} đội nhóm").replace(
                    "{n}",
                    String(dept.team_count ?? 0),
                  )}
                </span>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <FormDialogShell
          title={t("departments.createTitle", "Tạo phòng ban mới")}
          description={t("departments.createDesc", "Nhập tên và chọn kênh bán hàng cho phòng ban.")}
          footer={
            <>
              <Button variant="outline" onClick={() => setOpenCreate(false)}>
                {t("common.cancel", "Huỷ")}
              </Button>
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleCreate}
              >
                {t("common.create", "Tạo")}
              </Button>
            </>
          }
        >
          <FormGrid columns={2}>
            <div className="col-span-full">
              <label className="mb-1 block text-sm text-muted-foreground">
                {t("departments.fields.name", "Tên phòng ban")}
              </label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="VD: Bán hàng, Kế toán..."
              />
            </div>
            <div className="col-span-full">
              <label
                htmlFor="department-create-channels"
                className="mb-1 block text-sm text-muted-foreground"
              >
                {t("departments.fields.channels", "Kênh bán hàng")}
              </label>
              <MultiSelect
                id="department-create-channels"
                placeholder={t("departments.placeholders.channels", "Chọn kênh bán hàng")}
                options={channelOptions}
                selected={channelValueFor(createChannelIds)}
                onChange={(values) => setCreateChannelIds(values.map(Number))}
                emptyText={t("departments.placeholders.channelsEmpty", "Chưa có kênh nào")}
                menuPortal
              />
            </div>
          </FormGrid>
        </FormDialogShell>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <FormDialogShell
          title={t("departments.editTitle", "Sửa phòng ban")}
          description={t("departments.editDesc", "Chỉnh sửa tên, kênh, trưởng phòng và team.")}
          footer={
            <>
              <Button variant="outline" onClick={() => setOpenEdit(false)}>
                {t("common.cancel", "Huỷ")}
              </Button>
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleEdit}
              >
                {t("common.save", "Lưu")}
              </Button>
            </>
          }
        >
          <FormGrid columns={2}>
            <div className="col-span-full">
              <label className="mb-1 block text-sm text-muted-foreground">
                {t("departments.fields.name", "Tên phòng ban")}
              </label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="col-span-full">
              <label
                htmlFor="department-edit-channels"
                className="mb-1 block text-sm text-muted-foreground"
              >
                {t("departments.fields.channels", "Kênh bán hàng")}
              </label>
              <MultiSelect
                id="department-edit-channels"
                placeholder={t("departments.placeholders.channels", "Chọn kênh bán hàng")}
                options={channelOptions}
                selected={channelValueFor(editChannelIds)}
                onChange={(values) => setEditChannelIds(values.map(Number))}
                emptyText={t("departments.placeholders.channelsEmpty", "Chưa có kênh nào")}
                menuPortal
              />
            </div>
            {editingDept && (
              <div className="col-span-full space-y-4 border-t border-border pt-4">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">
                    {t("departments.head.label", "Trưởng phòng")}
                  </label>
                  <DepartmentHeadField departmentId={editingDept.id} />
                </div>
                <DepartmentTeamsManager departmentId={editingDept.id} />
              </div>
            )}
          </FormGrid>
        </FormDialogShell>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("departments.deleteTitle", "Xóa phòng ban")}</DialogTitle>
            <DialogDescription>
              {t("departments.deleteDesc", "Bạn có chắc muốn xóa phòng ban này?")}
              {deptToDelete && <span className="mt-1 block font-medium">{deptToDelete.name}</span>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t("common.cancel", "Huỷ")}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t("common.delete", "Xóa")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
