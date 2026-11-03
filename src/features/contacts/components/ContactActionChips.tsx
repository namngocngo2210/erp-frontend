import type { components } from "@/api/typed";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CHIP_ORDER, CONTACT_ACTIONS, type ContactActionKey } from "../contact-actions";

type ActionCount = components["schemas"]["ContactActionCount"];

type ContactActionChipsProps = {
  /** `action_counts` từ response — key "all" luôn có mặt, các key khác theo ContactActionKey. */
  actionCounts: Record<string, ActionCount> | undefined;
  /** action_needed đang chọn; `null` = chip "Tất cả". */
  selected: ContactActionKey | null;
  onSelect: (key: ContactActionKey | null) => void;
};

function ChipButton({
  active,
  activeClass,
  label,
  count,
  onClick,
}: {
  active: boolean;
  activeClass: string;
  label: string;
  count: ActionCount | undefined;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      className={cn("h-8 gap-1.5 px-2.5 text-xs font-medium", active && activeClass)}
      onClick={onClick}
    >
      <span>{label}</span>
      {count && (
        <span
          className={cn(
            "rounded-full px-1.5 text-2xs tabular-nums",
            active ? "bg-white/20" : "bg-muted text-muted-foreground",
          )}
        >
          {count.pending}/{count.total}
        </span>
      )}
    </Button>
  );
}

/**
 * Hàng chip lọc theo `action_needed`: "Tất cả" + CHIP_ORDER. Thuần
 * presentational — chọn/bỏ chọn do page điều khiển qua `selected`/`onSelect`.
 */
export function ContactActionChips({ actionCounts, selected, onSelect }: ContactActionChipsProps) {
  const allCount = actionCounts?.all;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ChipButton
        active={selected === null}
        activeClass="bg-foreground text-background hover:bg-foreground/90"
        label="Tất cả"
        count={allCount}
        onClick={() => onSelect(null)}
      />
      {CHIP_ORDER.map((key) => {
        const { label, badgeClass } = CONTACT_ACTIONS[key];
        return (
          <ChipButton
            key={key}
            active={selected === key}
            activeClass={badgeClass}
            label={label}
            count={actionCounts?.[key]}
            onClick={() => onSelect(selected === key ? null : key)}
          />
        );
      })}
    </div>
  );
}
