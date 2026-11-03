import { memo } from "react";
import { Plus, Trash2, Undo2 } from "lucide-react";
import {
  type OrderRecallEntryRow,
  type OrderRecallRow,
  type OrderRow,
} from "@/features/orders/order-types";
import { ERow, SectionCard, type SectionVariant } from "@/features/orders/order-detail-shared";
import { useI18n } from "@/i18n";

/** Bỏ `id` trước khi gửi lên `patch`: backend full-replace (xoá-tạo lại) nên id không có nghĩa. */
function toPayload(entries: OrderRecallEntryRow[]): OrderRecallEntryRow[] {
  return entries.map((entry) => ({
    recall_code: entry.recall_code ?? "",
    recall_created_date: entry.recall_created_date ?? null,
    recall_received_date: entry.recall_received_date ?? null,
  }));
}

const ENTRY_INPUT_CLASS =
  "h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring";

/** Ô nhập của một field trong đợt thu hồi: nhãn nhỏ phía trên, input luôn hiện. */
function EntryField({
  label,
  type,
  value,
  placeholder,
  onCommit,
}: {
  label: string;
  type: "text" | "date";
  value: string;
  placeholder?: string;
  onCommit: (next: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        className={ENTRY_INPUT_CLASS}
        defaultValue={value}
        placeholder={placeholder}
        onBlur={(e) => {
          if (e.target.value === value) return;
          onCommit(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
    </label>
  );
}

function BlockRecallImpl({
  order,
  patch,
  variant,
}: {
  order: OrderRow;
  patch: (p: Partial<OrderRow>) => void;
  variant?: SectionVariant;
}) {
  const { t } = useI18n();
  const entries = order.recall_entries ?? [];

  // `patch` ghi vào pendingRows (xem OrderDetailPage) chứ không gọi API ngay,
  // nên nhóm rỗng vừa thêm sống yên trong state chờ tới khi người dùng gõ hoặc
  // bấm Lưu — lúc đó backend mới loại nhóm còn rỗng cả 3 ô.
  const patchEntries = (next: OrderRecallEntryRow[]) => {
    patch({ recall_entries: next } as Partial<OrderRow>);
  };

  const updateField = (index: number, field: keyof OrderRecallEntryRow, value: string | null) => {
    const next = toPayload(entries);
    next[index] = { ...next[index], [field]: value };
    patchEntries(next);
  };

  // Chỉ gửi đúng field user vừa sửa; OrderDetailPage deep-merge `recall` vào pendingRows.
  const patchRecall = (fields: Partial<OrderRecallRow>) => {
    patch({ recall: fields as OrderRecallRow });
  };

  return (
    <SectionCard
      icon={<Undo2 className="h-4 w-4" />}
      title={t("orders.recall.title")}
      variant={variant}
    >
      {/* Field nằm trực tiếp trên Order (không lồng trong recall) — patch thẳng
          lên order, khác các ERow bên dưới đi qua patchRecall/patchEntries. */}
      <ERow
        label={t("orders.columns.kocOrderType")}
        rawValue={order.koc_order_type ?? ""}
        type="select"
        options={[
          { value: "", label: "—" },
          { value: "sample_gift", label: t("kocOrderType.sample_gift") },
          { value: "renewal", label: t("kocOrderType.renewal") },
          { value: "recall", label: t("kocOrderType.recall") },
        ]}
        onSave={(v) => patch({ koc_order_type: String(v) as OrderRow["koc_order_type"] })}
      />

      {/* Danh sách đợt thu hồi: mỗi đợt một thẻ, ba field xếp ngang thay vì ba
          dòng label-155px rời rạc — nhìn ra ngay mã nào đi với cặp ngày nào. */}
      <div className="flex flex-col gap-2 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("orders.recall.groupTitle", "Đợt thu hồi")}
            {entries.length > 0 ? ` (${entries.length})` : ""}
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
            onClick={() =>
              patchEntries([
                ...toPayload(entries),
                { recall_code: "", recall_created_date: null, recall_received_date: null },
              ])
            }
          >
            <Plus className="h-3.5 w-3.5" />
            {t("orders.recall.addEntry", "Thêm đợt thu hồi")}
          </button>
        </div>

        {entries.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
            {t("orders.recall.empty", "Chưa có đợt thu hồi nào")}
          </p>
        ) : (
          entries.map((entry, index) => (
            <div
              key={entry.id ?? `new-${index}`}
              className="rounded-lg border border-border bg-muted/30 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {t("orders.recall.groupTitle", "Đợt thu hồi")} #{index + 1}
                </span>
                <button
                  type="button"
                  aria-label={`${t("orders.recall.removeGroup", "Xoá đợt")} #${index + 1}`}
                  title={`${t("orders.recall.removeGroup", "Xoá đợt")} #${index + 1}`}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                  onClick={() => patchEntries(toPayload(entries.filter((_, i) => i !== index)))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <EntryField
                  label={t("orders.columns.recallCode")}
                  type="text"
                  value={entry.recall_code ?? ""}
                  placeholder="—"
                  onCommit={(next) => updateField(index, "recall_code", next.trim())}
                />
                <EntryField
                  label={t("orders.columns.recallCreatedDate")}
                  type="date"
                  value={entry.recall_created_date ?? ""}
                  onCommit={(next) => updateField(index, "recall_created_date", next || null)}
                />
                <EntryField
                  label={t("orders.columns.recallReceivedDate")}
                  type="date"
                  value={entry.recall_received_date ?? ""}
                  onCommit={(next) => updateField(index, "recall_received_date", next || null)}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Phiếu trả hàng đứng riêng, ngoài danh sách nhóm — vẫn patch qua
          `recall.return_slip_code` như trước khi tách nhóm thành mảng. */}
      <ERow
        label={t("orders.columns.returnSlipCode")}
        rawValue={order.recall?.return_slip_code ?? ""}
        type="text"
        onSave={(v) => patchRecall({ return_slip_code: String(v) })}
      />
    </SectionCard>
  );
}

export const BlockRecall = memo(BlockRecallImpl);
