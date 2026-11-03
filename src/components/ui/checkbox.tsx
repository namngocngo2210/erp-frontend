import * as React from "react";
import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Lightweight Checkbox — không cần Radix/base-ui, cùng phong cách với
// components/ui/switch.tsx. Hỗ trợ trạng thái "indeterminate" (checkbox
// nhóm: một phần field trong nhóm được cấp quyền).
// ─────────────────────────────────────────────────────────────

interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "checked" | "onChange" | "type"
> {
  checked?: boolean | "indeterminate";
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked = false, onCheckedChange, disabled, id, name, ...props }, forwardedRef) => {
    const innerRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
      if (innerRef.current) {
        innerRef.current.indeterminate = checked === "indeterminate";
      }
    }, [checked]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onCheckedChange && !disabled) {
        onCheckedChange(e.target.checked);
      }
    };

    return (
      <label
        className={cn(
          "inline-flex cursor-pointer items-center",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <input
          type="checkbox"
          ref={(node) => {
            innerRef.current = node;
            if (typeof forwardedRef === "function") forwardedRef(node);
            else if (forwardedRef) forwardedRef.current = node;
          }}
          id={id}
          name={name}
          checked={checked === true}
          onChange={handleChange}
          disabled={disabled}
          className="peer sr-only"
          {...props}
        />
        <span
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border border-input bg-background text-transparent shadow-xs transition-colors peer-focus-visible:outline-hidden peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed",
            checked !== false && "border-primary bg-primary text-primary-foreground",
            className,
          )}
        >
          {checked === "indeterminate" ? (
            <Minus className="h-3 w-3" strokeWidth={3} />
          ) : checked === true ? (
            <Check className="h-3 w-3" strokeWidth={3} />
          ) : null}
        </span>
      </label>
    );
  },
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
