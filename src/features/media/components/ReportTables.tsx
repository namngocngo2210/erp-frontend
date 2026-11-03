import { Inbox } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/i18n";
import type {
  MediaContentQuality,
  MediaQualityRow,
  MediaRatingsByChannel,
  MediaReportOverview,
} from "@/lib/api/media";

type Props = {
  // Optional: một endpoint báo cáo lỗi không được kéo cả 2 endpoint còn lại
  // xuống theo — mỗi khối render độc lập theo dữ liệu đã tải được (xem
  // MediaReportsPage: loading/error tách theo từng hook).
  overview?: MediaReportOverview;
  ratings?: MediaRatingsByChannel;
  quality?: MediaContentQuality;
  onOpenContent: (id: number) => void;
};

/** Danh sách nội dung thiếu tag/đánh giá — dùng chung cho 2 bảng chất lượng. */
function QualityList({
  items,
  onOpenContent,
}: {
  items: MediaQualityRow[];
  onOpenContent: (id: number) => void;
}) {
  const { t } = useI18n();
  if (items.length === 0) return <EmptyState icon={Inbox} title={t("media.common.empty")} />;
  return (
    <Table>
      <TableBody>
        {items.map((row) => (
          <TableRow key={row.id}>
            {/* Mã và tiêu đề gộp chung một ô (không bọc tiêu đề trong thẻ riêng) để
                tránh trùng chính xác với nhãn KPI cùng chữ (vd "Thiếu tag"). */}
            <TableCell className="truncate">
              <button
                type="button"
                className="mr-2 font-mono text-xs text-primary underline"
                onClick={() => onOpenContent(row.id)}
              >
                {row.content_code || `#${row.id}`}
              </button>
              {`— ${row.title}`}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** 4 bảng nhỏ của trang Báo cáo Media: theo loại, rating theo kênh, hai danh sách chất lượng. */
export function ReportTables({ overview, ratings, quality, onOpenContent }: Props) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      {overview ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("media.reports.byType")}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Belt and braces: ads-crm có thể trả null cho mảng rỗng (nil slice Go) —
                media.ts đã chuẩn hoá về [], nhưng phòng khi có đường dữ liệu chưa qua chuẩn hoá. */}
            {(overview.content_by_type ?? []).length === 0 ? (
              <EmptyState icon={Inbox} title={t("media.common.empty")} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("media.reports.col.name")}</TableHead>
                    <TableHead>{t("media.reports.col.total")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(overview.content_by_type ?? []).map((row) => (
                    <TableRow key={row.name}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell className="tabular-nums">{row.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}

      {ratings ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("media.reports.byChannel")}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Belt and braces: ratings-by-channel trả items: null khi chưa có
                đánh giá nào gắn kênh — media.ts đã chuẩn hoá, đây là phòng ngừa thêm. */}
            {(ratings.items ?? []).length === 0 ? (
              <EmptyState icon={Inbox} title={t("media.common.empty")} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("media.reports.col.name")}</TableHead>
                    <TableHead>{t("media.reports.col.avg")}</TableHead>
                    <TableHead>{t("media.reports.col.total")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(ratings.items ?? []).map((row) => (
                    <TableRow key={row.channel}>
                      <TableCell>{row.channel}</TableCell>
                      <TableCell className="tabular-nums">{row.avg_rating.toFixed(2)}</TableCell>
                      <TableCell className="tabular-nums">{row.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              {t("media.reports.byChannel.note")}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {quality ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("media.reports.quality.missingTags")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Belt and braces: content-quality có thể trả null cho mảng rỗng khi
                    khoảng ngày chọn không có dữ liệu — media.ts đã chuẩn hoá về []. */}
                <QualityList items={quality.missing_tags ?? []} onOpenContent={onOpenContent} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("media.reports.quality.missingEvaluations")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <QualityList
                  items={quality.missing_evaluations ?? []}
                  onOpenContent={onOpenContent}
                />
              </CardContent>
            </Card>
          </div>
          <p className="text-xs text-muted-foreground">{t("media.reports.quality.limit")}</p>
        </>
      ) : null}
    </div>
  );
}
