import { useEffect, useState } from "react";
import { Check, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";

import { useAssignableUsers } from "../queries";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Gắn tài khoản đã chọn vào nhân sự; resolve khi xong. */
  onSubmit: (userId: number) => Promise<void>;
};

/**
 * Chọn một tài khoản đã tồn tại (chưa gắn nhân sự nào) để gán vào nhân sự hiện tại.
 * Khác với {@link EmployeeAccountCreateDialog} (tạo tài khoản mới).
 */
export function EmployeeAccountAssignDialog({ open, onOpenChange, onSubmit }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: users = [], isLoading } = useAssignableUsers(query, open);

  // Reset trạng thái mỗi lần mở lại.
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedId(null);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (selectedId === null) return;
    await onSubmit(selectedId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("hr.account.assignTitle", "Gán tài khoản có sẵn")}</DialogTitle>
          <DialogDescription>
            {t(
              "hr.account.assignDesc",
              "Chọn một tài khoản chưa gắn nhân sự nào để liên kết với nhân sự này.",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder={t("hr.account.assignSearch", "Tìm theo tên đăng nhập...")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="max-h-64 space-y-1 overflow-y-auto">
            {isLoading ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t("common.loading", "Đang tải...")}
              </p>
            ) : users.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t("hr.account.assignEmpty", "Không có tài khoản phù hợp.")}
              </p>
            ) : (
              users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedId(u.id)}
                  className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm ${
                    selectedId === u.id ? "border-primary bg-primary/5" : "hover:bg-muted"
                  }`}
                >
                  <span>
                    <span className="font-medium">{u.username}</span>
                    {u.display_name && (
                      <span className="ml-2 text-muted-foreground">{u.display_name}</span>
                    )}
                  </span>
                  {selectedId === u.id && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel", "Hủy")}
          </Button>
          <Button disabled={selectedId === null} onClick={handleConfirm}>
            {t("hr.account.assignConfirm", "Gán")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
