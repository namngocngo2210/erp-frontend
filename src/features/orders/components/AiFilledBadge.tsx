import { Sparkles } from "lucide-react";

export type AiFilledInfo = {
  call_record_id: number;
  quote: string;
  at: string;
};

export type AiFilledMap = Record<string, AiFilledInfo>;

type Props = {
  info?: AiFilledInfo;
};

/**
 * Nhãn nhỏ cạnh field cho biết giá trị do AI trích từ transcript cuộc gọi,
 * kèm trích dẫn nguyên văn làm căn cứ để sale kiểm chứng nhanh.
 * Sale sửa đè → backend xoá key nên badge tự biến mất ở lần load sau.
 */
export function AiFilledBadge({ info }: Props) {
  if (!info) return null;
  return (
    <span
      aria-label={`AI điền từ cuộc gọi: "${info.quote}"`}
      title={`AI điền từ cuộc gọi: "${info.quote}"`}
      className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-sky-50 px-1.5 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-200"
    >
      <Sparkles className="h-2.5 w-2.5" aria-hidden />
      AI
    </span>
  );
}
