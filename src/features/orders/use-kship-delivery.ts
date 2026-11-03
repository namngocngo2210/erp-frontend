import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { type OrderRow } from "@/features/orders/order-types";
import {
  type KshipOptionsPayload,
  type KshipProviderOption,
  type KshipServiceExtraOption,
  type KshipServiceOption,
  type KshipShipperNoteOption,
} from "@/features/orders/use-orders-data";

export type KshipSelection = { providerCode: string; serviceCode: string };

export type SelectedKshipOrder = {
  id: number;
  invoiceCode: string;
  name: string;
  phone: string;
  address: string;
  totalAmount: string;
  weight: string;
  dimensions: string;
};

export type UseKshipDeliveryParams = {
  rows: OrderRow[];
  onFetchKshipOptions: (ids: number[]) => Promise<KshipOptionsPayload>;
  onCreateKshipDelivery: (
    ids: number[],
    providerCode: string,
    serviceCode: string,
    notes?: Record<number, string>,
    senderAddressId?: number | null,
    shipperNotes?: Record<number, string>,
    serviceExtra?: Record<string, string>,
  ) => Promise<{ created_count: number; detail: string }>;
  t: (key: string, fallback?: string) => string;
};

export type UseKshipDeliveryReturn = {
  createKshipCodeModalOpen: boolean;
  setCreateKshipCodeModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedOrderIdsForKship: number[];
  kshipOptionsLoading: boolean;
  kshipOptionsError: string;
  kshipProviders: KshipProviderOption[];
  kshipServices: KshipServiceOption[];
  kshipSelections: Record<number, KshipSelection>;
  setKshipSelections: React.Dispatch<React.SetStateAction<Record<number, KshipSelection>>>;
  kshipNotes: Record<number, string>;
  setKshipNotes: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  kshipBulkProvider: string;
  setKshipBulkProvider: React.Dispatch<React.SetStateAction<string>>;
  kshipBulkService: string;
  setKshipBulkService: React.Dispatch<React.SetStateAction<string>>;
  kshipBulkNote: string;
  setKshipBulkNote: React.Dispatch<React.SetStateAction<string>>;
  kshipShipperNoteOptions: KshipShipperNoteOption[];
  kshipShipperNotes: Record<number, string>;
  setKshipShipperNotes: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  kshipBulkShipperNote: string;
  setKshipBulkShipperNote: React.Dispatch<React.SetStateAction<string>>;
  kshipSenderAddressId: number | null;
  setKshipSenderAddressId: React.Dispatch<React.SetStateAction<number | null>>;
  /** Mục SERVICE_EXTRA hãng bắt buộc cho đúng hãng+dịch vụ sẽ gửi đi (rỗng với BEST/GHN/J&T). */
  kshipRequiredServiceExtras: KshipServiceExtraOption[];
  kshipServiceExtraValues: Record<string, string>;
  setKshipServiceExtraValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  selectedKshipOrders: SelectedKshipOrder[];
  allKshipRowsConfigured: boolean;
  getKshipServicesByProvider: (providerCode: string) => KshipServiceOption[];
  handleOpenCreateKshipCodeModal: (ids: number[]) => Promise<void>;
  handleChangeKshipProvider: (orderId: number, providerCode: string) => void;
  handleChangeKshipService: (orderId: number, serviceCode: string) => void;
  handleSubmitKshipDelivery: () => Promise<void>;
};

/**
 * Owns the "Tạo mã vận đơn KShip" dialog cluster previously inlined in OrdersPage.
 * Behaviour is intentionally identical: same in-flight/options cache keyed by
 * sorted ids, same default selection seeding and reset-on-close effect.
 */
