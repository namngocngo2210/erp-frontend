import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { type OrderRow } from "@/features/orders/order-types";
import { type CreateOrderPayload } from "@/features/orders/use-orders-data";
import { swallowError } from "@/lib/errors";
import { useI18n } from "@/i18n";

import { normalizePhone, parseAmount } from "./order-form-helpers";

type Translate = ReturnType<typeof useI18n>["t"];

type UseOrderFormCustomerArgs = {
  open: boolean;
  mode: "create" | "edit";
  isCreateMode: boolean;
  /** `form.phone` thô — hook tự chuẩn hoá trước khi tra cứu. */
  phone: string;
  setForm: Dispatch<SetStateAction<CreateOrderPayload>>;
  onLookupCustomerByPhone: (
    phone: string,
    options?: { signal?: AbortSignal },
  ) => Promise<{
    id: number;
    code?: string;
    full_name?: string;
    phone_raw: string;
    phone_normalized: string;
    gender?: number | null;
  } | null>;
  onFetchOrderHistoryByPhone: (
    phone: string,
    options?: { signal?: AbortSignal },
  ) => Promise<OrderRow[]>;
  t: Translate;
};

/**
 * Tra cứu khách hàng theo SĐT của form đơn: tự điền mã khách + tên khi tạo đơn,
 * và tải lịch sử mua hàng khi sửa đơn. Cả hai đều debounce theo SĐT đang gõ và
 * huỷ request cũ khi SĐT đổi.
 */
export function useOrderFormCustomer({
  open,
  mode,
  isCreateMode,
  phone,
  setForm,
  onLookupCustomerByPhone,
  onFetchOrderHistoryByPhone,
  t,
}: UseOrderFormCustomerArgs) {
  const [purchaseHistory, setPurchaseHistory] = useState<OrderRow[]>([]);
  const [matchedCustomerCode, setMatchedCustomerCode] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const currentPhone = normalizePhone(phone || "");
  const customerCodeFromHistory = useMemo(() => {
    for (const item of purchaseHistory) {
      const code = String(item.customer_code || "").trim();
      if (code) return code;
    }
    return "";
  }, [purchaseHistory]);
  const autoCustomerCode = useMemo(
    () => String(matchedCustomerCode || customerCodeFromHistory || "").trim(),
    [customerCodeFromHistory, matchedCustomerCode],
  );

  useEffect(() => {
    if (!isCreateMode) return;
    const nextCode = autoCustomerCode;
    setForm((prev) => {
      if (String(prev.customer_code || "").trim() === nextCode) return prev;
      return { ...prev, customer_code: nextCode };
    });
  }, [autoCustomerCode, isCreateMode, setForm]);

  useEffect(() => {
    if (!open) return;
    if (!currentPhone) {
      setMatchedCustomerCode("");
      return;
    }

    const controller = new AbortController();
    let active = true;

    const timer = window.setTimeout(() => {
      onLookupCustomerByPhone(currentPhone, { signal: controller.signal })
        .then((customer) => {
          if (!active) return;
          setMatchedCustomerCode(String(customer?.code || "").trim());
          if (isCreateMode && customer?.full_name) {
            setForm((prev) => ({ ...prev, name: customer.full_name || prev.name }));
          }
        })
        .catch((error: unknown) => {
          if (!active) return;
          const err = error as { name?: string };
          if (err?.name === "AbortError") return;
          setMatchedCustomerCode("");
        });
    }, 250);

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [currentPhone, isCreateMode, onLookupCustomerByPhone, open, setForm]);

  useEffect(() => {
    if (!open) return;
    if (mode !== "edit" || !currentPhone) {
      setPurchaseHistory([]);
      setHistoryLoading(false);
      setHistoryError(null);
      return;
    }

    const controller = new AbortController();
    let active = true;

    setHistoryLoading(true);
    setHistoryError(null);
    setPurchaseHistory([]);

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const data = await onFetchOrderHistoryByPhone(currentPhone, {
            signal: controller.signal,
          });
          if (!active) return;
          setPurchaseHistory(data);
        } catch (error: unknown) {
          if (!active) return;
          const err = error as { name?: string };
          if (err?.name === "AbortError") return;
          setPurchaseHistory([]);
          setHistoryError(t("orders.history.error", "Không thể tải lịch sử mua hàng."));
        } finally {
          if (active) {
            setHistoryLoading(false);
          }
        }
      })();
    }, 400);

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [mode, open, currentPhone, onFetchOrderHistoryByPhone, t]);

  const handlePhoneBlurLookup = useCallback(() => {
    if (mode !== "edit") return;
    const normalized = normalizePhone(phone || "");
    if (!normalized) {
      setMatchedCustomerCode("");
      setPurchaseHistory([]);
      setHistoryLoading(false);
      setHistoryError(null);
      return;
    }

    onLookupCustomerByPhone(normalized)
      .then((customer) => {
        setMatchedCustomerCode(String(customer?.code || "").trim());
        if (isCreateMode && customer?.full_name) {
          setForm((prev) => ({ ...prev, name: customer.full_name || prev.name }));
        }
      })
      .catch((err: unknown) => {
        // Lookup khách theo SĐT là tiện ích phụ — lỗi không chặn form,
        // nhưng lỗi mạng/5xx vẫn phải có dấu vết trên Sentry.
        swallowError(err, "orderForm.lookupCustomerByPhone");
        setMatchedCustomerCode("");
      });

    setHistoryLoading(true);
    setHistoryError(null);
    onFetchOrderHistoryByPhone(normalized)
      .then((data) => {
        setPurchaseHistory(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setPurchaseHistory([]);
        setHistoryError(t("orders.history.error", "Không thể tải lịch sử mua hàng."));
      })
      .finally(() => {
        setHistoryLoading(false);
      });
  }, [phone, isCreateMode, mode, onFetchOrderHistoryByPhone, onLookupCustomerByPhone, setForm, t]);

  const historyCount = purchaseHistory.length;
  const historyTotalAmount = useMemo(
    () => purchaseHistory.reduce((sum, item) => sum + parseAmount(item.total_amount), 0),
    [purchaseHistory],
  );

  return {
    currentPhone,
    purchaseHistory,
    historyLoading,
    historyError,
    historyCount,
    historyTotalAmount,
    handlePhoneBlurLookup,
  };
}
