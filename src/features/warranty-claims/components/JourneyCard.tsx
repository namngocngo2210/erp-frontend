import { useEffect, useState } from "react";
import { Check, ChevronRight, Pencil, Save, Trash2, Undo2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useDeleteJourney, useUpdateJourney } from "@/features/warranty-claims/queries";
import type { WarrantyJourney } from "@/features/warranty-claims/warranty-claim-types";
import { VcGroupBadge } from "./journey/journey-fields";
import { useJourneyForm } from "./journey/journey-form";
import { ProductSection, ReceiverSection, ShippingSection } from "./journey/journey-sections-send";
import {
  ClaimSection,
  FeedbackSection,
  ResolutionSection,
  ReturnSection,
  WarehouseSection,
} from "./journey/journey-sections-return";
import { journeySectionFlags } from "./journey/journey-visibility";
import { useConfirm } from "@/hooks/use-confirm";

interface Props {
  journey: WarrantyJourney;
}

/**
 * Form 1 hành trình bảo hành (§2-§7). Các field §2-§7 dùng state cục bộ
 * (buffered, xem `useJourneyForm`) — KHÔNG auto-save; người dùng bấm
 * "Lưu hành trình" để ghi. Tên hành trình (title ở header) vẫn lưu ngay khi
 * bấm ✓ — an toàn với bản nháp vì form sync bỏ qua refetch khi đang dirty.
 */
export function JourneyCard({ journey }: Props) {
  const [open, setOpen] = useState(false);
  const update = useUpdateJourney();
  const del = useDeleteJourney();
  const confirm = useConfirm();
  const { form, set, setSynced, dirty, save, reset, isSaving } = useJourneyForm(journey);

  // Tên hành trình: mặc định hiển thị dạng text (click để mở/thu gọn), bấm ✎ mới
  // vào chế độ sửa rồi bấm ✓ để lưu — tránh việc ô luôn editable nuốt click mở.
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(journey.name);

  // Đồng bộ tên theo server khi bản ghi đổi — trừ lúc ĐANG sửa tên (không wipe
  // draft tên vì refetch realtime/lưu form body).
  useEffect(() => {
    if (editingName) return;
    setNameDraft(journey.name);
    // Thu hẹp deps là CÓ CHỦ ĐÍCH (xem comment trên) → react-compiler bỏ qua tối ưu
    // component này và cảnh báo; tắt kèm để lint:strict giữ được ngưỡng 0 warning.
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journey.updated_at, journey.id]);

  /** Lưu `name` (title) khi bấm ✓ — nhẹ, tách khỏi form body buffered. */
  const commitName = () => {
    const value = nameDraft.trim();
    setEditingName(false);
    if (value === journey.name) return;
    update.mutate(
      { id: journey.id, patch: { name: value } },
      { onError: (e) => toast.error(e instanceof Error ? e.message : "Lưu tên thất bại") },
    );
  };

  const cancelNameEdit = () => {
    setNameDraft(journey.name);
    setEditingName(false);
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: `Xóa hành trình #${journey.seq}?`,
      description: "Thao tác không thể hoàn tác.",
      destructive: true,
    });
    if (!ok) return;
    del.mutate(journey.id, {
      onError: (e) => toast.error(e instanceof Error ? e.message : "Xóa hành trình thất bại"),
    });
  };

  const sectionProps = { journey, form, set, setSynced };

  // Cờ ẩn/hiện tính MỘT lần ở đây rồi truyền xuống — không để mỗi section tự suy.
  // Dùng `form.inspection_result` (bản nháp) chứ không phải `journey`: chọn kết
  // quả kiểm tra xong là khối CSKH hiện ngay, không phải bấm Lưu trước.
  // `journey.status` và dấu vết khiếu nại (claim_date/carrier_response/
  // compensation_status) lấy từ bản ghi SERVER — đây là các trạng thái do quét
  // kho/luồng đã ghi đặt, form không tự suy hay sửa được.
  const flags = journeySectionFlags({
    shippingForm: form.shipping_form,
    vcGroups: journey.vc_groups,
    inspectionResult: form.inspection_result,
    journeyStatus: journey.status,
    claimTrace: {
      claim_date: journey.claim_date,
      carrier_response: journey.carrier_response,
      compensation_status: journey.compensation_status,
    },
  });

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Thu gọn hành trình" : "Mở hành trình"}
          aria-expanded={open}
          className="shrink-0 text-muted-foreground"
        >
          <ChevronRight className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} />
        </button>
        {editingName ? (
          <>
            <Input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName();
                else if (e.key === "Escape") cancelNameEdit();
              }}
              placeholder={`Hành trình #${journey.seq}`}
              aria-label={`Tên hành trình #${journey.seq}`}
              className="h-8 min-w-0 flex-1 px-2 font-medium"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Lưu tên hành trình"
              onClick={commitName}
              disabled={update.isPending}
            >
              <Check className="h-4 w-4 text-primary" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Hủy sửa tên"
              onClick={cancelNameEdit}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="min-w-0 flex-1 truncate px-1 text-left text-sm font-medium hover:text-primary"
            >
              {journey.name || `Hành trình #${journey.seq}`}
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Sửa tên hành trình #${journey.seq}`}
              onClick={() => {
                setNameDraft(journey.name);
                setEditingName(true);
              }}
            >
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </Button>
          </>
        )}
        {dirty && (
          <span className="shrink-0 text-xs font-medium text-action-warning">• Chưa lưu</span>
        )}
        {/* Nhóm VC tự động theo Best (chính) + trạng thái nội bộ kho (tham khảo). */}
        <VcGroupBadge group={journey.vc_groups?.main ?? "created"} />
        <Badge variant="outline" className="shrink-0">
          {journey.status_label}
        </Badge>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Xóa hành trình #${journey.seq}`}
          onClick={handleDelete}
          disabled={del.isPending}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {open && (
        <div className="space-y-6 border-t border-border px-4 py-4">
          <ReceiverSection {...sectionProps} />
          <ProductSection {...sectionProps} />
          <ShippingSection {...sectionProps} />
          {flags.warehouse && <WarehouseSection {...sectionProps} />}
          {flags.resolution && <ResolutionSection {...sectionProps} />}
          {flags.returnBlock && <ReturnSection {...sectionProps} />}
          {flags.feedback && <FeedbackSection {...sectionProps} />}
          {flags.claim && <ClaimSection {...sectionProps} />}

          {/* Thanh Lưu — buffered, không auto-save. */}
          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            {dirty && (
              <Button type="button" variant="ghost" onClick={reset} disabled={isSaving}>
                <Undo2 className="mr-2 h-4 w-4" />
                Hoàn tác
              </Button>
            )}
            <Button
              type="button"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={save}
              disabled={!dirty || isSaving}
            >
              <Save className="mr-2 h-4 w-4" />
              Lưu hành trình
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
