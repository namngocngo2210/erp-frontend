import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

export type AddressField = { label: string; value: string };

type Props = {
  title: string;
  description: string;
  /** Địa chỉ đầy đủ đã chuẩn hoá; rỗng = không nhận ra. */
  address: string;
  fields: AddressField[];
  /** Chú thích thêm dưới địa chỉ (vd nguồn của kết quả 2 cấp). */
  note?: string;
};

/** Một khối kết quả (3 cấp hoặc 2 cấp): địa chỉ đầy đủ + nút copy + bảng thành phần. */
export function AddressResultCard({ title, description, address, fields, note }: Props) {
  const { copied, copy } = useCopyToClipboard();
  const found = address.trim().length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3">
          <p
            className={`min-w-0 flex-1 text-sm font-medium break-words ${
              found ? "text-foreground" : "text-muted-foreground italic"
            }`}
          >
            {found ? address : "Không nhận ra địa chỉ"}
          </p>
          {found ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Sao chép ${title}`}
              onClick={() => void copy(address)}
            >
              {copied ? (
                <Check className="h-4 w-4 text-action-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          ) : null}
        </div>
        {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {fields.map((f) => (
            <div key={f.label} className="contents">
              <dt className="text-muted-foreground">{f.label}</dt>
              <dd className={`min-w-0 break-words ${f.value ? "" : "text-muted-foreground/60"}`}>
                {f.value || "—"}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
