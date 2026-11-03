import { useEffect, useState } from "react";
import { Edit, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaginationPages } from "@/components/ui/pagination";
import { DataTableShell } from "@/components/ui/data-table-shell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ResponsiveList } from "@/components/ui/responsive-list";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/useDebounce";
import { useI18n } from "@/i18n";
import { type Warehouse } from "@/lib/api/warehouses";
import {
  useCreateWarehouse,
  useDeleteWarehouse,
  useUpdateWarehouse,
  useWarehousesList,
} from "@/features/warehouses/queries";

const PAGE_SIZE = 50;

type WarehouseForm = { code: string; name: string; is_active: boolean };
type StatusFilter = "all" | "active" | "inactive";

const EMPTY_FORM: WarehouseForm = { code: "", name: "", is_active: true };

function WarehousesPage() {
  const { t } = useI18n();

  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  // Debounce từ khoá 350ms (giữ nhịp cũ); giá trị khởi tạo áp ngay nên lần
  // tải đầu không bị trễ.
  const debouncedSearch = useDebouncedValue(search, 350);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [form, setForm] = useState<WarehouseForm>(EMPTY_FORM);
  const [deleting, setDeleting] = useState<Warehouse | null>(null);

  const listQuery = useWarehousesList({
    search: debouncedSearch,
    isActive: statusFilter === "all" ? undefined : statusFilter === "active",
    limit: PAGE_SIZE,
    offset,
  });
  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const loading = listQuery.isFetching;

  const createMutation = useCreateWarehouse();
  const updateMutation = useUpdateWarehouse();
  const deleteMutation = useDeleteWarehouse();
  const saving = createMutation.isPending || updateMutation.isPending;

  // Đổi bộ lọc → quay về trang đầu.
  useEffect(() => {
    setOffset(0);
  }, [debouncedSearch, statusFilter]);

  // Fix 2: nếu trang hiện tại rỗng nhưng vẫn còn bản ghi thì lùi 1 trang
  // (vd sau khi xoá hết bản ghi của trang cuối).
  useEffect(() => {
    const data = listQuery.data;
    if (data && data.items.length === 0 && data.total > 0 && offset > 0) {
      setOffset((prev) => Math.max(0, prev - PAGE_SIZE));
    }
  }, [listQuery.data, offset]);

  // Toast mỗi lần tải danh sách thất bại.
  useEffect(() => {
    if (!listQuery.isError) return;
    toast.error(t("warehouses.toast.fetchFailed", "Không tải được danh sách kho."));
  }, [listQuery.isError, listQuery.errorUpdatedAt, t]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (warehouse: Warehouse) => {
    setEditing(warehouse);
    setForm({ code: warehouse.code, name: warehouse.name, is_active: warehouse.is_active });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const code = form.code.trim();
    const name = form.name.trim();
    if (!code || !name) {
      toast.error(t("warehouses.toast.validationError", "Vui lòng nhập mã kho và tên kho."));
      return;
    }
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          data: { code, name, is_active: form.is_active },
        });
        toast.success(t("warehouses.toast.updated", "Đã cập nhật kho."));
      } else {
        await createMutation.mutateAsync({ code, name, is_active: form.is_active });
        toast.success(t("warehouses.toast.created", "Đã tạo kho mới."));
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("warehouses.toast.saveFailed", "Lưu kho thất bại."),
      );
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success(t("warehouses.toast.deleted", "Đã xóa kho."));
      setDeleting(null);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("warehouses.toast.deleteFailed", "Xóa kho thất bại."),
      );
    }
  };

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const toolbar = (
    <div className="w-full flex flex-wrap items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="relative flex-1 md:max-w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("warehouses.search.placeholder", "Tìm theo tên hoặc mã kho...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-45">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("warehouses.filter.all", "Tất cả trạng thái")}</SelectItem>
            <SelectItem value="active">{t("warehouses.filter.active", "Hoạt động")}</SelectItem>
            <SelectItem value="inactive">
              {t("warehouses.filter.inactive", "Ngừng hoạt động")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        className="ml-auto bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={openCreate}
      >
        <Plus className="mr-2 h-4 w-4" />
        {t("warehouses.actions.create", "Thêm kho")}
      </Button>
    </div>
  );

  return (
    <>
      <DataTableShell loading={loading && items.length === 0} toolbar={toolbar}>
        <ResponsiveList
          items={items}
          getKey={(warehouse: Warehouse) => warehouse.id}
          loading={loading}
          loadingText={t("common.loading", "Đang tải...")}
          emptyText={t("warehouses.list.empty", "Chưa có kho nào.")}
          table={
            <Table className="min-w-[640px] [&_td]:px-3 [&_th]:px-3">
              <TableHeader>
                <TableRow>
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("warehouses.columns.code", "Mã kho")}
                  </TableHead>
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("warehouses.columns.name", "Tên kho")}
                  </TableHead>
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("warehouses.columns.status", "Trạng thái")}
                  </TableHead>
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("common.actions", "Hành động")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Lần tải đầu: DataTableShell hiện skeleton, bảng không render. */}
                {!loading && items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {t("warehouses.list.empty", "Chưa có kho nào.")}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((warehouse) => (
                    <TableRow key={warehouse.id}>
                      <TableCell className="font-medium text-foreground">
                        {warehouse.code}
                      </TableCell>
                      <TableCell className="font-medium">{warehouse.name}</TableCell>
                      <TableCell>
                        {warehouse.is_active ? (
                          <Badge variant="default">
                            {t("warehouses.status.active", "Hoạt động")}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            {t("warehouses.status.inactive", "Ngừng hoạt động")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          title={t("common.edit", "Sửa")}
                          aria-label={t("common.edit", "Sửa")}
                          size="icon-sm"
                          variant="outline"
                          className="border-border bg-background text-primary hover:bg-accent hover:text-accent-foreground"
                          onClick={() => openEdit(warehouse)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          title={t("common.delete", "Xóa")}
                          aria-label={t("common.delete", "Xóa")}
                          size="icon-sm"
                          variant="outline"
                          className="border-border bg-background text-destructive hover:bg-accent hover:text-destructive-foreground ml-1"
                          onClick={() => setDeleting(warehouse)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          }
          renderCard={(warehouse: Warehouse) => (
            <div className="rounded-lg border border-border/70 bg-card p-3 shadow-xs">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{warehouse.code}</p>
                  <p className="font-medium text-foreground">{warehouse.name}</p>
                </div>
                {warehouse.is_active ? (
                  <Badge variant="default">{t("warehouses.status.active", "Hoạt động")}</Badge>
                ) : (
                  <Badge variant="secondary">
                    {t("warehouses.status.inactive", "Ngừng hoạt động")}
                  </Badge>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-border bg-background text-primary hover:bg-accent hover:text-accent-foreground"
                  onClick={() => openEdit(warehouse)}
                >
                  <Edit className="mr-2 w-4 h-4" /> {t("common.edit", "Sửa")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-border bg-background text-destructive hover:bg-accent hover:text-destructive-foreground"
                  onClick={() => setDeleting(warehouse)}
                >
                  <Trash2 className="mr-2 w-4 h-4" /> {t("common.delete", "Xóa")}
                </Button>
              </div>
            </div>
          )}
        />
        {items.length > 0 && total > PAGE_SIZE && (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 px-3 pb-3">
            <PaginationPages
              page={currentPage}
              totalPages={totalPages}
              disabled={loading}
              onPageChange={(page) => setOffset((page - 1) * PAGE_SIZE)}
            />
          </div>
        )}
      </DataTableShell>

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditing(null);
            setForm(EMPTY_FORM);
          }
        }}
      >
        <DialogContent className="sm:max-w-120">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? t("warehouses.dialog.editTitle", "Sửa kho")
                : t("warehouses.dialog.createTitle", "Thêm kho mới")}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? t("warehouses.dialog.editDescription", "Cập nhật thông tin kho hàng.")
                : t("warehouses.dialog.createDescription", "Tạo kho hàng mới.")}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!saving) void handleSave();
            }}
          >
            <div className="grid gap-4 py-4">
              <div>
                <label
                  htmlFor="warehouse-code"
                  className="mb-1 block text-sm font-medium text-muted-foreground"
                >
                  {t("warehouses.form.code", "Mã kho")}
                </label>
                <Input
                  id="warehouse-code"
                  value={form.code}
                  onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                />
              </div>
              <div>
                <label
                  htmlFor="warehouse-name"
                  className="mb-1 block text-sm font-medium text-muted-foreground"
                >
                  {t("warehouses.form.name", "Tên kho")}
                </label>
                <Input
                  id="warehouse-name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="warehouse-active"
                  checked={form.is_active}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, is_active: checked }))
                  }
                />
                <label
                  htmlFor="warehouse-active"
                  className="text-sm font-medium text-muted-foreground"
                >
                  {t("warehouses.form.active", "Đang hoạt động")}
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t("common.cancel", "Hủy")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? t("common.saving", "Đang lưu...") : t("common.save", "Lưu")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("warehouses.confirm.delete.title", "Xóa kho")}</DialogTitle>
            <DialogDescription>
              {t(
                "warehouses.confirm.delete.message",
                'Bạn có chắc muốn xóa kho "{{name}}"? Hành động này không thể hoàn tác.',
              ).replace("{{name}}", deleting?.name ?? "")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              {t("common.cancel", "Hủy")}
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()}>
              {t("common.delete", "Xóa")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default WarehousesPage;
