import { Layers } from "lucide-react";

import type { PermissionRow } from "@/lib/api/roles";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACTION_LABELS,
  SCOPE_LABELS,
  SCOPE_OPTIONS,
  SCOPE_SENTINEL_DEFAULT,
  sectionLabel,
} from "../constants";
import { countGroupCodes, type GroupedSection, type ModuleGroup } from "../role-draft";

type Props = {
  groupedSections: ModuleGroup[];
  draftCodes: Set<string>;
  draftScopes: Record<string, string>;
  scopeDefault: string;
  readOnly: boolean;
  onToggle: (code: string) => void;
  onToggleSection: (actions: PermissionRow[], on: boolean) => void;
  onToggleModuleGroup: (rows: GroupedSection[], on: boolean) => void;
  onSetScope: (section: string, scope: string) => void;
};

/** Tab "Quyền hạn": ma trận action theo section, gom theo module. */
export function RolePermissionsPanel({
  groupedSections,
  draftCodes,
  draftScopes,
  scopeDefault,
  readOnly,
  onToggle,
  onToggleSection,
  onToggleModuleGroup,
  onSetScope,
}: Props) {
  return (
    <div className="space-y-4 p-4">
      {groupedSections.map((group) => {
        const { total, on } = countGroupCodes(group.rows, draftCodes);
        const allOn = total > 0 && on === total;
        return (
          <div
            key={group.label}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">{group.label}</span>
                <span className="rounded-full bg-background px-2 py-0.5 text-2xs font-medium tabular-nums text-muted-foreground">
                  {on}/{total}
                </span>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => onToggleModuleGroup(group.rows, !allOn)}
                  className="text-xs font-medium text-primary transition hover:underline"
                >
                  {allOn ? "Bỏ chọn nhóm" : "Chọn cả nhóm"}
                </button>
              )}
            </div>
            <div className="divide-y divide-border">
              {group.rows.map(({ section, actions }) => {
                const secOn = actions.filter((a) => draftCodes.has(a.code)).length;
                const secAllOn = secOn === actions.length;
                return (
                  <div
                    key={section}
                    className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-36 items-center gap-2">
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => onToggleSection(actions, !secAllOn)}
                        className="text-left text-sm font-medium text-foreground hover:text-primary disabled:cursor-not-allowed"
                        title={secAllOn ? "Bỏ chọn toàn bộ action" : "Chọn toàn bộ action"}
                      >
                        {sectionLabel(section)}
                      </button>
                      {secOn > 0 && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-2xs font-medium tabular-nums text-primary">
                          {secOn}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-wrap items-center gap-1.5">
                      {actions.map((a) => {
                        const checked = draftCodes.has(a.code);
                        return (
                          <button
                            key={a.code}
                            type="button"
                            disabled={readOnly}
                            onClick={() => onToggle(a.code)}
                            className={[
                              "rounded-full border px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
                              checked
                                ? "border-primary bg-primary text-primary-foreground shadow-xs"
                                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                            ].join(" ")}
                          >
                            {ACTION_LABELS[a.action] ?? a.action}
                          </button>
                        );
                      })}
                    </div>
                    <div className="sm:w-44">
                      <Select
                        value={draftScopes[section] ?? SCOPE_SENTINEL_DEFAULT}
                        onValueChange={(v) => onSetScope(section, v)}
                        disabled={readOnly}
                      >
                        <SelectTrigger className="h-8 w-full text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SCOPE_SENTINEL_DEFAULT}>
                            Mặc định ({SCOPE_LABELS[scopeDefault]})
                          </SelectItem>
                          {SCOPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {SCOPE_LABELS[opt]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
