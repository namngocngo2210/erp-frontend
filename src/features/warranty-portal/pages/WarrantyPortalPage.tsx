import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

import { ActivateForm } from "../components/ActivateForm";
import { OrderJourney } from "../components/OrderJourney";
import { OrderPickList } from "../components/OrderPickList";
import { OrderSummary } from "../components/OrderSummary";
import { TrackForm } from "../components/TrackForm";
import { WarrantyCard } from "../components/WarrantyCard";
import { portalTabParam, resolveEntryTab, type PortalTabKey } from "../entry-tab";
import { portalErrorMessage } from "../error-message";
import { track } from "../portal-api";
import { PORTAL_COLOR, PORTAL_GRADIENT } from "../portal-theme";
import {
  isTrackList,
  type ActivateResponse,
  type TrackListResponse,
  type TrackOrder,
  type TrackResponse,
} from "../types";
import { TABLE_VIEWPORT_QUERY } from "@/lib/constants/layout";

const TABS: { key: PortalTabKey; label: string }[] = [
  { key: "activate", label: "Bảo hành" },
  { key: "track", label: "Vận đơn" },
];

/** Ngưỡng `lg` (dùng chung hằng breakpoint của app) — từ mức này kết quả nằm ngay cạnh form. */
const DESKTOP_MEDIA_QUERY = TABLE_VIEWPORT_QUERY;

/**
 * Tabs dựng riêng cho portal thay vì tái dùng `@/components/ui/tabs`: component
 * đó dùng token `text-primary`/`border-border` xanh dương của CRM nội bộ —
 * portal là mặt tiền thương hiệu, phải theo palette teal→green của
 * `portal-theme.ts` (xem đầu file đó).
 *
 * Kết quả của CẢ HAI tab đều do trang này giữ (chứ không nằm trong từng form)
 * vì bố cục desktop là 2 cột: form bên trái, kết quả bên phải — chỉ trang mới
 * đặt được kết quả sang cột phải. Form vẫn hiển thị cạnh kết quả để khách tra
 * mã tiếp mà không phải bấm quay lại.
 */
