import { KeyRound, Lock, Search, Shield, ShieldCheck } from "lucide-react";

import type { Role } from "@/lib/api/roles";
import { Input } from "@/components/ui/input";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { SCOPE_LABELS } from "../constants";

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  loading: boolean;
  roles: Role[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  /** Gắn `data-main-content` (danh sách là nội dung chính ở chế độ list mobile). */
  mainContent?: boolean;
};

export function RoleListSidebar({
  query,
  onQueryChange,
  loading,
  roles,
  selectedId,
  onSelect,
  mainContent,
}: Props) {
  return (
    <aside className="flex min-h-0 flex-col rounded-xl border border-border bg-card">
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Tìm vai trò..."
            className="pl-8"
          />
        </div>
      </div>
      <div
        data-main-content={mainContent || undefined}
        className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2"
      >
        {loading ? (
          <div className="flex justify-center py-12">
            <LogoSpinner label="Đang tải..." />
          </div>
        ) : roles.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            Không có vai trò phù hợp.
          </p>
        ) : (
          roles.map((r) => {
            const active = r.id === selectedId;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onSelect(r.id)}
                className={[
                  "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition",
                  active
                    ? "border-primary/40 bg-primary/10 ring-1 ring-primary/30"
                    : "border-transparent hover:bg-accent",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    r.is_system ? "bg-amber-100 text-amber-600" : "bg-primary/10 text-primary",
                  ].join(" ")}
                >
                  {r.is_system ? (
                    <ShieldCheck className="h-4 w-4" />
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-foreground">{r.name}</span>
                    {r.is_system && <Lock className="h-3 w-3 shrink-0 text-amber-500" />}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <KeyRound className="h-3 w-3" />
                    {(r.permission_codes ?? []).length} quyền ·{" "}
                    {SCOPE_LABELS[r.scope_default] ?? r.scope_default}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
