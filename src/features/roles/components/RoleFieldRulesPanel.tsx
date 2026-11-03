import type { Dispatch, SetStateAction } from "react";
import { EyeOff, Info, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RULE_LABELS, sectionLabel } from "../constants";
import type { FieldRuleDraft } from "../role-draft";

type Props = {
  rules: FieldRuleDraft[];
  setRules: Dispatch<SetStateAction<FieldRuleDraft[]>>;
  allSections: string[];
  readOnly: boolean;
};

/** Tab "Ẩn field khi xem": quy tắc ẩn/khoá field nhạy cảm theo section. */
export function RoleFieldRulesPanel({ rules, setRules, allSections, readOnly }: Props) {
  const patchRule = (index: number, patch: Partial<FieldRuleDraft>) =>
    setRules((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <span>
          Ẩn hoặc khóa chỉnh sửa từng field nhạy cảm (vd: <code>phone</code>, giá vốn) theo vai trò.
          Quy tắc nới lỏng nhất sẽ thắng khi user có nhiều vai trò.
        </span>
      </div>

      {rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10 text-center">
          <EyeOff className="mb-2 h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Chưa có quy tắc field nào.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center"
            >
              <div className="sm:w-44">
                <Select
                  value={rule.section}
                  onValueChange={(v) => patchRule(index, { section: v })}
                  disabled={readOnly}
                >
                  <SelectTrigger className="h-9 w-full text-sm">
                    <SelectValue placeholder="Mục" />
                  </SelectTrigger>
                  <SelectContent>
                    {allSections.map((s) => (
                      <SelectItem key={s} value={s}>
                        {sectionLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                className="flex-1"
                value={rule.field}
                placeholder="Tên field (vd: phone, cost_price)"
                disabled={readOnly}
                onChange={(e) => patchRule(index, { field: e.target.value })}
              />
              <div className="sm:w-36">
                <Select
                  value={rule.rule}
                  onValueChange={(v) => patchRule(index, { rule: v })}
                  disabled={readOnly}
                >
                  <SelectTrigger className="h-9 w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RULE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        <span className="flex items-center gap-1.5">
                          <EyeOff className="h-3.5 w-3.5" />
                          {label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="icon-sm"
                variant="outline"
                disabled={readOnly}
                className="border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
                onClick={() => setRules((prev) => prev.filter((_, i) => i !== index))}
                title="Xóa quy tắc"
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <Button
          variant="outline"
          onClick={() =>
            setRules((prev) => [
              ...prev,
              { section: allSections[0] ?? "orders", field: "", rule: "hidden" },
            ])
          }
        >
          <Plus className="mr-1 h-4 w-4" />
          Thêm quy tắc field
        </Button>
      )}
    </div>
  );
}
