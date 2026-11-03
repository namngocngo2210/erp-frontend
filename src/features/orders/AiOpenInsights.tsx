import { memo } from "react";
import { Sparkles } from "lucide-react";
import { SectionCard, type SectionVariant } from "@/features/orders/order-detail-shared";

export type AiOpenInsightItem = {
  topic: string;
  content: string;
  quote: string;
  call_record_id: number;
  at: string;
};

// Giỏ mở: thông tin đáng chú ý AI ghi nhận được từ cuộc gọi ngoài các trường
// đánh giá đã định nghĩa sẵn (assessment_field_defs). Read-only — sale không
// sửa trực tiếp ở đây, chỉ tham khảo kèm trích dẫn nguyên văn (tooltip).
function AiOpenInsightsImpl({
  items,
  variant,
}: {
  items: AiOpenInsightItem[];
  variant?: SectionVariant;
}) {
  if (items.length === 0) return null;
  return (
    <SectionCard icon={<Sparkles className="h-4 w-4" />} title="AI ghi nhận thêm" variant={variant}>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={`${item.call_record_id}-${index}`} className="text-sm" title={`“${item.quote}”`}>
            <span className="font-medium">{item.topic}:</span>{" "}
            <span className="text-muted-foreground">{item.content}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export const AiOpenInsights = memo(AiOpenInsightsImpl);
