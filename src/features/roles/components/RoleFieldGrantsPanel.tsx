import { useMemo } from "react";
import { Info, TriangleAlert } from "lucide-react";

import type { OrderFieldCatalogGroup } from "@/lib/api/roles";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { groupState } from "../permission-logic";

type Props = {
  groups: OrderFieldCatalogGroup[];
  loading: boolean;
  grants: string[];
  onSetGrants: (grants: string[]) => void;
  onToggleField: (field: string) => void;
  onToggleGroup: (groupFields: string[]) => void;
  /** Role có orders:edit nhưng chưa cấp field nào → cảnh báo. */
  missingGrantsWarning: boolean;
  readOnly: boolean;
};

// Trả lời câu hỏi khác hẳn tab "Ẩn field khi xem": đây là được SỬA gì, không
// phải được XEM gì. Nguồn field/nhóm luôn nạp từ backend (order-field-catalog)
// — không hard-code ở FE.
export function RoleFieldGrantsPanel({
  groups,
  loading,
  grants,
  onSetGrants,
  onToggleField,
  onToggleGroup,
  missingGrantsWarning,
  readOnly,
}: Props) {
  const allCatalogFields = useMemo(
    () => groups.flatMap((g) => g.fields.map((f) => f.name)),
    [groups],
  );

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <span>
          Chọn field đơn hàng mà vai trò này được phép SỬA. Tick theo nhóm nghiệp vụ để cấp cả nhóm,
          hoặc tick lẻ từng field.
        </span>
      </div>

      {missingGrantsWarning && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Vai trò này sửa được đơn nhưng chưa được cấp field nào — người dùng sẽ không sửa được
            gì.
          </span>
        </div>
      )}

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={allCatalogFields.length === 0}
            onClick={() => onSetGrants(allCatalogFields)}
          >
            Chọn tất cả
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={grants.length === 0}
            onClick={() => onSetGrants([])}
          >
            Bỏ hết
          </Button>
          <span className="text-xs text-muted-foreground">
            Đã cấp {grants.length}/{allCatalogFields.length} field
          </span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <LogoSpinner label="Đang tải..." />
        </div>
      ) : groups.length === 0 ? (
        <p className="px-2 py-6 text-center text-sm text-muted-foreground">
          Không tải được danh mục field.
        </p>
      ) : (
        <Accordion type="multiple" defaultValue={groups.map((g) => g.code)}>
          {groups.map((group) => {
            const fieldNames = group.fields.map((f) => f.name);
            const state = groupState(grants, fieldNames);
            const grantedCount = fieldNames.filter((f) => grants.includes(f)).length;
            return (
              <AccordionItem key={group.code} value={group.code}>
                <div className="flex items-center gap-2 bg-muted/40 px-4 py-1">
                  <Checkbox
                    checked={state === "all" ? true : state === "partial" ? "indeterminate" : false}
                    onCheckedChange={() => onToggleGroup(fieldNames)}
                    disabled={readOnly}
                    aria-label={`Tick cả nhóm ${group.label}`}
                  />
                  <AccordionTrigger className="flex-1 px-0 py-2">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{group.label}</span>
                      <Badge
                        variant={
                          state === "all" ? "success" : state === "partial" ? "warning" : "outline"
                        }
                        className="tabular-nums"
                      >
                        {grantedCount}/{fieldNames.length}
                      </Badge>
                    </span>
                  </AccordionTrigger>
                </div>
                <AccordionContent className="space-y-1.5">
                  {group.fields.map((f) => {
                    const inputId = `field-grant-${group.code}-${f.name}`;
                    return (
                      <div key={f.name} className="flex items-center gap-2 py-1 text-sm">
                        <Checkbox
                          id={inputId}
                          checked={grants.includes(f.name)}
                          onCheckedChange={() => onToggleField(f.name)}
                          disabled={readOnly}
                        />
                        <label htmlFor={inputId} className="cursor-pointer text-foreground">
                          {f.label}{" "}
                          <span className="text-xs text-muted-foreground">({f.name})</span>
                        </label>
                      </div>
                    );
                  })}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
