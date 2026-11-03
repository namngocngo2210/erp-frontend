import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { cancelExportJob, createExportJob, listExportJobs } from "@/features/exports/api";
import { handleApiError } from "@/lib/errors";
import { isActive, type ExportJob } from "@/features/exports/types";
import { getCRMWebSocket } from "@/services/websocket";

type ExportJobsContextValue = {
  jobs: ExportJob[];
  activeCount: number;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  startExport: (kind: string, params: unknown) => Promise<void>;
  cancel: (id: string) => Promise<void>;
  dismiss: (id: string) => void;
};

const ExportJobsContext = createContext<ExportJobsContextValue | null>(null);

// `allowConstantExport` trong eslint.config.js chỉ miễn literal string/number/boolean
// cho react-refresh/only-export-components — object expression như exportKeys vẫn bị
// bắt, nên phải tắt rule tay ở đây (không tách file được vì mọi nơi gọi startExport
// cần import chung provider + query key).
// eslint-disable-next-line react-refresh/only-export-components
export const exportKeys = {
  list: ["exports", "list"] as const,
};

/** Nhịp poll. Đường chính là WebSocket; poll chỉ là lưới an toàn khi WS rớt hoặc
 * người dùng vừa F5 — nên chỉ bật khi CÒN job đang chạy. */
const POLL_MS = 3000;

/**
 * Hàm thuần quyết định nhịp poll — tách riêng để test trực tiếp không cần dựng
 * React tree/giả lập timer. Đây là điểm rủi ro tải cao nhất của cả provider: nếu
 * lỡ trả một số thay vì `false` khi hết job active, mọi tab đang mở sẽ poll 3s vô
 * hạn — tái lập đúng loại tải đã gây sự cố "bão POST /api/orders" trước đây.
 * `items` undefined (lần fetch đầu chưa có data) cũng phải trả `false`, không poll.
 */
// eslint-disable-next-line react-refresh/only-export-components -- hàm thuần cần export để test, xem lý do ở exportKeys
export function pollIntervalFor(items: ExportJob[] | undefined): number | false {
  return (items ?? []).some(isActive) ? POLL_MS : false;
}

export function ExportJobsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isOpen, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const { data } = useQuery({
    queryKey: exportKeys.list,
    queryFn: () => listExportJobs(false),
    refetchInterval: (query) => pollIntervalFor(query.state.data),
  });

  const jobs = useMemo(
    () => (data ?? []).filter((job) => !dismissed.includes(job.id)),
    [data, dismissed],
  );

  useEffect(() => {
    const ws = getCRMWebSocket();
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: exportKeys.list });
    };
    ws.addEventListener("export.updated", handler);
    return () => ws.removeEventListener("export.updated", handler);
  }, [queryClient]);

  const startExport = useCallback(
    async (kind: string, params: unknown) => {
      try {
        const job = await createExportJob(kind, params);
        // Ghi thẳng vào cache thay vì chờ vòng poll kế: panel phải hiện NGAY khi bấm,
        // đó là toàn bộ mục đích của nó.
        queryClient.setQueryData<ExportJob[]>(exportKeys.list, (prev) => {
          const rest = (prev ?? []).filter((item) => item.id !== job.id);
          return [job, ...rest];
        });
        setDismissed((prev) => prev.filter((id) => id !== job.id));
        setOpen(true);
      } catch (error) {
        handleApiError(error, { toast: "Không thể xuất file.", context: "exports.startExport" });
      }
    },
    [queryClient],
  );

  const cancel = useCallback(
    async (id: string) => {
      await cancelExportJob(id);
      queryClient.invalidateQueries({ queryKey: exportKeys.list });
    },
    [queryClient],
  );

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const value = useMemo<ExportJobsContextValue>(
    () => ({
      jobs,
      activeCount: jobs.filter(isActive).length,
      isOpen,
      setOpen,
      startExport,
      cancel,
      dismiss,
    }),
    [jobs, isOpen, startExport, cancel, dismiss],
  );

  return <ExportJobsContext.Provider value={value}>{children}</ExportJobsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook đi kèm provider, xem lý do ở exportKeys
export function useExportJobs(): ExportJobsContextValue {
  const value = useContext(ExportJobsContext);
  if (value === null) {
    throw new Error("useExportJobs phải nằm trong ExportJobsProvider.");
  }
  return value;
}
