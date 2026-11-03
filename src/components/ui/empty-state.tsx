import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Optional lucide icon component rendered above the title. */
  icon?: LucideIcon;
  /** Primary message describing the empty state. */
  title: React.ReactNode;
  /** Optional secondary, more detailed description. */
  description?: React.ReactNode;
  /** Optional call-to-action (e.g. a Button) rendered below the text. */
  action?: React.ReactNode;
}

/**
 * Shared empty-state placeholder used when a list / table / card has no data.
 * Centered layout, design-token colors only (no hardcoded colors).
 */
const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon: Icon, title, description, action, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center gap-2 px-6 py-10 text-center",
          className,
        )}
        {...props}
      >
        {Icon ? (
          // Minh hoạ nhẹ: vòng brand đồng tâm + chip gradient, thay ô tròn xám phẳng.
          <span className="relative mb-2 flex h-16 w-16 items-center justify-center">
            <span aria-hidden className="absolute inset-0 rounded-full bg-primary/5" />
            <span aria-hidden className="absolute inset-[0.4rem] rounded-full bg-primary/10" />
            <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/15">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          </span>
        ) : null}
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        ) : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    );
  },
);
EmptyState.displayName = "EmptyState";

export { EmptyState };
