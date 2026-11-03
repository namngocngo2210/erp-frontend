import type { ComponentProps, FormEventHandler, ReactNode } from "react";

import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Lưới field responsive cho thân form: 1 cột (mobile) → 2 (lg) → 3 (xl khi columns=3). */
export function FormGrid({
  columns = 2,
  className,
  ...props
}: ComponentProps<"div"> & { columns?: 2 | 3 }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-x-6 gap-y-4",
        columns === 3 ? "lg:grid-cols-2 xl:grid-cols-3" : "lg:grid-cols-2",
        className,
      )}
      {...props}
    />
  );
}

type FormDialogShellProps = Omit<ComponentProps<typeof DialogContent>, "title" | "size"> & {
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  /** Khi có, body+footer được bọc trong <form> để nút submit (portal) vẫn submit được. */
  onSubmit?: FormEventHandler<HTMLFormElement>;
  bodyClassName?: string;
};

/**
 * Khung dialog form landscape: header dính / body cuộn / footer dính.
 * Chỉ vùng body cuộn; header & footer luôn hiển thị.
 */
export function FormDialogShell({
  title,
  description,
  footer,
  onSubmit,
  children,
  className,
  bodyClassName,
  ...props
}: FormDialogShellProps) {
  const body = (
    <div className={cn("min-h-0 flex-1 overflow-y-auto px-6 py-4", bodyClassName)}>{children}</div>
  );
  const footerEl = footer ? (
    <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-border bg-card px-6 py-3">
      {footer}
    </div>
  ) : null;

  return (
    <DialogContent
      size="form"
      className={cn("border border-border/90 bg-card text-card-foreground shadow-xl", className)}
      {...props}
    >
      <DialogHeader className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4 pr-12">
        <DialogTitle>{title}</DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>
      {onSubmit ? (
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          {body}
          {footerEl}
        </form>
      ) : (
        <>
          {body}
          {footerEl}
        </>
      )}
    </DialogContent>
  );
}
