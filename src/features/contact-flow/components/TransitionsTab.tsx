import { useState } from "react";
import { Edit, Plus, Trash2 } from "lucide-react";
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
import { LogoSpinner } from "@/components/ui/logo-spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type FlowTransition } from "@/lib/api/contact-flow";
import { useDeleteTransition, useTransitions } from "../queries";
import { formatDelay } from "../delay-utils";
import { TransitionFormDialog } from "./TransitionFormDialog";

/** Tab "Chuyển bước" — CRUD danh sách Transition (from → result → to + độ trễ) của flow. */
export function TransitionsTab() {
  const { data: transitions = [], isLoading, isError } = useTransitions();
  const deleteMutation = useDeleteTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FlowTransition | null>(null);
  const [deleting, setDeleting] = useState<FlowTransition | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (transition: FlowTransition) => {
    setEditing(transition);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success("Đã xóa chuyển bước.");
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xóa chuyển bước thất bại.");
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm chuyển bước
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Từ trạng thái</TableHead>
            <TableHead>Kết quả</TableHead>
            <TableHead>Đến trạng thái</TableHead>
            <TableHead>Độ trễ</TableHead>
            <TableHead className="text-right">Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center">
                <LogoSpinner label="Đang tải" className="mx-auto" />
              </TableCell>
            </TableRow>
          ) : isError ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-destructive">
                Không tải được danh sách chuyển bước.
              </TableCell>
            </TableRow>
          ) : transitions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                Chưa có chuyển bước nào.
              </TableCell>
            </TableRow>
          ) : (
            transitions.map((transition) => (
              <TableRow key={transition.id}>
                <TableCell className="font-medium text-foreground">
                  {transition.from_stage_name}
                </TableCell>
                <TableCell>{transition.result_name}</TableCell>
                <TableCell>
                  {transition.to_stage_id != null ? (
                    transition.to_stage_name
                  ) : (
                    <Badge variant="secondary">— Kết thúc —</Badge>
                  )}
                </TableCell>
                <TableCell>{formatDelay(transition.delay_minutes)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    title="Sửa"
                    aria-label="Sửa"
                    size="icon-sm"
                    variant="outline"
                    onClick={() => openEdit(transition)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    title="Xóa"
                    aria-label="Xóa"
                    size="icon-sm"
                    variant="outline"
                    className="ml-1 text-destructive hover:text-destructive-foreground"
                    onClick={() => setDeleting(transition)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <TransitionFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />

      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa chuyển bước</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa chuyển bước từ &quot;{deleting?.from_stage_name}&quot;? Hành động
              này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()}>
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
