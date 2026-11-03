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
import { type FlowResult } from "@/lib/api/contact-flow";
import { useResults, useUpdateResult } from "../queries";
import { ResultFormDialog } from "./ResultFormDialog";

/** Tab "Kết quả" — CRUD danh sách Result (kết quả liên hệ) của flow tác nghiệp. */
export function ResultsTab() {
  const { data: results = [], isLoading, isError } = useResults();
  const updateMutation = useUpdateResult();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FlowResult | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (result: FlowResult) => {
    setEditing(result);
    setDialogOpen(true);
  };

  const toggleActive = async (result: FlowResult, checked: boolean) => {
    try {
      await updateMutation.mutateAsync({ id: result.id, body: { is_active: checked } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cập nhật trạng thái thất bại.");
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm kết quả
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên kết quả</TableHead>
            <TableHead>Đóng ca</TableHead>
            <TableHead>Bắt buộc hẹn lịch</TableHead>
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
                Không tải được danh sách kết quả.
              </TableCell>
            </TableRow>
          ) : results.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                Chưa có kết quả nào.
              </TableCell>
            </TableRow>
          ) : (
            results.map((result) => (
              <TableRow key={result.id}>
                <TableCell className="font-medium text-foreground">
                  <span
                    className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                    style={{ backgroundColor: result.color || "#94a3b8" }}
                  />
                  {result.name}
                </TableCell>
                <TableCell>
                  {result.is_close ? <Badge variant="info">Đóng ca</Badge> : "—"}
                </TableCell>
                <TableCell>{result.requires_schedule ? "Có" : "Không"}</TableCell>
                <TableCell>
                  <Switch
                    checked={result.is_active ?? true}
                    onCheckedChange={(checked) => void toggleActive(result, checked)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    title="Sửa"
                    aria-label="Sửa"
                    size="icon-sm"
                    variant="outline"
                    onClick={() => openEdit(result)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <ResultFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  );
}
