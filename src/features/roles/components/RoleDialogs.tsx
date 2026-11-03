import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { Role } from "@/lib/api/roles";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SCOPE_LABELS, SCOPE_OPTIONS } from "../constants";
import { useCreateRole, useDeleteRole } from "../queries";

type CreateProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: number) => void;
};

export function RoleCreateDialog({ open, onOpenChange, onCreated }: CreateProps) {
  const createMutation = useCreateRole();
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createScope, setCreateScope] = useState("own");

  async function handleCreate() {
    if (!createName.trim()) {
      toast.error("Vui lòng nhập tên vai trò.");
      return;
    }
    try {
      const created = await createMutation.mutateAsync({
        name: createName.trim(),
        description: createDesc.trim(),
        scope_default: createScope,
      });
      // List đã refetch xong (await ở trên) nên role mới chắc chắn có mặt.
      onCreated(created.id);
      onOpenChange(false);
      setCreateName("");
      setCreateDesc("");
      setCreateScope("own");
      toast.success("Đã tạo vai trò mới.");
    } catch {
      toast.error("Tạo vai trò thất bại (tên có thể đã tồn tại).");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo vai trò mới</DialogTitle>
          <DialogDescription>
            Đặt tên và chọn phạm vi dữ liệu mặc định. Gán quyền chi tiết sau khi tạo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Tên vai trò</label>
            <Input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="VD: Trưởng nhóm Sale, Kế toán..."
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Mô tả (tùy chọn)</label>
            <Input
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              placeholder="Mô tả ngắn về vai trò"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">
              Phạm vi dữ liệu mặc định
            </label>
            <Select value={createScope} onValueChange={setCreateScope}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCOPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {SCOPE_LABELS[opt]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleCreate}
          >
            Tạo vai trò
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type DeleteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
  onDeleted: () => void;
};

export function RoleDeleteDialog({ open, onOpenChange, role, onDeleted }: DeleteProps) {
  const deleteMutation = useDeleteRole();

  async function handleDelete() {
    if (!role) return;
    try {
      await deleteMutation.mutateAsync(role.id);
      onOpenChange(false);
      onDeleted();
      toast.success("Đã xóa vai trò.");
    } catch {
      toast.error("Xóa vai trò thất bại.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xóa vai trò</DialogTitle>
          <DialogDescription>
            Bạn có chắc muốn xóa vai trò này? Người dùng đang gán sẽ mất các quyền từ vai trò.
            {role && <span className="mt-1 block font-medium text-foreground">{role.name}</span>}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-1 h-4 w-4" />
            Xóa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
