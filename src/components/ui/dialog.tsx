"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";

interface DialogContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextType>({
  open: false,
  onOpenChange: () => {},
});

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

/**
 * Giữ node mount thêm `durationMs` sau khi `open` chuyển false để animation đóng
 * (animate-out) kịp chạy trước khi gỡ khỏi DOM. Trả về (còn-render, trạng-thái).
 */
function useExitAnimation(open: boolean, durationMs = 150): [boolean, "open" | "closed"] {
  const [rendered, setRendered] = React.useState(open);
  React.useEffect(() => {
    if (open) {
      setRendered(true);
      return;
    }
    if (!rendered) return;
    const timer = window.setTimeout(() => setRendered(false), durationMs);
    return () => window.clearTimeout(timer);
  }, [open, rendered, durationMs]);
  return [rendered, open ? "open" : "closed"];
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  return (
    <DialogContext.Provider value={{ open: isOpen, onOpenChange: handleOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

function DialogTrigger({ onClick, ...props }: React.ComponentProps<"button">) {
  const context = React.useContext(DialogContext);
  return (
    <button
      type="button"
      data-slot="dialog-trigger"
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) context.onOpenChange(true);
      }}
      {...props}
    />
  );
}

function DialogClose({ onClick, ...props }: React.ComponentProps<"button">) {
  const context = React.useContext(DialogContext);
  return (
    <button
      type="button"
      data-slot="dialog-close"
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) context.onOpenChange(false);
      }}
      {...props}
    />
  );
}

function DialogPortal({ children }: { children?: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

function DialogOverlay({
  className,
  state = "open",
  ...props
}: React.ComponentProps<"div"> & { state?: "open" | "closed" }) {
  const context = React.useContext(DialogContext);
  return (
    <div
      data-slot="dialog-overlay"
      data-state={state}
      onClick={() => context.onOpenChange(false)}
      className={cn(
        "fixed inset-0 isolate z-50 bg-slate-950/60 duration-150 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

const dialogContentVariants = cva(
  "fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-popover text-sm text-popover-foreground ring-1 ring-border duration-150 outline-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
  {
    variants: {
      size: {
        confirm: "grid w-[calc(100%-2rem)] max-w-sm gap-4 p-4",
        form: "flex h-dvh w-screen max-w-none flex-col overflow-hidden rounded-none p-0 sm:h-[90dvh] sm:max-h-230 sm:w-[95vw] sm:max-w-370 sm:rounded-xl",
        // Panel tầm trung cho các hộp thoại tiện ích (chọn cột…): cao gần hết
        // màn nhưng không chiếm trọn như `form`, phần thân tự cuộn.
        panel:
          "flex h-dvh w-screen max-w-none flex-col overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[85dvh] sm:w-[95vw] sm:max-w-3xl sm:rounded-xl",
      },
    },
    defaultVariants: { size: "confirm" },
  },
);

function DialogContent({
  className,
  children,
  showCloseButton = true,
  size,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean;
} & VariantProps<typeof dialogContentVariants>) {
  const context = React.useContext(DialogContext);
  const [rendered, state] = useExitAnimation(context.open);

  React.useEffect(() => {
    if (!context.open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") context.onOpenChange(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [context]);

  if (!rendered) return null;

  return (
    <DialogPortal>
      <DialogOverlay state={state} />
      <div
        role="dialog"
        aria-modal="true"
        data-slot="dialog-content"
        data-state={state}
        onClick={(event) => event.stopPropagation()}
        className={cn(dialogContentVariants({ size }), className)}
        {...props}
      >
        {children}
        {showCloseButton && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            data-slot="dialog-close"
            className="absolute top-2 right-2"
            onClick={() => context.onOpenChange(false)}
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </Button>
        )}
      </div>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="dialog-header" className={cn("flex flex-col gap-2", className)} {...props} />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean;
}) {
  const context = React.useContext(DialogContext);
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t border-border bg-muted/30 p-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <Button type="button" variant="outline" onClick={() => context.onOpenChange(false)}>
          Close
        </Button>
      )}
    </div>
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="dialog-title"
      className={cn("text-base leading-none font-medium", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground [a]:*:underline [a]:*:underline-offset-3 hover:[a]:*:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
