import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { QualityAgentRow } from "@/lib/api/call-quality";

type Props = {
  rows: QualityAgentRow[];
  passScore: number;
  /** Dưới mức này thì điểm chỉ là nhiễu — hiện nhãn cảnh báo thay vì im lặng. */
  minCallsForConfidence?: number;
};

const DEFAULT_MIN_CALLS = 10;

/**
 * Điểm theo từng sale PHỤ TRÁCH ĐƠN.
 *
 * Zenify không trả định danh người cầm máy, nên đây là chiều duy nhất gom được
 * theo người. Bảng nói rõ điều đó ngay dưới tiêu đề — đọc thành "ai gọi dở" là
 * quy trách nhiệm sai người khi đơn có đổi tay.
 *
 * Cột "Làm tốt nhất"/"Cần cải thiện nhất" so các tiêu chí CỦA CHÍNH người đó với
 * nhau, không so với đồng nghiệp: người điểm thấp đều vẫn có mặt mạnh nhất, và
 * đó mới là thứ dùng được trong buổi coaching.
 */
export function AgentBreakdown({
  rows,
  passScore,
  minCallsForConfidence = DEFAULT_MIN_CALLS,
}: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Theo từng sale</CardTitle>
        <p className="text-xs text-muted-foreground">
          Gom theo <strong>sale phụ trách đơn</strong> — tổng đài chưa cho biết ai là người thực
          hiện cuộc gọi. Số cuộc luôn hiện cạnh điểm; dưới {minCallsForConfidence} cuộc thì mẫu quá
          nhỏ để kết luận.
        </p>
      </CardHeader>
      <CardContent className="p-0 pb-3">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Chưa có cuộc gọi nào khớp đơn có sale phụ trách trong kỳ này.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">Sale</TableHead>
                  <TableHead className="w-24 text-right">Số cuộc</TableHead>
                  <TableHead className="w-28 text-right">Điểm TB</TableHead>
                  <TableHead className="w-56">Làm tốt nhất</TableHead>
                  <TableHead className="w-56">Cần cải thiện nhất</TableHead>
                  <TableHead>Việc nên làm</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const lowSample = row.call_count < minCallsForConfidence;
                  return (
                    <TableRow key={row.staff_id}>
                      <TableCell className="max-w-[11rem] truncate" title={row.name}>
                        {row.name}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.call_count}
                        {lowSample ? (
                          <span className="ml-1 text-xs text-action-warning">mẫu ít</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={row.avg_score >= passScore ? "default" : "secondary"}>
                          <span className="tabular-nums">{row.avg_score.toFixed(1)}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.best ? (
                          <>
                            <span className="block truncate" title={row.best.label}>
                              {row.best.label}
                            </span>
                            <span className="text-muted-foreground tabular-nums">
                              {row.best.avg_score.toFixed(1)}/2 · {row.best.call_count} cuộc
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.worst ? (
                          <>
                            <span className="block truncate" title={row.worst.label}>
                              {row.worst.label}
                            </span>
                            <span className="text-muted-foreground tabular-nums">
                              {row.worst.avg_score.toFixed(1)}/2 · {row.worst.call_count} cuộc
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.action || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