export default function WarrantyPortalPage() {
  const [tab, setTab] = useState<PortalTabKey>(() => resolveEntryTab(window.location.search));
  const [warranty, setWarranty] = useState<ActivateResponse | null>(null);
  const [tracked, setTracked] = useState<TrackResponse | null>(null);
  /**
   * Danh sách nhiều đơn của lượt tra gần nhất, giữ riêng để khách xem xong một
   * đơn còn quay lại chọn đơn khác mà không phải gõ lại số điện thoại.
   */
  const [trackedList, setTrackedList] = useState<TrackListResponse | null>(null);
  /** Mã đơn đang tải hành trình sau khi khách chọn từ danh sách nhiều đơn. */
  const [pickingOrderCode, setPickingOrderCode] = useState<string | null>(null);
  const [pickError, setPickError] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  const result = tab === "activate" ? warranty : tracked;

  // Mobile xếp dọc nên kết quả rơi xuống dưới màn hình: tra xong mà màn hình
  // không đổi gì thì khách tưởng bấm hụt. Desktop bỏ qua vì kết quả hiện ngay
  // cạnh form. Phụ thuộc chính `result` (không phải cờ boolean) để lần tra thứ
  // hai cũng cuộn lại.
  useEffect(() => {
    if (result === null) return;
    if (window.matchMedia(DESKTOP_MEDIA_QUERY).matches) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }, [result]);

  function handleTrackResult(data: TrackResponse | null) {
    setPickError("");
    setTracked(data);
    setTrackedList(data !== null && isTrackList(data) ? data : null);
  }

  /**
   * Khách chọn một đơn trong danh sách trả về khi tra bằng SĐT: gọi lại `track`
   * kèm mã đơn để lấy hành trình (response danh sách cố ý không có hành trình).
   * Gửi kèm cả mã vận đơn và SĐT của chính đơn đó — backend đòi ít nhất một
   * trong hai, và đơn nào cũng có sẵn ít nhất SĐT vì danh sách chỉ xuất hiện ở
   * nhánh tra theo SĐT.
   */
  async function handlePickOrder(order: TrackOrder) {
    setPickError("");
    setPickingOrderCode(order.order_code);
    try {
      const data = await track({
        order_code: order.order_code,
        shipping_code: order.shipping_code,
        phone: order.phone,
      });
      setTracked(data);
    } catch (err) {
      setPickError(portalErrorMessage(err, "track"));
    } finally {
      setPickingOrderCode(null);
    }
  }

  function switchTab(next: PortalTabKey) {
    setTab(next);
    // Đổi tab là bắt đầu một lượt tra cứu mới: xoá kết quả của cả hai tab để
    // cột phải không còn sót dữ liệu của tab trước.
    setWarranty(null);
    setTracked(null);
    setTrackedList(null);
    setPickError("");
    // Ghi tab đang xem vào URL (replace, không push — khỏi rác nút Back) để
    // khách F5 hoặc chia sẻ link thì vẫn đúng tab đang mở.
    const url = new URL(window.location.href);
    url.searchParams.set("tab", portalTabParam(next));
    window.history.replaceState(null, "", url);
  }

  const resultPane =
    tab === "activate"
      ? warranty && (
          <>
            <WarrantyCard warranty={warranty.warranty} />
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full"
              onClick={() => setWarranty(null)}
            >
              Tra mã khác
            </Button>
          </>
        )
      : tracked &&
        (isTrackList(tracked) ? (
          <>
            <OrderPickList
              orders={tracked.orders}
              truncated={tracked.truncated}
              pendingOrderCode={pickingOrderCode}
              onSelect={handlePickOrder}
            />
            {pickError ? (
              <p
                role="alert"
                className="text-sm font-medium"
                style={{ color: PORTAL_COLOR.redAlert }}
              >
                {pickError}
              </p>
            ) : null}
          </>
        ) : (
          <>
            {trackedList ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full"
                onClick={() => setTracked(trackedList)}
              >
                ← Chọn đơn khác
              </Button>
            ) : null}
            <OrderSummary order={tracked.order} />
            <OrderJourney results={tracked.journey.results} />
          </>
        ));

  return (
    <div
      className="flex min-h-dvh flex-col overflow-x-clip"
      style={{ backgroundColor: PORTAL_COLOR.mint }}
    >
      <header className="shrink-0 rounded-b-3xl bg-white px-4 pt-6 pb-5 text-center shadow-sm">
        <img src="/delax.png" alt="Delax" className="mx-auto h-10 w-auto object-contain" />
        <p className="mt-2 text-xs font-medium" style={{ color: PORTAL_COLOR.grayText }}>
          Tra cứu & kích hoạt bảo hành chính hãng
        </p>
      </header>

      {/*
        `flex-1` + `justify-center`: form nằm giữa khoảng trống còn lại thay vì
        dính sát header (màn hình điện thoại cao, form ngắn nên trước đây trôi
        lên trên với một mảng trống lớn phía dưới). Khi nội dung dài hơn màn
        (thẻ bảo hành + timeline) thì `justify-center` không cắt mất phần trên
        vì đây là flex column co giãn, trang vẫn cuộn bình thường.
      */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-6">
        {/*
          Mobile: một cột dọc (tabs → form → kết quả).

          Từ `lg`: lưới 2 cột. Thanh tab nằm ở HÀNG 1 cột trái, form ở hàng 2 cột
          trái, kết quả ở hàng 2 cột PHẢI — nhờ vậy mép trên thẻ kết quả thẳng
          hàng với mép trên thẻ form. (Bản trước xếp flex-row: cả cột phải bắt
          đầu từ đỉnh cột trái, tức là ngang thanh tab, nên hai thẻ trắng lệch
          nhau đúng bằng chiều cao thanh tab.)

          Chưa có kết quả thì bỏ hẳn cột 2 và `justify-center` kéo cột form về
          giữa trang như bố cục một cột cũ.
        */}
        <div
          className={
            resultPane
              ? "flex w-full flex-col gap-4 lg:grid lg:grid-cols-[27rem_minmax(0,36rem)] lg:items-start lg:justify-center lg:gap-x-6 lg:gap-y-4"
              : "flex w-full flex-col gap-4 lg:grid lg:grid-cols-[27rem] lg:items-start lg:justify-center"
          }
        >
          <div
            role="tablist"
            className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-1.5 shadow-sm lg:col-start-1 lg:row-start-1"
          >
            {TABS.map((t) => {
              const active = t.key === tab;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => switchTab(t.key)}
                  className="h-11 rounded-xl text-sm font-semibold transition-colors"
                  style={
                    active
                      ? { background: PORTAL_GRADIENT, color: PORTAL_COLOR.white }
                      : { color: PORTAL_COLOR.grayText }
                  }
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="lg:col-start-1 lg:row-start-2">
            {tab === "activate" ? (
              <ActivateForm key="activate-form" onSuccess={setWarranty} />
            ) : (
              <TrackForm key="track-form" onResult={handleTrackResult} />
            )}
          </div>

          {resultPane ? (
            <div ref={resultRef} className="w-full space-y-4 lg:col-start-2 lg:row-start-2">
              {resultPane}
            </div>
          ) : null}
        </div>
      </main>
      <Toaster />
    </div>
  );
}
