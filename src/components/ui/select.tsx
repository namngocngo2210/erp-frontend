import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";
import { ChevronDownIcon, CheckIcon } from "lucide-react";

interface SelectContextType {
  value?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  contentRef?: React.RefObject<HTMLDivElement | null>;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
  /** id của listbox — trigger trỏ tới qua aria-controls. */
  contentId?: string;
  /** Map value -> nhãn hiển thị, quét từ các <SelectItem> con. Dùng cho SelectValue. */
  valueLabelMap?: Map<string, React.ReactNode>;
  /** Item đang được tô bằng bàn phím (↑/↓) khi listbox mở. */
  highlighted?: string;
  setHighlighted?: (value: string | undefined) => void;
}

/** id DOM của item — trigger trỏ tới qua aria-activedescendant. */
const itemId = (contentId: string | undefined, value: string) =>
  `${contentId ?? "select"}-item-${encodeURIComponent(value)}`;

const SelectContext = React.createContext<SelectContextType>({});

/**
 * Quét cây children tìm mọi <SelectItem> và lập map value -> nhãn (children của item).
 * Chạy thuần trên element tree nên hoạt động cả khi dropdown đóng (items chưa mount).
 */
function collectItemLabels(children: React.ReactNode, map: Map<string, React.ReactNode>): void {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === SelectItem) {
      const { value, children: label } = child.props as {
        value: string;
        children: React.ReactNode;
      };
      map.set(value, label);
      return;
    }
    const nested = (child.props as { children?: React.ReactNode }).children;
    if (nested) collectItemLabels(nested, map);
  });
}

const Select: React.FC<{
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ value, onValueChange, className, disabled, children }) => {
  const [open, setOpen] = React.useState(false);
  const [highlighted, setHighlighted] = React.useState<string | undefined>(undefined);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const contentId = React.useId();

  const valueLabelMap = React.useMemo(() => {
    const map = new Map<string, React.ReactNode>();
    collectItemLabels(children, map);
    return map;
  }, [children]);

  React.useEffect(() => {
    if (!open) return;

    const handlePointerDownOutside = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      const isInsideRoot = rootRef.current.contains(target);
      const isInsideContent = contentRef.current?.contains(target) ?? false;
      if (!isInsideRoot && !isInsideContent) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
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
  }, [open]);

  return (
    <SelectContext.Provider
      value={{
        value,
        onValueChange,
        open,
        onOpenChange: setOpen,
        disabled,
        contentRef,
        triggerRef,
        contentId,
        valueLabelMap,
        highlighted,
        setHighlighted,
      }}
    >
      <div ref={rootRef} data-slot="select" className={cn("relative", className)}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};

function SelectGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function SelectValue({
  className,
  placeholder,
  children,
}: {
  className?: string;
  placeholder?: string;
  children?: React.ReactNode;
}) {
  const context = React.useContext(SelectContext);
  // Ưu tiên children (override thủ công); nếu không, tra NHÃN của item đang chọn
  // (không phải value thô); cuối cùng mới đến placeholder.
  const selectedLabel =
    context.value !== undefined && context.value !== ""
      ? context.valueLabelMap?.get(context.value)
      : undefined;
  const display = children ?? selectedLabel ?? placeholder;
  const isPlaceholder = children == null && (selectedLabel === undefined || selectedLabel === null);
  return (
    <span className={cn(isPlaceholder ? "text-muted-foreground" : "text-foreground", className)}>
      {display}
    </span>
  );
}

function SelectTrigger({ className, children, ...props }: React.ComponentProps<"button">) {
  const context = React.useContext(SelectContext);

  return (
    <button
      ref={context.triggerRef}
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      data-slot="select-trigger"
      disabled={context.disabled}
      className={cn(
        "flex w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-background py-2 px-3 pointer-coarse:h-11 text-sm whitespace-nowrap text-foreground transition-colors outline-hidden select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      onClick={() => {
        if (context.disabled) return;
        context.setHighlighted?.(context.value);
        context.onOpenChange?.(!context.open);
      }}
      onKeyDown={(event) => {
        if (context.disabled) return;
        const values = Array.from(
          context.contentRef?.current?.querySelectorAll<HTMLElement>(
            '[data-slot="select-item"]:not([data-disabled])',
          ) ?? [],
        ).map((el) => el.dataset.value ?? "");
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          if (!context.open) {
            context.setHighlighted?.(context.value);
            context.onOpenChange?.(true);
            return;
          }
          if (values.length === 0) return;
          const current = values.indexOf(context.highlighted ?? "");
          const step = event.key === "ArrowDown" ? 1 : -1;
          const next =
            current < 0
              ? step > 0
                ? 0
                : values.length - 1
              : (current + step + values.length) % values.length;
          context.setHighlighted?.(values[next]);
          return;
        }
        if ((event.key === "Enter" || event.key === " ") && context.open) {
          const target = context.highlighted;
          if (target !== undefined && values.includes(target)) {
            event.preventDefault();
            context.onValueChange?.(target);
            context.onOpenChange?.(false);
          }
        }
      }}
      aria-expanded={context.open ?? false}
      aria-controls={context.open ? context.contentId : undefined}
      aria-activedescendant={
        context.open && context.highlighted !== undefined
          ? itemId(context.contentId, context.highlighted)
          : undefined
      }
      {...props}
    >
      {children}
      <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
    </button>
  );
}

