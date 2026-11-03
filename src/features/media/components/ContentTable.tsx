import type { ReactNode } from "react";
import { Film } from "lucide-react";

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
import { thumbnailUrl, type MediaContent } from "@/lib/api/media";

import { RatingBadge } from "./RatingBadge";

type Props = {
  items: MediaContent[];
  publicBaseUrl: string;
  onOpen: (id: number) => void;
  /** Cột hành động cuối hàng (Task 16 cắm menu nhân bản/xoá). */
  rowActions?: (content: MediaContent) => ReactNode;
};

export function Thumb({
  content,
  publicBaseUrl,
  className = "h-12 w-9",
}: {
  content: MediaContent;
  publicBaseUrl: string;
  className?: string;
}) {
  const src = thumbnailUrl(publicBaseUrl, content);
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded bg-muted ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt={content.title}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).hidden = true;
          }}
        />
      ) : (
        <Film className="h-4 w-4 text-muted-foreground" aria-hidden />
      )}
    </span>
  );
}

export function ContentTable({ items, publicBaseUrl, onOpen, rowActions }: Props) {
  const { t } = useI18n();
  if (items.length === 0) return <EmptyState icon={Film} title={t("media.common.empty")} />;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12" />
            <TableHead>{t("media.contents.col.code")}</TableHead>
            <TableHead>{t("media.contents.col.title")}</TableHead>
            <TableHead>{t("media.contents.col.source")}</TableHead>
            <TableHead>{t("media.contents.col.type")}</TableHead>
            <TableHead>{t("media.contents.col.tags")}</TableHead>
            <TableHead>{t("media.contents.col.rating")}</TableHead>
            <TableHead>{t("media.contents.col.uploaded")}</TableHead>
            {rowActions ? <TableHead className="w-10" /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((c) => (
            <TableRow key={c.id} className="cursor-pointer" onClick={() => onOpen(c.id)}>
              <TableCell>
                <Thumb content={c} publicBaseUrl={publicBaseUrl} />
              </TableCell>
              <TableCell className="font-mono text-xs">{c.content_code}</TableCell>
              <TableCell className="max-w-[24rem] truncate font-medium">{c.title}</TableCell>
              <TableCell>{c.source?.name ?? "—"}</TableCell>
              <TableCell>{c.content_type?.name ?? "—"}</TableCell>
              <TableCell className="max-w-[16rem] truncate text-xs text-muted-foreground">
                {/* Belt and braces: ads-crm có thể trả null cho slice rỗng (nil slice Go) —
                    media.ts đã chuẩn hoá về [], nhưng phòng khi có đường dữ liệu chưa qua chuẩn hoá. */}
                {[
                  ...(c.products ?? []).map((p) => p.code || p.name),
                  ...(c.categories ?? []).map((k) => k.name),
                ].join(", ") || "—"}
              </TableCell>
              <TableCell>
                <RatingBadge rating={c.overall_rating} score={c.overall_score} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs">
                {c.uploaded_at.slice(0, 10)}
              </TableCell>
              {rowActions ? (
                <TableCell onClick={(e) => e.stopPropagation()}>{rowActions(c)}</TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
