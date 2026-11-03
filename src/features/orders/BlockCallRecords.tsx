import { memo } from "react";
import { Phone, PhoneIncoming, PhoneOutgoing } from "lucide-react";

import { SectionCard, type SectionVariant } from "@/features/orders/order-detail-shared";
import { useOrderCallRecords } from "@/features/callcenter/queries";
import type { OrderCallRecordItem } from "@/lib/api/callcenter";
import { formatDateTime } from "@/lib/format";

// Khớp TranscribeStatus backend (apps/callcenter/models.py).
const STATUS_DONE = 2;
const STATUS_FAILED = 3;
const STATUS_SKIPPED = 4;

/** Ghi chú dưới mỗi cuộc gọi khi CHƯA có transcript để hiển thị. */
function transcriptNote(record: OrderCallRecordItem): string {
  if (record.transcribe_status === STATUS_FAILED) return "Transcribe thất bại.";
  if (record.transcribe_status === STATUS_SKIPPED) {
    // Skipped = không đủ điều kiện transcribe ngay từ đầu: gọi nhỡ (không có
    // file) hoặc đàm thoại quá ngắn (vẫn có thể có file — player vẫn hiện).
    return record.recording_url
      ? "Không transcribe — đàm thoại quá ngắn."
      : "Gọi nhỡ — không có ghi âm.";
  }
  return "Transcript đang được xử lý.";
}

function formatCallTime(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return formatDateTime(parsed);
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}p${String(s).padStart(2, "0")}s` : `${s}s`;
}

function CallRecordRow({ record }: { record: OrderCallRecordItem }) {
  const isOutbound = record.call_type === "1";
  const DirectionIcon = isOutbound ? PhoneOutgoing : PhoneIncoming;
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <DirectionIcon className="h-3.5 w-3.5 text-muted-foreground" />
          {isOutbound ? "Gọi ra" : "Gọi vào"}
        </span>
        <span className="text-muted-foreground">{formatCallTime(record.start_time)}</span>
        {record.agent_name ? (
          <span className="text-muted-foreground">NV: {record.agent_name}</span>
        ) : null}
        <span className="text-muted-foreground">{formatDuration(record.acd_time)}</span>
      </div>
      {record.recording_url ? (
        // preload="none": danh sách nhiều cuộc gọi không được tải trước toàn bộ audio.
        <audio controls preload="none" src={record.recording_url} className="h-9 w-full max-w-md" />
      ) : null}
      {record.transcribe_status === STATUS_DONE && record.transcript ? (
        <details>
          <summary className="cursor-pointer select-none text-sm text-primary">
            Xem transcript
          </summary>
          <p className="mt-2 whitespace-pre-wrap rounded-md bg-card p-3 text-sm leading-relaxed">
            {record.transcript}
          </p>
        </details>
      ) : (
        <p className="text-xs text-muted-foreground">{transcriptNote(record)}</p>
      )}
    </div>
  );
}

/**
 * Cuộc gọi CSKH (Zenify) đã khớp với đơn — nghe ghi âm + đọc transcript.
 * Read-only; LUÔN hiển thị (kể cả rỗng) để sale biết tính năng tồn tại và phân
 * biệt được "chưa có cuộc gọi" với "FE chưa deploy". Chỉ ẩn lúc đang tải.
 */
function BlockCallRecordsImpl({
  orderId,
  variant,
}: {
  orderId: number | null | undefined;
  variant?: SectionVariant;
}) {
  const { data, isPending, isError } = useOrderCallRecords(orderId);
  // Lỗi (404 ngoài scope / mạng) thì ẨN block: hiện "Chưa có cuộc gọi nào" lúc này
  // là câu khẳng định SAI với user ngoài scope (audit 2026-07-18).
  if (!orderId || isPending || isError) return null;
  const items = data?.items ?? [];

  return (
    <SectionCard
      icon={<Phone className="h-4 w-4" />}
      title={items.length > 0 ? `Cuộc gọi CSKH (${items.length})` : "Cuộc gọi CSKH"}
      variant={variant}
    >
      {items.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">
          Chưa có cuộc gọi nào được ghi nhận cho đơn này.
        </p>
      ) : (
        <div className="flex flex-col gap-3 py-2">
          {items.map((record) => (
            <CallRecordRow key={record.id} record={record} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

export const BlockCallRecords = memo(BlockCallRecordsImpl);