function SelectContent({ className, children, ...props }: React.ComponentProps<"div">) {
  const context = React.useContext(SelectContext);
  const [contentStyle, setContentStyle] = React.useState<React.CSSProperties>({
    position: "fixed",
    left: 0,
    top: 0,
    minWidth: 128,
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
    const contentWidth = Math.max(triggerRect.width, contentRect.width || 128);
    const contentHeight = contentRect.height || 0;

    let left = triggerRect.left;
    if (left + contentWidth > viewportWidth - 8) {
      left = Math.max(8, viewportWidth - contentWidth - 8);
    }

    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    const shouldOpenUp =
      contentHeight > 0 && spaceBelow < contentHeight + spacing && spaceAbove > spaceBelow;
    const top = shouldOpenUp
      ? Math.max(8, triggerRect.top - contentHeight - spacing)
      : Math.min(viewportHeight - contentHeight - 8, triggerRect.bottom + spacing);

    setContentStyle({
      position: "fixed",
      left,
      top,
      minWidth: triggerRect.width,
      zIndex: 9999,
    });
  }, [context.contentRef, context.triggerRef]);

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
      id={context.contentId}
      data-slot="select-content"
      role="listbox"
      className={cn(
        "max-h-96 min-w-32 overflow-y-auto overflow-x-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
        className,
      )}
      {...props}
    >
      {children}
    </div>,
    document.body,
  );
}

function SelectLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="select-label"
      className={cn("px-1.5 py-1 text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  value,
  ...props
}: React.ComponentProps<"div"> & { value: string }) {
  const context = React.useContext(SelectContext);
  const isSelected = context.value === value;
  const isHighlighted = context.highlighted === value;
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isHighlighted && typeof ref.current?.scrollIntoView === "function") {
      ref.current.scrollIntoView({ block: "nearest" });
    }
  }, [isHighlighted]);

  return (
    <div
      ref={ref}
      id={itemId(context.contentId, value)}
      data-slot="select-item"
      data-value={value}
      data-selected={isSelected}
      data-highlighted={isHighlighted || undefined}
      role="option"
      aria-selected={isSelected}
      onMouseEnter={() => context.setHighlighted?.(value)}
      className={cn(
        "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1.5 pr-8 pl-2 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      onClick={() => {
        context.onValueChange?.(value);
        context.onOpenChange?.(false);
      }}
      {...props}
    >
      <span className="flex flex-1 gap-2 whitespace-nowrap">{children}</span>
      {isSelected && (
        <span className="absolute right-2 flex size-4 items-center justify-center">
          <CheckIcon className="pointer-events-none size-4" />
        </span>
      )}
    </div>
  );
}

function SelectSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="select-scroll-up-button"
      className={cn(
        "top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1",
        className,
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </div>
  );
}

function SelectScrollDownButton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="select-scroll-down-button"
      className={cn(
        "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1",
        className,
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </div>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
