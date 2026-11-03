"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";

// Lightweight slide-in side panel. Mirrors the hand-rolled Dialog primitive
// (context + portal + escape) instead of pulling in Radix, keeping the bundle
// and behaviour consistent with the rest of components/ui.

interface SheetContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextType>({
  open: false,
  onOpenChange: () => {},
});

interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

/** Giữ node mount thêm `durationMs` sau khi đóng để animate-out kịp chạy. */
function useExitAnimation(open: boolean, durationMs = 200): [boolean, "open" | "closed"] {
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

function Sheet({ open, onOpenChange, children }: SheetProps) {
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
    <SheetContext.Provider value={{ open: isOpen, onOpenChange: handleOpenChange }}>
      {children}
    </SheetContext.Provider>
  );
}

function SheetPortal({ children }: { children?: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

function SheetOverlay({
  className,
  state = "open",
  ...props
}: React.ComponentProps<"div"> & { state?: "open" | "closed" }) {
  const context = React.useContext(SheetContext);
  return (
    <div
      data-slot="sheet-overlay"
      data-state={state}
      onClick={() => context.onOpenChange(false)}
      className={cn(
        "fixed inset-0 isolate z-50 bg-slate-950/60 duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

const sheetContentVariants = cva(
  "fixed z-50 flex flex-col bg-popover text-sm text-popover-foreground shadow-xl ring-1 ring-border duration-200 outline-hidden data-[state=open]:animate-in data-[state=closed]:animate-out",
  {
    variants: {
      side: {
        right:
          "inset-y-0 right-0 h-dvh w-full max-w-xl border-l data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right sm:max-w-2xl",
        left: "inset-y-0 left-0 h-dvh w-full max-w-xl border-r data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left sm:max-w-2xl",
        // Ngăn kéo từ đáy cho điện thoại: cao theo nội dung, tối đa 85% màn, chừa safe-area.
        bottom:
          "inset-x-0 bottom-0 max-h-[85dvh] w-full rounded-t-xl border-t pb-[env(safe-area-inset-bottom)] data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
      },
    },
    defaultVariants: { side: "right" },
  },
);

function SheetContent({
  className,
  children,
  showCloseButton = true,
  side,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean;
} & VariantProps<typeof sheetContentVariants>) {
  const context = React.useContext(SheetContext);
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
    <SheetPortal>
      <SheetOverlay state={state} />
      <div
        role="dialog"
        aria-modal="true"
        data-slot="sheet-content"
        data-state={state}
        onClick={(event) => event.stopPropagation()}
        className={cn(sheetContentVariants({ side }), className)}
        {...props}
      >
        {children}
        {showCloseButton && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            data-slot="sheet-close"
            className="absolute top-2 right-2"
            onClick={() => context.onOpenChange(false)}
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </Button>
        )}
      </div>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1 border-b border-border p-4", className)}
      {...props}
    />
  );
}

function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-body"
      className={cn("min-h-0 flex-1 overflow-y-auto p-4", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "flex flex-col-reverse gap-2 border-t border-border bg-muted/30 p-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="sheet-title"
      className={cn("text-base leading-none font-semibold", className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
};
