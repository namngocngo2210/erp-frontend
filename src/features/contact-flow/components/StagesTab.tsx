import { useState } from "react";
import { Edit, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type FlowStage } from "@/lib/api/contact-flow";
import { useStages, useUpdateStage } from "../queries";
import { StageFormDialog } from "./StageFormDialog";

/** Tab "Trạng thái" — CRUD danh sách Stage của flow tác nghiệp. */
export function StagesTab() {
  const { data: stages = [], isLoading, isError } = useStages();
  const updateMutation = useUpdateStage();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FlowStage | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (stage: FlowStage) => {
    setEditing(stage);
    setDialogOpen(true);
  };

  const toggleActive = async (stage: FlowStage, checked: boolean) => {
    try {
      await updateMutation.mutateAsync({ id: stage.id, body: { is_active: checked } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cập nhật trạng thái thất bại.");
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm trạng thái
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên trạng thái</TableHead>
            <TableHead>Bắt đầu</TableHead>
            <TableHead>Hồ chờ</TableHead>
            <TableHead>Hoạt động</TableHead>
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
                Không tải được danh sách trạng thái.
              </TableCell>
            </TableRow>
          ) : stages.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                Chưa có trạng thái nào.
              </TableCell>
            </TableRow>
          ) : (
            stages.map((stage) => (
              <TableRow key={stage.id}>
                <TableCell className="font-medium text-foreground">
                  <span
                    className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                    style={{ backgroundColor: stage.color || "#94a3b8" }}
                  />
                  {stage.name}
                </TableCell>
                <TableCell>
                  {stage.is_start ? <Badge variant="info">Bắt đầu</Badge> : null}
                </TableCell>
                <TableCell>
                  {stage.pool_enabled ? (
                    <Badge variant="secondary">
                      {stage.pool_minutes ? `${stage.pool_minutes} phút` : "Bật"}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={stage.is_active ?? true}
                    onCheckedChange={(checked) => void toggleActive(stage, checked)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    title="Sửa"
                    aria-label="Sửa"
                    size="icon-sm"
                    variant="outline"
                    onClick={() => openEdit(stage)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <StageFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  );
}
