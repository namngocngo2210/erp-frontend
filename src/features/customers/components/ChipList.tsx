import { Badge } from "@/components/ui/badge";

/** Render mảng code thành các chip Badge; trống → dấu gạch.
 * ``labels`` (tuỳ chọn) map code→nhãn hiển thị; thiếu nhãn thì hiện chính code. */
export function ChipList({
  codes,
  labels,
}: {
  codes: string[] | null | undefined;
  labels?: Record<string, string>;
}) {
  if (!codes || codes.length === 0) return <span className="text-muted-foreground">-</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {codes.map((code) => (
        <Badge key={code} variant="secondary" className="font-normal">
          {labels?.[code] ?? code}
        </Badge>
      ))}
    </div>
  );
}
