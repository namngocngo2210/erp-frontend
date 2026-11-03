import { type ReactNode } from "react";

// ─────────────────────────────────────────────────────────────
// Lightweight Tabs — không cần Radix UI
// ─────────────────────────────────────────────────────────────

export type TabItem = {
  key: string;
  label: ReactNode;
  content: ReactNode;
};

type TabsProps = {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
  /** Gắn `data-main-content` lên panel (ui-check đo tỉ lệ "nội dung chính"). */
  mainContentPanel?: boolean;
};

export function Tabs({ tabs, active, onChange, className = "", mainContentPanel }: TabsProps) {
  return (
    <div className={`flex h-full min-h-0 flex-col ${className}`}>
      {/* Tab bar */}
      <div className="flex shrink-0 gap-0 overflow-x-auto border-b border-border bg-background">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={[
                "relative flex shrink-0 items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors",
                "focus:outline-hidden",
                isActive
                  ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-t"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
              ].join(" ")}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active panel — key theo tab để fade lại mỗi lần chuyển tab */}
      <div
        key={active}
        data-main-content={mainContentPanel || undefined}
        className="min-h-0 flex-1 overflow-y-auto animate-in fade-in-0 duration-200 ease-out"
      >
        {tabs.find((t) => t.key === active)?.content}
      </div>
    </div>
  );
}
