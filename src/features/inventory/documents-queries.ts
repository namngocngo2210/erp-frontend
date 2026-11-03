import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchBlob, fetchJson } from "@/services/http";
import type {
  CreateStockDocumentPayload,
  StockDocumentAttachment,
  StockDocumentRow,
} from "@/features/inventory/documents-types";

const DOCS_BASE = "/api/inventory/documents";

export const documentKeys = {
  list: (filters: Record<string, string>) => ["inventory", "documents", filters] as const,
  detail: (id: number) => ["inventory", "documents", "detail", id] as const,
};

/**
 * Tải file Excel của MỘT phiếu kho.
 *
 * Không dùng React Query: đây là tác vụ tải file một lần, không có state để
 * cache — cùng khuôn với `downloadAttachment` của `AttachmentsSection`.
 */
export async function downloadStockDocumentExcel(id: number, code: string) {
  const blob = await fetchBlob(`${DOCS_BASE}/${id}/export`);
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `phieu-kho-${code || id}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export function useStockDocument(id: number | null) {
  return useQuery({
    queryKey: documentKeys.detail(id ?? 0),
    queryFn: () => fetchJson(`${DOCS_BASE}/${id}`) as Promise<StockDocumentRow>,
    enabled: id != null,
  });
}

export function useCreateStockDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStockDocumentPayload) =>
      fetchJson(DOCS_BASE, {
        method: "POST",
        body: JSON.stringify(payload),
      }) as Promise<StockDocumentRow>,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["inventory", "documents"] });
      void qc.invalidateQueries({ queryKey: ["inventory", "ledger"] });
    },
  });
}

export function useUpdateStockDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CreateStockDocumentPayload }) =>
      fetchJson(`${DOCS_BASE}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }) as Promise<StockDocumentRow>,
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ["inventory", "documents"] });
      void qc.invalidateQueries({ queryKey: documentKeys.detail(vars.id) });
      void qc.invalidateQueries({ queryKey: ["inventory", "ledger"] });
    },
  });
}

export function useUploadAttachments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, files }: { id: number; files: File[] }) => {
      const form = new FormData();
      for (const f of files) form.append("files", f);
      return fetchJson(`${DOCS_BASE}/${id}/attachments`, {
        method: "POST",
        body: form,
      }) as Promise<StockDocumentAttachment[]>;
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ["inventory", "documents"] });
      void qc.invalidateQueries({ queryKey: documentKeys.detail(vars.id) });
    },
  });
}

export function useDeleteAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ attachmentId }: { attachmentId: number; documentId: number }) =>
      fetchJson(`${DOCS_BASE}/attachments/${attachmentId}`, { method: "DELETE" }),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ["inventory", "documents"] });
      void qc.invalidateQueries({ queryKey: documentKeys.detail(vars.documentId) });
    },
  });
}

export function useSubmitStockDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetchJson(`${DOCS_BASE}/${id}/submit`, { method: "POST" }) as Promise<StockDocumentRow>,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["inventory", "documents"] });
      void qc.invalidateQueries({ queryKey: ["inventory", "stock"] });
    },
  });
}

export function useApproveStockDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetchJson(`${DOCS_BASE}/${id}/approve`, { method: "POST" }) as Promise<StockDocumentRow>,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["inventory", "documents"] });
      void qc.invalidateQueries({ queryKey: ["inventory", "stock"] });
    },
  });
}

export function useRejectStockDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      fetchJson(`${DOCS_BASE}/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }) as Promise<StockDocumentRow>,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["inventory", "documents"] });
    },
  });
}

export function useCancelStockDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetchJson(`${DOCS_BASE}/${id}/cancel`, {
        method: "POST",
      }) as Promise<StockDocumentRow>,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["inventory", "documents"] });
      void qc.invalidateQueries({ queryKey: ["inventory", "stock"] });
    },
  });
}
