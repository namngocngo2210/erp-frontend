import type { QualityCoverage } from "@/lib/api/call-quality";
import { formatNumber } from "@/lib/format";

type Props = { coverage: QualityCoverage };

/**
 * Dòng đếm vận hành. KHÔNG dùng để đánh giá sale — nó trả lời một câu hỏi hạ
 * tầng: tổng đài có đang mất file ghi âm không. Ghi âm mất là không lấy lại
 * được, nên phát hiện sớm mới cứu được dữ liệu QA của những ngày sau.
 *
 * Cố ý để cỡ chữ nhỏ ở góc: đây là thông tin cho người vận hành, không phải
 * con số cần đập vào mắt mỗi lần mở trang.
 */
export function CoverageLine({ coverage }: Props) {
  const recordingRate = coverage.total_calls
    ? Math.round((coverage.with_recording / coverage.total_calls) * 100)
    : 0;

  return (
    <p className="text-xs text-muted-foreground">
      Trong kỳ: <strong className="tabular-nums">{formatNumber(coverage.total_calls)}</strong> cuộc
      gọi · <strong className="tabular-nums">{formatNumber(coverage.with_recording)}</strong> có ghi
      âm ({recordingRate}%) ·{" "}
      <strong className="tabular-nums">{formatNumber(coverage.transcribed)}</strong> có transcript ·{" "}
      <strong className="tabular-nums">{formatNumber(coverage.scored)}</strong> đã chấm
      {coverage.ignores_filters ? (
        // Không có câu này thì người đang lọc theo trạng thái sale sẽ thấy số ở
        // đây to hơn hẳn thẻ "số cuộc đã chấm" phía trên và tưởng một trong hai
        // bị sai.
        <span> · dòng này tính CẢ KỲ, không theo bộ lọc trạng thái</span>
      ) : null}
    </p>
  );
}
