import type { ReactNode } from "react";
import { Lightbulb } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import type { MediaProposal } from "@/lib/api/media";

type Props = {
  items: MediaProposal[];
  onOpenContent: (id: number) => void;
  rowActions?: (p: MediaProposal) => ReactNode;
};

/** Bảng "Đề xuất nội dung": chỉ đọc — task 18 cắm `rowActions` để sửa/xoá. */
export function ProposalTable({ items, onOpenContent, rowActions }: Props) {
  const { t } = useI18n();
  if (items.length === 0) return <EmptyState icon={Lightbulb} title={t("media.common.empty")} />;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {(["mainKey", "idea", "product", "due", "status", "creator", "content"] as const).map(
              (k) => (
                <TableHead key={k}>{t(`media.proposals.col.${k}`)}</TableHead>
              ),
            )}
            {rowActions ? <TableHead className="w-10" /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.main_key}</TableCell>
              <TableCell className="max-w-[20rem] truncate text-muted-foreground">
                {p.idea || "—"}
              </TableCell>
              <TableCell>
                {p.product ? (
                  <Badge variant="secondary">{p.product.code || p.product.name}</Badge>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs">
                {p.due_date ? p.due_date.slice(0, 10) : "—"}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{t(`media.proposals.status.${p.status}`)}</Badge>
              </TableCell>
              <TableCell>{p.creator?.name ?? "—"}</TableCell>
              <TableCell>
                {p.content ? (
                  <button
                    type="button"
                    className="font-mono text-xs text-primary underline"
                    onClick={() => onOpenContent(p.content!.id)}
                  >
                    {p.content.content_code || `#${p.content.id}`}
                  </button>
                ) : (
                  "—"
                )}
              </TableCell>
              {rowActions ? <TableCell>{rowActions(p)}</TableCell> : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
