import { ScanBarcode } from "lucide-react";

/** Badge trạng thái súng quét. `active` = vừa nhận một lần quét gần đây. */
export function ScannerGunBadge({ active }: { active: boolean }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium " +
        (active ? "bg-action-success/10 text-action-success" : "bg-muted text-muted-foreground")
      }
    >
      <ScanBarcode className="size-3.5" />
      {active ? "Súng quét: đang hoạt động" : "Súng quét: chờ tín hiệu"}
    </span>
  );
}