export function useKshipDelivery({
  rows,
  onFetchKshipOptions,
  onCreateKshipDelivery,
  t,
}: UseKshipDeliveryParams): UseKshipDeliveryReturn {
  const [createKshipCodeModalOpen, setCreateKshipCodeModalOpen] = useState(false);
  const [selectedOrderIdsForKship, setSelectedOrderIdsForKship] = useState<number[]>([]);
  const [kshipOptionsLoading, setKshipOptionsLoading] = useState(false);
  const [kshipOptionsError, setKshipOptionsError] = useState("");
  const [kshipProviders, setKshipProviders] = useState<KshipProviderOption[]>([]);
  const [kshipServices, setKshipServices] = useState<KshipServiceOption[]>([]);
  const [kshipSelections, setKshipSelections] = useState<Record<number, KshipSelection>>({});
  const [kshipNotes, setKshipNotes] = useState<Record<number, string>>({});
  const [kshipBulkProvider, setKshipBulkProvider] = useState("");
  const [kshipBulkService, setKshipBulkService] = useState("");
  const [kshipBulkNote, setKshipBulkNote] = useState("");
  const [kshipShipperNoteOptions, setKshipShipperNoteOptions] = useState<KshipShipperNoteOption[]>(
    [],
  );
  const [kshipShipperNotes, setKshipShipperNotes] = useState<Record<number, string>>({});
  const [kshipBulkShipperNote, setKshipBulkShipperNote] = useState("");
  const [kshipSenderAddressId, setKshipSenderAddressId] = useState<number | null>(null);
  const [kshipServiceExtras, setKshipServiceExtras] = useState<KshipServiceExtraOption[]>([]);
  const [kshipServiceExtraValues, setKshipServiceExtraValues] = useState<Record<string, string>>(
    {},
  );
  const kshipOptionsCacheRef = useRef<Map<string, KshipOptionsPayload>>(new Map());
  const kshipOptionsInFlightRef = useRef<Map<string, Promise<KshipOptionsPayload>>>(new Map());

  const selectedKshipOrders = useMemo(
    () =>
      selectedOrderIdsForKship.map((id) => {
        const matched = rows.find((item) => item.id === id);
        return {
          id,
          invoiceCode: matched?.invoice_code || "",
          name: matched?.name || "",
          phone: matched?.phone || "",
          address: matched?.raw_address || matched?.address || "",
          totalAmount: matched?.total_amount || "",
          weight: matched?.weight || "",
          dimensions: matched?.dimensions || "",
        };
      }),
    [rows, selectedOrderIdsForKship],
  );
  // Ô chọn nằm cùng hàng với ô hãng CHUNG nhưng giá trị gửi đi lại lấy theo lựa chọn
  // của TỪNG đơn, và hàng chung chỉ ghi xuống đơn khi bấm "Áp dụng tất cả". Nếu chỉ
  // bám một trong hai thì đổi hãng ở chỗ còn lại sẽ không thấy ô ca hiện ra. Gộp cả
  // hai nguồn: thà hiện thừa (giá trị không dùng tới thì backend bỏ qua) còn hơn giấu
  // mất một mục hãng bắt buộc.
  const kshipRequiredServiceExtras = useMemo(() => {
    const pairs = [
      { providerCode: kshipBulkProvider, serviceCode: kshipBulkService },
      ...selectedOrderIdsForKship.map((id) => kshipSelections[id]),
    ];
    const seen = new Set<string>();
    const matched: KshipServiceExtraOption[] = [];
    for (const pair of pairs) {
      if (!pair?.providerCode || !pair?.serviceCode) continue;
      for (const item of kshipServiceExtras) {
        if (item.provider_code !== pair.providerCode) continue;
        if (item.service_code !== pair.serviceCode) continue;
        if (seen.has(item.code)) continue;
        seen.add(item.code);
        matched.push(item);
      }
    }
    return matched;
  }, [
    kshipBulkProvider,
    kshipBulkService,
    kshipSelections,
    kshipServiceExtras,
    selectedOrderIdsForKship,
  ]);

  // Mặc định ca đầu tiên (KShip trả theo thứ tự sớm → muộn), và bỏ giá trị của hãng
  // vừa bị đổi đi để không gửi nhầm ca của hãng khác.
  useEffect(() => {
    setKshipServiceExtraValues((prev) => {
      const next: Record<string, string> = {};
      let changed = Object.keys(prev).length !== kshipRequiredServiceExtras.length;
      for (const extra of kshipRequiredServiceExtras) {
        const current = prev[extra.code] || "";
        const stillOffered = extra.options.some((option) => option.value === current);
        next[extra.code] = stillOffered ? current : extra.options[0]?.value || "";
        if (next[extra.code] !== current) changed = true;
      }
      return changed ? next : prev;
    });
  }, [kshipRequiredServiceExtras]);

  const allKshipRowsConfigured = useMemo(
    () =>
      selectedOrderIdsForKship.length > 0 &&
      selectedOrderIdsForKship.every((id) => {
        const selection = kshipSelections[id];
        return Boolean(selection?.providerCode && selection?.serviceCode);
      }) &&
      kshipRequiredServiceExtras.every((extra) => Boolean(kshipServiceExtraValues[extra.code])),
    [
      kshipRequiredServiceExtras,
      kshipSelections,
      kshipServiceExtraValues,
      selectedOrderIdsForKship,
    ],
  );
  const getKshipServicesByProvider = useCallback(
    (providerCode: string) => kshipServices.filter((item) => item.provider_code === providerCode),
    [kshipServices],
  );

  const getKshipOptionsCacheKey = useCallback((ids: number[]): string => {
    const normalizedIds = Array.from(
      new Set(
        ids
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value) && value > 0)
          .map((value) => Math.trunc(value)),
      ),
    );
    return `ids:${normalizedIds.sort((a, b) => a - b).join(",")}`;
  }, []);

  useEffect(() => {
    if (createKshipCodeModalOpen) return;
    setKshipOptionsError("");
    setKshipOptionsLoading(false);
    setKshipProviders([]);
    setKshipServices([]);
    setKshipSelections({});
    setKshipNotes({});
    setKshipBulkProvider("");
    setKshipBulkService("");
    setKshipBulkNote("");
    setKshipShipperNoteOptions([]);
    setKshipShipperNotes({});
    setKshipBulkShipperNote("");
    setKshipServiceExtras([]);
    setKshipServiceExtraValues({});
    setKshipSenderAddressId(null);
    setSelectedOrderIdsForKship([]);
  }, [createKshipCodeModalOpen]);

  const handleOpenCreateKshipCodeModal = useCallback(
    async (ids: number[]) => {
      const normalizedIds = Array.from(
        new Set(
          ids
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && value > 0)
            .map((value) => Math.trunc(value)),
        ),
      );
      if (normalizedIds.length === 0) return;

      // Đơn đã có mã vận đơn thì KHÔNG mở dialog: KShip không có khoá chống trùng nên
      // tạo lại là sinh vận đơn thật thứ hai bên hãng vận chuyển (mất phí thật, mã cũ
      // mồ côi vì Order chỉ giữ được một shipping_code). Backend cũng chặn — lớp này
      // chỉ để người dùng biết ngay đơn nào vướng thay vì đọc lỗi 400 chung.
      // Khác `invoice_code` ở chỗ `shipping_code` một khi đã có thì không mất đi, nên
      // state cũ chỉ có thể thiếu mã chứ không thể thừa: chặn nhầm là không xảy ra.
      const blockedIds = normalizedIds.filter((id) =>
        Boolean(rows.find((item) => item.id === id)?.shipping_code?.trim()),
      );
      if (blockedIds.length > 0) {
        toast.error(
          t(
            "orders.kiotviet.createKshipShippingCodeAlreadyHasCode",
            "Đơn đã có mã vận đơn. Tạo lại sẽ sinh vận đơn thứ hai trên hãng vận chuyển.",
          ).replace("{ids}", blockedIds.join(", ")),
        );
        return;
      }

      // Backend validates invoice_code; skip frontend check to avoid stale state after push
      setKshipOptionsLoading(true);
      setKshipOptionsError("");

      try {
        const cacheKey = getKshipOptionsCacheKey(normalizedIds);
        let payload = kshipOptionsCacheRef.current.get(cacheKey);

        if (!payload) {
          let inFlight = kshipOptionsInFlightRef.current.get(cacheKey);
          if (!inFlight) {
            inFlight = onFetchKshipOptions(normalizedIds);
            kshipOptionsInFlightRef.current.set(cacheKey, inFlight);
          }
          try {
            payload = await inFlight;
            kshipOptionsCacheRef.current.set(cacheKey, payload);
          } finally {
            kshipOptionsInFlightRef.current.delete(cacheKey);
          }
        }
        if (!payload) {
          throw new Error(
            t("orders.kiotviet.createKshipShippingCodeLoadFailed", "Không thể tải dữ liệu KShip."),
          );
        }

        const providers = Array.isArray(payload.providers) ? payload.providers : [];
        const services = Array.isArray(payload.services) ? payload.services : [];
        const shipperNoteOptions = Array.isArray(payload.shipper_notes)
          ? payload.shipper_notes
          : [];
        const serviceExtras = Array.isArray(payload.service_extras) ? payload.service_extras : [];
        setSelectedOrderIdsForKship(normalizedIds);
        setKshipProviders(providers);
        setKshipServices(services);
        setKshipShipperNoteOptions(shipperNoteOptions);
        setKshipServiceExtras(serviceExtras);
        const defaultProviderCode = providers[0]?.code || "";
        const defaultServiceCode =
          services.find((item) => item.provider_code === defaultProviderCode)?.code || "";
        // Backend đánh dấu is_default; option đầu chỉ là lưới an toàn khi cờ bị thiếu.
        const defaultShipperNote =
          shipperNoteOptions.find((item) => item.is_default)?.code ||
          shipperNoteOptions[0]?.code ||
          "";
        const nextSelections: Record<number, KshipSelection> = {};
        const nextShipperNotes: Record<number, string> = {};
        for (const orderId of normalizedIds) {
          nextSelections[orderId] = {
            providerCode: defaultProviderCode,
            serviceCode: defaultServiceCode,
          };
          nextShipperNotes[orderId] = defaultShipperNote;
        }
        setKshipSelections(nextSelections);
        setKshipShipperNotes(nextShipperNotes);
        setKshipBulkShipperNote(defaultShipperNote);
        setCreateKshipCodeModalOpen(true);
      } catch (error) {
        const detail =
          error instanceof Error && error.message
            ? error.message
            : t(
                "orders.kiotviet.createKshipShippingCodeLoadFailed",
                "Không thể tải dữ liệu KShip.",
              );
        setCreateKshipCodeModalOpen(false);
        setSelectedOrderIdsForKship([]);
        setKshipProviders([]);
        setKshipServices([]);
        setKshipSelections({});
        setKshipNotes({});
        setKshipBulkProvider("");
        setKshipBulkService("");
        setKshipBulkNote("");
        setKshipShipperNoteOptions([]);
        setKshipShipperNotes({});
        setKshipBulkShipperNote("");
        setKshipServiceExtras([]);
        setKshipServiceExtraValues({});
        setKshipOptionsError("");
        toast.error(detail);
      } finally {
        setKshipOptionsLoading(false);
      }
    },
    [getKshipOptionsCacheKey, onFetchKshipOptions, rows, t],
  );

  const handleChangeKshipProvider = useCallback(
    (orderId: number, providerCode: string) => {
      setKshipSelections((prev) => {
        const current = prev[orderId] || { providerCode: "", serviceCode: "" };
        const nextServices = getKshipServicesByProvider(providerCode);
        const keepCurrentService = nextServices.some((item) => item.code === current.serviceCode);
        return {
          ...prev,
          [orderId]: {
            providerCode,
            serviceCode: keepCurrentService ? current.serviceCode : nextServices[0]?.code || "",
          },
        };
      });
    },
    [getKshipServicesByProvider],
  );

  const handleChangeKshipService = useCallback((orderId: number, serviceCode: string) => {
    setKshipSelections((prev) => ({
      ...prev,
      [orderId]: {
        providerCode: prev[orderId]?.providerCode || "",
        serviceCode,
      },
    }));
  }, []);

  const handleSubmitKshipDelivery = useCallback(async () => {
    try {
      // Get the first order's provider and service code
      // (Assuming all orders use the same provider and service for now)
      const firstOrderId = selectedOrderIdsForKship[0];
      const firstSelection = kshipSelections[firstOrderId];
      const providerCode = firstSelection?.providerCode || "";
      const serviceCode = firstSelection?.serviceCode || "";

      const result = await onCreateKshipDelivery(
        selectedOrderIdsForKship,
        providerCode,
        serviceCode,
        kshipNotes,
        kshipSenderAddressId,
        kshipShipperNotes,
        kshipServiceExtraValues,
      );
      toast.success(
        t(
          "orders.kiotviet.createKshipShippingCodeSuccess",
          "Đã thêm {count} đơn vào hàng đợi tạo mã vận đơn KShip.",
        ).replace("{count}", String(result.created_count)),
      );
      setCreateKshipCodeModalOpen(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error && error.message
          ? error.message
          : t("orders.kiotviet.createKshipShippingCodeFailed", "Tạo mã vận đơn KShip thất bại.");
      toast.error(errorMessage);
    }
  }, [
    kshipNotes,
    kshipSelections,
    kshipSenderAddressId,
    kshipServiceExtraValues,
    kshipShipperNotes,
    onCreateKshipDelivery,
    selectedOrderIdsForKship,
    t,
  ]);

  return {
    createKshipCodeModalOpen,
    setCreateKshipCodeModalOpen,
    selectedOrderIdsForKship,
    kshipOptionsLoading,
    kshipOptionsError,
    kshipProviders,
    kshipServices,
    kshipSelections,
    setKshipSelections,
    kshipNotes,
    setKshipNotes,
    kshipBulkProvider,
    setKshipBulkProvider,
    kshipBulkService,
    setKshipBulkService,
    kshipBulkNote,
    setKshipBulkNote,
    kshipShipperNoteOptions,
    kshipShipperNotes,
    setKshipShipperNotes,
    kshipBulkShipperNote,
    setKshipBulkShipperNote,
    kshipSenderAddressId,
    setKshipSenderAddressId,
    kshipRequiredServiceExtras,
    kshipServiceExtraValues,
    setKshipServiceExtraValues,
    selectedKshipOrders,
    allKshipRowsConfigured,
    getKshipServicesByProvider,
    handleOpenCreateKshipCodeModal,
    handleChangeKshipProvider,
    handleChangeKshipService,
    handleSubmitKshipDelivery,
  };
}
