import { useMemo, useState } from "react";
import { AlertTriangle, ThumbsDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useQualityCallDetail, useSubmitQualityReview } from "../queries";

type Props = {
  scoreId: number | null;
  onClose: () => void;
};

const BLOCK_LABELS: Record<string, string> = {
  A: "Mở đầu & xin phép",
  B: "Khai thác nhu cầu",
  C: "Tư vấn & xử lý từ chối",
  D: "Chốt đơn",
};

function scoreTone(score: number | null, na: boolean): string {
  if (na || score == null) return "text-muted-foreground";
  if (score === 0) return "text-action-danger";
  if (score === 1) return "text-action-warning";
  return "text-action-success";
}

/**
 * Chi tiết 1 cuộc gọi — màn hình dùng để đào tạo.
 *
 * Nguyên tắc: điểm nào cũng phải đi kèm trích dẫn nguyên văn. Transcript được
 * highlight đúng đoạn được trích để người xem tự kiểm chứng thay vì tin AI.
 */
export function CallScoreDetailSheet({ scoreId, onClose }: Props) {
  const { data, isLoading } = useQualityCallDetail(scoreId);
  const review = useSubmitQualityReview(scoreId);
  const [note, setNote] = useState("");

  const highlights = useMemo(
    () =>
      (data?.criteria ?? [])
        .map((item) => item.evidence)
        .filter((evidence): evidence is string => Boolean(evidence)),
    [data],
  );

  return (
    <Sheet open={scoreId != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>
            {data ? `Cuộc gọi ${data.call_date} — ${data.total_score.toFixed(0)}/100` : "Chi tiết"}
          </SheetTitle>
          <SheetDescription>
            {data
              ? [
                  data.sale_name ? `Sale phụ trách: ${data.sale_name}` : null,
                  data.customer_name || data.customer_phone
                    ? `Khách: ${[data.customer_name, data.customer_phone].filter(Boolean).join(" · ")}`
                    : null,
                  `${Math.round(data.duration_seconds / 60)} phút`,
                  `tốc độ nói ${data.wpm} từ/phút`,
                  `sale nói ${(data.talk_ratio * 100).toFixed(0)}%`,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : ""}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-5">
          {isLoading || !data ? (
            <LogoSpinner />
          ) : (
            <>
              {data.red_flags.length > 0 && (
                <section className="rounded-lg border border-action-danger/30 bg-action-danger/10 p-3">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold text-action-danger">
                    <AlertTriangle className="h-4 w-4" /> Cờ đỏ tuân thủ
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {data.red_flags.map((flag) => (
                      <li key={flag.code} className="text-sm">
                        <p className="font-medium">{flag.label}</p>
                        <p className="text-xs italic text-muted-foreground">“{flag.evidence}”</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {(data.summary || data.coaching) && (
                <section className="space-y-1">
                  {data.summary && <p className="text-sm">{data.summary}</p>}
                  {data.coaching && (
                    <p className="rounded-md bg-muted/60 p-2 text-sm">
                      <strong>Cần sửa: </strong>
                      {data.coaching}
                    </p>
                  )}
                </section>
              )}

              <section>
                <h3 className="mb-2 text-sm font-semibold">Điểm từng tiêu chí</h3>
                <div className="space-y-1">
                  {data.criteria.map((item) => (
                    <div key={item.code} className="rounded-md border border-border p-2">
                      <div className="flex items-start gap-2">
                        <span
                          className={`w-8 shrink-0 text-center text-sm font-bold tabular-nums ${scoreTone(item.score, item.na)}`}
                          title={item.na ? "Cuộc gọi không đi tới bước này" : undefined}
                        >
                          {item.na ? "na" : item.score}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {item.label}{" "}
                            <span className="text-xs font-normal text-muted-foreground">
                              ({BLOCK_LABELS[item.block] ?? item.block})
                            </span>
                          </p>
                          {item.evidence ? (
                            <p className="mt-0.5 text-xs italic text-muted-foreground">
                              “{item.evidence}”
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold">Đối chiếu với dữ liệu sale nhập</h3>
                <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Trạng thái sale lúc chấm</dt>
                    <dd>
                      {data.cross_check.sale_sales_status_label ||
                        data.cross_check.sale_sales_status_code ||
                        "—"}
                      {/* Cột trạng thái ở bảng đọc trạng thái HIỆN TẠI, còn ô này
                          là bản chụp lúc AI chấm. Không có dòng ghi chú thì người
                          xem thấy hai giá trị khác nhau trên cùng một cuộc và
                          tưởng hệ thống sai. */}
                      {data.cross_check.sales_status_changed_since ? (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (sale đã đổi sang “{data.sales_status_label}” sau khi chấm)
                        </span>
                      ) : null}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Lý do không chốt sale khai</dt>
                    <dd>
                      {data.cross_check.sale_not_closed_reason_label ||
                        data.cross_check.sale_not_closed_reason_code ||
                        "—"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-muted-foreground">Lý do AI nghe được</dt>
                    <dd>{data.cross_check.ai_not_closed_reason || "—"}</dd>
                  </div>
                  {data.cross_check.contraindications.length > 0 && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-muted-foreground">Bệnh nền khách khai</dt>
                      <dd className="flex flex-wrap gap-1">
                        {data.cross_check.contraindications.map((item) => (
                          <Badge key={item} variant="secondary">
                            {item}
                          </Badge>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold">Ghi âm</h3>
                {data.recording_url ? (
                  <div className="space-y-1">
                    {/* preload="none": sheet mở ra là KHÔNG tải file. Mỗi lần
                        team lead lướt qua 20 cuộc mà tự tải hết là vài chục MB
                        vô ích, phần lớn không ai bấm nghe. */}
                    <audio controls preload="none" src={data.recording_url} className="w-full">
                      Trình duyệt không phát được file ghi âm.
                    </audio>
                    {/* URL ghi âm Zenify hết hạn theo retention của họ — cuộc cũ
                        sẽ không phát được nữa. Luôn để sẵn link mở tab mới để
                        phân biệt "trình duyệt chặn" với "file đã hết hạn". */}
                    <a
                      href={data.recording_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      Mở file ghi âm ở tab mới
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Cuộc gọi này không có file ghi âm.
                  </p>
                )}
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold">Transcript</h3>
                <div className="max-h-80 overflow-y-auto rounded-md border border-border bg-muted/30 p-3 text-xs leading-relaxed">
                  {data.transcript
                    ? data.transcript.split("\n").map((line, index) => (
                        <p
                          key={index}
                          className={
                            highlights.some((evidence) => line.includes(evidence.slice(0, 40)))
                              ? "rounded bg-action-warning/10 px-1"
                              : undefined
                          }
                        >
                          {line}
                        </p>
                      ))
                    : "Không có transcript."}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">AI chấm sai?</h3>
                <p className="text-xs text-muted-foreground">
                  Phản hồi KHÔNG ghi đè điểm AI — nó được lưu riêng để đo độ chính xác theo thời
                  gian và sửa prompt ở phiên bản sau.
                </p>
                <Textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Chấm sai ở chỗ nào, đúng ra phải thế nào…"
                  rows={3}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!note.trim() || review.isPending}
                  onClick={() =>
                    review.mutate({ note: note.trim() }, { onSuccess: () => setNote("") })
                  }
                >
                  <ThumbsDown className="mr-1.5 h-3.5 w-3.5" />
                  Gửi phản hồi
                </Button>
                {data.reviews.length > 0 && (
                  <ul className="space-y-1 pt-1">
                    {data.reviews.map((item) => (
                      <li key={item.id} className="text-xs text-muted-foreground">
                        • {item.note}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
