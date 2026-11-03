import { useState } from "react";
import { Columns3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ColumnManager } from "@/components/column-manager/ColumnManager";
import {
  WARRANTY_COLUMN_GROUPS,
  WARRANTY_COLUMN_OPTIONS,
  type WarrantyColumnKey,
} from "@/features/warranty-claims/warranty-claim-columns";

type Props = {
  visibleColumns: WarrantyColumnKey[];
  lockedColumns: WarrantyColumnKey[];
  /** Cột đang hiện theo đúng thứ tự bảng (cột ghim xếp trước). */
  orderedColumns: WarrantyColumnKey[];
  toggleColumn: (key: WarrantyColumnKey) => void;
  toggleLock: (key: WarrantyColumnKey) => void;
  setColumns: (next: WarrantyColumnKey[]) => void;
  resetColumns: () => void;
};

/** Nút mở hộp thoại tuỳ chỉnh cột của trang bảo hành. */
export function WarrantyColumnPicker({
  lockedColumns,
  orderedColumns,
  toggleColumn,
  toggleLock,
  setColumns,
  resetColumns,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-9 border-border"
        onClick={() => setOpen(true)}
      >
        <Columns3 className="mr-2 h-4 w-4" />
        Cột
      </Button>
      <ColumnManager
        open={open}
        onOpenChange={setOpen}
        options={WARRANTY_COLUMN_OPTIONS}
        groups={WARRANTY_COLUMN_GROUPS}
        visible={orderedColumns}
        locked={lockedColumns}
        onToggle={toggleColumn}
        onSetColumns={setColumns}
        onToggleLock={toggleLock}
        onReset={resetColumns}
      />
    </>
  );
}
