import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { orderKeys } from "@/features/orders/queries";
import { fetchJson } from "@/services/http";

export type KshipNotePreset = {
  id: number;
  text: string;
  sort_order: number;
  created_by_username?: string;
};

type ListResponse = {
  items?: Array<Partial<KshipNotePreset>>;
  total?: number;
};

function normalizePreset(raw: Partial<KshipNotePreset> | undefined | null): KshipNotePreset | null {
  if (!raw || typeof raw !== "object") return null;
  const id = Number(raw.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  return {
    id,
    text: typeof raw.text === "string" ? raw.text : "",
    sort_order: Number.isFinite(Number(raw.sort_order)) ? Number(raw.sort_order) : 0,
    created_by_username: typeof raw.created_by_username === "string" ? raw.created_by_username : "",
  };
}

function sortPresets(list: KshipNotePreset[]): KshipNotePreset[] {
  return [...list].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

async function fetchPresetList(): Promise<KshipNotePreset[]> {
  const response = (await fetchJson("/api/orders/kship-note-presets", {
    method: "GET",
  })) as ListResponse;
  const items = Array.isArray(response?.items) ? response.items : [];
  return items.map(normalizePreset).filter((item): item is KshipNotePreset => item !== null);
}

/**
 * CRUD mẫu ghi chú KShip qua react-query. Chữ ký trả về giữ nguyên cho consumer
 * (KshipNotePresetPicker/ManageDialog): mutation cập nhật cache tại chỗ bằng
 * response server (như merge thủ công cũ) nên UI thấy thay đổi ngay, không đợi refetch.
 */
export function useKshipNotePresets() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: orderKeys.kshipNotePresets,
    queryFn: fetchPresetList,
  });

  const setCache = useCallback(
    (updater: (prev: KshipNotePreset[]) => KshipNotePreset[]) => {
      queryClient.setQueryData<KshipNotePreset[]>(orderKeys.kshipNotePresets, (prev) =>
        updater(prev ?? []),
      );
    },
    [queryClient],
  );

  const createMutation = useMutation({
    mutationFn: async (text: string): Promise<KshipNotePreset> => {
      const trimmed = (text || "").trim();
      if (!trimmed) throw new Error("Nội dung ghi chú không được để trống.");
      const response = await fetchJson("/api/orders/kship-note-presets", {
        method: "POST",
        body: JSON.stringify({ text: trimmed }),
      });
      const created = normalizePreset(response);
      if (!created) throw new Error("Phản hồi không hợp lệ.");
      return created;
    },
    onSuccess: (created) => {
      setCache((prev) => sortPresets([...prev, created]));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: number;
      patch: { text?: string; sort_order?: number };
    }): Promise<KshipNotePreset> => {
      const body: Record<string, unknown> = {};
      if (typeof patch.text === "string") body.text = patch.text.trim();
      if (typeof patch.sort_order === "number") body.sort_order = patch.sort_order;
      const response = await fetchJson(`/api/orders/kship-note-presets/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      const updated = normalizePreset(response);
      if (!updated) throw new Error("Phản hồi không hợp lệ.");
      return updated;
    },
    onSuccess: (updated, { id }) => {
      setCache((prev) => sortPresets(prev.map((item) => (item.id === id ? updated : item))));
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await fetchJson(`/api/orders/kship-note-presets/${id}`, { method: "DELETE" });
    },
    onSuccess: (_data, id) => {
      setCache((prev) => prev.filter((item) => item.id !== id));
    },
  });

  const { refetch, isFetching, isSuccess } = listQuery;

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Trước đây: chỉ load lần đầu nếu chưa từng load. useQuery đã tự fetch khi mount,
  // nên ensureLoaded giờ chỉ còn vai trò retry khi lần load đầu lỗi (mở lại popover).
  const ensureLoaded = useCallback(() => {
    if (isSuccess || isFetching) return;
    void refetch();
  }, [isSuccess, isFetching, refetch]);

  const { mutateAsync: createAsync } = createMutation;
  const { mutateAsync: updateAsync } = updateMutation;
  const { mutateAsync: removeAsync } = removeMutation;

  const create = useCallback(
    (text: string): Promise<KshipNotePreset> => createAsync(text),
    [createAsync],
  );

  const update = useCallback(
    (id: number, patch: { text?: string; sort_order?: number }): Promise<KshipNotePreset> =>
      updateAsync({ id, patch }),
    [updateAsync],
  );

  const remove = useCallback((id: number): Promise<void> => removeAsync(id), [removeAsync]);

  const error =
    listQuery.error instanceof Error && listQuery.error.message
      ? listQuery.error.message
      : listQuery.error
        ? "Không thể tải danh sách mẫu ghi chú."
        : "";

  return {
    presets: listQuery.data ?? [],
    loading: listQuery.isFetching,
    error,
    refresh,
    ensureLoaded,
    create,
    update,
    remove,
  };
}
