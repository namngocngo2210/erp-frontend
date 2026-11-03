import { useCallback } from "react";

import { useI18n } from "@/i18n";
import { useConfirm } from "@/hooks/use-confirm";

/**
 * Hỏi "bỏ thay đổi chưa lưu?" trước khi rời form/tab/panel. Trả hàm async:
 * `true` khi không có thay đổi hoặc người dùng đồng ý bỏ, `false` khi ở lại.
 *
 * Chỉ dùng cho điều hướng trong app. `beforeunload` (đóng tab/F5) bắt buộc
 * đồng bộ nên vẫn phải dùng hộp thoại native của trình duyệt.
 */
export function useUnsavedGuard(dirty: boolean, description?: string) {
  const confirm = useConfirm();
  const { t } = useI18n();
  return useCallback(async (): Promise<boolean> => {
    if (!dirty) return true;
    return confirm({
      title: t("common.unsaved.title", "Có thay đổi chưa lưu"),
      description:
        description ?? t("common.unsaved.description", "Rời đi sẽ bỏ các thay đổi chưa lưu."),
      confirmText: t("common.unsaved.discard", "Bỏ thay đổi"),
      cancelText: t("common.unsaved.stay", "Ở lại"),
      destructive: true,
    });
  }, [dirty, description, confirm, t]);
}
