import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Lightweight Accordion — không cần Radix UI, cùng phong cách với
// components/ui/tabs.tsx. Mặc định cho phép mở nhiều mục cùng lúc
// (type="multiple"), phù hợp panel cấu hình quyền theo nhóm field.
// ─────────────────────────────────────────────────────────────

type AccordionContextValue = {
  openItems: Set<string>;
  toggle: (value: string) => void;
};

const AccordionContext = React.createContext<AccordionContextValue | null>(null);
const AccordionItemContext = React.createContext<string>("");

function useAccordionContext(component: string): AccordionContextValue {
  const ctx = React.useContext(AccordionContext);
  if (!ctx) throw new Error(`<${component}> phải nằm trong <Accordion>.`);
  return ctx;
}

type AccordionProps = {
  type?: "single" | "multiple";
  defaultValue?: string[];
  className?: string;
  children: React.ReactNode;
};

function Accordion({ type = "multiple", defaultValue = [], className, children }: AccordionProps) {
  const [openItems, setOpenItems] = React.useState<Set<string>>(() => new Set(defaultValue));

  const toggle = React.useCallback(
    (value: string) => {
      setOpenItems((prev) => {
        const isOpen = prev.has(value);
        if (type === "single") return isOpen ? new Set() : new Set([value]);
        const next = new Set(prev);
        if (isOpen) next.delete(value);
        else next.add(value);
        return next;
      });
    },
    [type],
  );

  const value = React.useMemo(() => ({ openItems, toggle }), [openItems, toggle]);

  return (
    <AccordionContext.Provider value={value}>
      <div className={cn("space-y-2", className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

type AccordionItemProps = {
  value: string;
  className?: string;
  children: React.ReactNode;
};

function AccordionItem({ value, className, children }: AccordionItemProps) {
  return (
    <AccordionItemContext.Provider value={value}>
      <div className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

type AccordionTriggerProps = {
  className?: string;
  children: React.ReactNode;
};

function AccordionTrigger({ className, children }: AccordionTriggerProps) {
  const { openItems, toggle } = useAccordionContext("AccordionTrigger");
  const value = React.useContext(AccordionItemContext);
  const isOpen = openItems.has(value);

  return (
    <button
      type="button"
      aria-expanded={isOpen}
      onClick={() => toggle(value)}
      className={cn(
        "flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors hover:bg-muted/40",
        className,
      )}
    >
      {children}
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
          isOpen && "rotate-180",
        )}
      />
    </button>
  );
}

type AccordionContentProps = {
  className?: string;
  children: React.ReactNode;
};

function AccordionContent({ className, children }: AccordionContentProps) {
  const { openItems } = useAccordionContext("AccordionContent");
  const value = React.useContext(AccordionItemContext);
  if (!openItems.has(value)) return null;

  return (
    <div className={cn("border-t border-border px-4 py-3 animate-in fade-in-0", className)}>
      {children}
    </div>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
