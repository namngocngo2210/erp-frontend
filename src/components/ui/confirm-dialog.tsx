import * as React from "react";

import { useI18n } from "@/i18n";
import { ConfirmContext, type ConfirmFn, type ConfirmOptions } from "@/hooks/use-confirm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmDialogProps extends ConfirmOptions {
  open: boolean;
  onResolve: (ok: boolean) => void;
}

/** Hộp thoại xác nhận (alertdialog) — focus mặc định nút Huỷ để Enter không phá huỷ nhầm. */
function ConfirmDialog({
  open,
  onResolve,
  title,
  description,
  confirmText,
  cancelText,
  destructive = false,
}: ConfirmDialogProps) {
  const { t } = useI18n();
  const titleId = React.useId();
  const descriptionId = React.useId();
  const cancelRef = React.useRef<HTMLButtonElement | null>(null);
  const setCancelRef = React.useCallback((el: HTMLButtonElement | null) => {
    cancelRef.current = el;
    el?.focus();
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();
    // Bắt Escape ở capture phase và chặn lan truyền: nếu không, Sheet/Dialog
    // bên dưới cũng nhận Escape và đóng theo.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onResolve(false);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      previous?.focus();
    };
  }, [open, onResolve]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onResolve(false)}>
      <DialogContent
        size="confirm"
        role="alertdialog"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle id={titleId} className="leading-snug">
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription id={descriptionId}>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogFooter>
          <Button
            ref={setCancelRef}
            type="button"
            variant="outline"
            onClick={() => onResolve(false)}
          >
            {cancelText ?? t("common.cancel", "Hủy")}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={() => onResolve(true)}
          >
            {confirmText ??
              (destructive ? t("common.delete", "Xóa") : t("common.confirm", "Xác nhận"))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Cấp `useConfirm()` cho cây con. Gọi lần mới khi lần trước chưa trả lời thì
 * lần trước coi như Huỷ (`false`) — không bao giờ để Promise treo.
 */
function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  // Giữ options sau khi đóng để nội dung không nháy trống trong animation đóng.
  const [options, setOptions] = React.useState<ConfirmOptions>({ title: "" });
  const resolverRef = React.useRef<((ok: boolean) => void) | null>(null);

  const confirm = React.useCallback<ConfirmFn>(
    (next) =>
      new Promise<boolean>((resolve) => {
        resolverRef.current?.(false);
        resolverRef.current = resolve;
        setOptions(next);
        setOpen(true);
      }),
    [],
  );

  const handleResolve = React.useCallback((ok: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setOpen(false);
    resolve?.(ok);
  }, []);

  React.useEffect(() => () => resolverRef.current?.(false), []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog {...options} open={open} onResolve={handleResolve} />
    </ConfirmContext.Provider>
  );
}

export { ConfirmDialog, ConfirmProvider };
