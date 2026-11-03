import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface DropdownContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLButtonElement | null>;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
}

const DropdownContext = React.createContext<DropdownContextType>({
  open: false,
  onOpenChange: () => {},
  triggerRef: { current: null },
  contentRef: { current: null },
});

// ---------------------------------------------------------------------------
// DropdownMenu (root)
// ---------------------------------------------------------------------------

interface DropdownMenuProps {
  children: React.ReactNode;
}

function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;

    function handleOutsideClick(e: MouseEvent | TouchEvent) {
      const target = e.target;
      if (!(target instanceof Node)) return;
      const insideTrigger = triggerRef.current?.contains(target) ?? false;
      const insideContent = contentRef.current?.contains(target) ?? false;
      if (!insideTrigger && !insideContent) setOpen(false);
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <DropdownContext.Provider value={{ open, onOpenChange: setOpen, triggerRef, contentRef }}>
      <div className="relative inline-flex">{children}</div>
    </DropdownContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// DropdownMenuTrigger
// ---------------------------------------------------------------------------

interface DropdownMenuTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
}

function DropdownMenuTrigger({ asChild, children }: DropdownMenuTriggerProps) {
  const { open, onOpenChange, triggerRef } = React.useContext(DropdownContext);

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<
      React.HTMLAttributes<HTMLButtonElement> & { ref?: React.Ref<HTMLButtonElement> }
    >;
    return React.cloneElement(child, {
      ref: triggerRef,
      "aria-expanded": open,
      "aria-haspopup": "menu",
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        if (typeof child.props.onClick === "function") child.props.onClick(e);
        onOpenChange(!open);
      },
    });
  }

  return (
    <button ref={triggerRef} type="button" onClick={() => onOpenChange(!open)} aria-expanded={open}>
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// DropdownMenuContent
// ---------------------------------------------------------------------------

interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end";
}

function DropdownMenuContent({
  className,
  align = "start",
  children,
  ...props
}: DropdownMenuContentProps) {
  const { open, triggerRef, contentRef } = React.useContext(DropdownContext);
  const [style, setStyle] = React.useState<React.CSSProperties>({
    position: "fixed",
    zIndex: 9999,
  });

  const updatePosition = React.useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const content = contentRef.current;
    const contentWidth = content?.offsetWidth ?? 160;

    let left = rect.left;
    if (align === "end") left = rect.right - contentWidth;
    else if (align === "center") left = rect.left + (rect.width - contentWidth) / 2;

    const vw = window.innerWidth;
    if (left + contentWidth > vw - 8) left = Math.max(8, vw - contentWidth - 8);
    if (left < 8) left = 8;

    // Trigger sát đáy màn (thanh hành động dính đáy ở mobile) → lật menu lên trên
    // thay vì mở ra ngoài viewport.
    const contentHeight = content?.offsetHeight ?? 0;
    const vh = window.innerHeight;
    const flipUp = rect.bottom + 4 + contentHeight > vh - 8 && rect.top - 4 - contentHeight >= 8;

    setStyle({
      position: "fixed",
      top: flipUp ? rect.top - 4 - contentHeight : rect.bottom + 4,
      left,
      minWidth: rect.width,
      zIndex: 9999,
    });
  }, [align, triggerRef, contentRef]);

  React.useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  if (!open) return null;

  return createPortal(
    <div
      ref={contentRef}
      style={style}
      role="menu"
      data-slot="dropdown-menu-content"
      className={cn(
        "min-w-32 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 p-1",
        className,
      )}
      {...props}
    >
      {children}
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// DropdownMenuItem
// ---------------------------------------------------------------------------

interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  inset?: boolean;
}

function DropdownMenuItem({
  className,
  inset,
  children,
  onClick,
  ...props
}: DropdownMenuItemProps) {
  const { onOpenChange } = React.useContext(DropdownContext);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    onClick?.(e);
    onOpenChange(false);
  }

  return (
    <button
      type="button"
      role="menuitem"
      data-slot="dropdown-menu-item"
      className={cn(
        "flex w-full cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50",
        inset && "pl-8",
        className,
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// DropdownMenuSeparator
// ---------------------------------------------------------------------------

function DropdownMenuSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// DropdownMenuLabel
// ---------------------------------------------------------------------------

function DropdownMenuLabel({
  className,
  inset,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }) {
  return (
    <div
      data-slot="dropdown-menu-label"
      className={cn(
        "px-2 py-1.5 text-xs font-semibold text-muted-foreground",
        inset && "pl-8",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
};
