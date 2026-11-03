import { useState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/i18n";
import { downloadContentsExcel } from "@/lib/api/media";
import type { ContentTagsPayload, ContentUploadPayload, MediaContent } from "@/lib/api/media";

import {
  useCreateContent,
  useDeleteContent,
  useDuplicateContent,
  useImportContents,
  useUpdateMarketingInfo,
  useUpdateUploadInfo,
} from "./queries";

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Thao tác thất bại.";
}

/**
 * Wire các mutation ghi của Task 16 (tạo/sửa/nhân bản/xoá + sửa tag) vào state
 * dialog + toast. Tách khỏi MediaContentsPage cho gọn — trang chỉ cắm props.
 */
export function useContentActions(onDeleted?: (id: number) => void) {
  const { t } = useI18n();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MediaContent | null>(null);
  const [tagsTarget, setTagsTarget] = useState<MediaContent | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const createMutation = useCreateContent();
  const uploadMutation = useUpdateUploadInfo();
  const tagsMutation = useUpdateMarketingInfo();
  const duplicateMutation = useDuplicateContent();
  const deleteMutation = useDeleteContent();
  const importMutation = useImportContents();

  async function submitCreate(payload: ContentUploadPayload) {
    try {
      await createMutation.mutateAsync(payload);
      toast.success(t("media.toast.saved"));
      setCreateOpen(false);
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  async function submitEdit(payload: ContentUploadPayload) {
    if (!editTarget) return;
    try {
      await uploadMutation.mutateAsync({ id: editTarget.id, payload });
      toast.success(t("media.toast.saved"));
      setEditTarget(null);
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  async function submitTags(payload: ContentTagsPayload) {
    if (!tagsTarget) return;
    try {
      await tagsMutation.mutateAsync({ id: tagsTarget.id, payload });
      toast.success(t("media.toast.saved"));
      setTagsTarget(null);
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  /** Dialog import tự hiện bảng dòng lỗi nên ở đây chỉ trả kết quả, không toast. */
  function submitImport(file: File) {
    return importMutation.mutateAsync(file);
  }

  /** Xuất đúng bộ lọc đang xem; tải file nên không đi qua react-query. */
  async function exportExcel(params: URLSearchParams) {
    setExporting(true);
    try {
      await downloadContentsExcel(params);
    } catch (err) {
      toast.error(errMessage(err));
    } finally {
      setExporting(false);
    }
  }

  async function duplicate(content: MediaContent) {
    try {
      await duplicateMutation.mutateAsync(content.id);
      toast.success(t("media.toast.duplicated"));
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  async function remove(content: MediaContent) {
    try {
      await deleteMutation.mutateAsync(content.id);
      toast.success(t("media.toast.deleted"));
      onDeleted?.(content.id);
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  return {
    createOpen,
    setCreateOpen,
    editTarget,
    setEditTarget,
    tagsTarget,
    setTagsTarget,
    importOpen,
    setImportOpen,
    exporting,
    submitImport,
    exportExcel,
    submitCreate,
    submitEdit,
    submitTags,
    duplicate,
    remove,
  };
}
