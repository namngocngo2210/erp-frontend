import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

interface PopoverContextType {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  contentRef?: React.RefObject<HTMLDivElement | null>;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

const PopoverContext = React.createContext<PopoverContextType>({});

const Popover: React.FC<{
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}> = ({ open, onOpenChange, children }) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const handleOpenChange = isControlled ? onOpenChange : setInternalOpen;

  const rootRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownOutside = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      const isInsideRoot = rootRef.current.contains(target);
      const isInsideContent = contentRef.current?.contains(target) ?? false;
      if (!isInsideRoot && !isInsideContent) {
        handleOpenChange?.(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleOpenChange?.(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDownOutside);
    document.addEventListener("touchstart", handlePointerDownOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutside);
      document.removeEventListener("touchstart", handlePointerDownOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, handleOpenChange]);

  return (
    <PopoverContext.Provider
      value={{ open: isOpen, onOpenChange: handleOpenChange, contentRef, triggerRef }}
    >
      <div ref={rootRef} data-slot="popover" className="relative">
        {children}
      </div>
    </PopoverContext.Provider>
  );
};

function PopoverTrigger({ className, children, ...props }: React.ComponentProps<"button">) {
  const context = React.useContext(PopoverContext);

  return (
    <button
      ref={context.triggerRef}
      type="button"
      data-slot="popover-trigger"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg border border-input bg-background py-2 px-3 text-sm text-foreground transition-colors outline-hidden select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      onClick={() => context.onOpenChange?.(!context.open)}
      aria-expanded={context.open}
      {...props}
    >
      {children}
    </button>
  );
}

function PopoverContent({
  className,
  children,
  side = "bottom",
  ...props
}: React.ComponentProps<"div"> & { side?: "top" | "bottom" | "left" | "right" }) {
  const context = React.useContext(PopoverContext);
  const [contentStyle, setContentStyle] = React.useState<React.CSSProperties>({
    position: "fixed",
    left: 0,
    top: 0,
    minWidth: 200,
    zIndex: 9999,
  });

  const updatePosition = React.useCallback(() => {
    const trigger = context.triggerRef?.current;
    const content = context.contentRef?.current;
    if (!trigger || !content) return;

    const triggerRect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const spacing = 4;

    const contentRect = content.getBoundingClientRect();
    const contentWidth = Math.max(triggerRect.width, contentRect.width || 200);
    const contentHeight = contentRect.height || 0;

    let left = triggerRect.left;
    let top = triggerRect.top;

    if (side === "right") {
      left = triggerRect.right + spacing;
      top = triggerRect.top;
      if (left + contentWidth > viewportWidth - 8) {
        left = Math.max(8, triggerRect.left - contentWidth - spacing);
      }
    } else if (side === "left") {
      left = triggerRect.left - contentWidth - spacing;
      top = triggerRect.top;
      if (left < 8) {
        left = triggerRect.right + spacing;
      }
    } else if (side === "top") {
      left = triggerRect.left;
      top = triggerRect.top - contentHeight - spacing;
      if (top < 8) {
        top = triggerRect.bottom + spacing;
      }
    } else {
      // bottom (default)
      left = triggerRect.left;
      if (left + contentWidth > viewportWidth - 8) {
        left = Math.max(8, viewportWidth - contentWidth - 8);
      }

      const spaceBelow = viewportHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      const shouldOpenUp =
        contentHeight > 0 && spaceBelow < contentHeight + spacing && spaceAbove > spaceBelow;
      top = shouldOpenUp
        ? Math.max(8, triggerRect.top - contentHeight - spacing)
        : Math.min(viewportHeight - contentHeight - 8, triggerRect.bottom + spacing);
    }

    setContentStyle({
      position: "fixed",
      left,
      top,
      minWidth: triggerRect.width,
      zIndex: 9999,
    });
  }, [context.contentRef, context.triggerRef, side]);

  React.useLayoutEffect(() => {
    if (!context.open) return;

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [context.open, updatePosition]);

  if (!context.open) return null;

  return createPortal(
    <div
      ref={context.contentRef}
      style={contentStyle}
      data-slot="popover-content"
      className={cn(
        // max-w: popover width cứng (w-[320px], w-96…) không vượt viewport điện thoại (lề 8px mỗi bên).
        "max-h-96 min-w-32 max-w-[calc(100vw-1rem)] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
        className,
      )}
      {...props}
    >
      {children}
    </div>,
    document.body,
  );
}

export { Popover, PopoverTrigger, PopoverContent };
