import { Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell } from "@/components/ui/form-dialog-content";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KshipNotePresetPicker } from "@/features/orders/KshipNotePresetPicker";
import { type KshipNotePreset } from "@/features/orders/use-kship-note-presets";
import {
  formatDimensionsDisplay,
  formatMoneyDisplay,
  formatWeightDisplay,
} from "@/features/orders/order-import-format";
import { type SelectedKshipOrder, type KshipSelection } from "@/features/orders/use-kship-delivery";
import {
  type KshipProviderOption,
  type KshipServiceExtraOption,
  type KshipServiceOption,
  type KshipShipperNoteOption,
} from "@/features/orders/use-orders-data";

type NotePresets = {
  presets: KshipNotePreset[];
  loading: boolean;
  ensureLoaded: () => void;
};

type Props = {
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  kshipOptionsLoading: boolean;
  kshipOptionsError: string;
  kshipProviders: KshipProviderOption[];
  selectedOrderIdsForKship: number[];
  selectedKshipOrders: SelectedKshipOrder[];
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
  shipperNoteOptions: KshipShipperNoteOption[];
  kshipShipperNotes: Record<number, string>;
  setKshipShipperNotes: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  kshipBulkShipperNote: string;
  setKshipBulkShipperNote: React.Dispatch<React.SetStateAction<string>>;
  /** Mục hãng bắt buộc phải chọn (SPX: ca lấy hàng). Rỗng với BEST/GHN/J&T → không hiện gì. */
  requiredServiceExtras: KshipServiceExtraOption[];
  serviceExtraValues: Record<string, string>;
  onChangeServiceExtra: (code: string, value: string) => void;
  senderAddresses: { id: number; name: string; address: string }[];
  senderAddressId: number | null;
  onChangeSenderAddress: (id: number | null) => void;
  canManageSenderAddresses: boolean;
  onOpenManageSenderAddresses: () => void;
  allKshipRowsConfigured: boolean;
  getKshipServicesByProvider: (providerCode: string) => KshipServiceOption[];
  onChangeKshipProvider: (orderId: number, providerCode: string) => void;
  onChangeKshipService: (orderId: number, serviceCode: string) => void;
  onSubmit: () => void;
  notePresets: NotePresets;
  onOpenManagePresets: () => void;
  t: (key: string, fallback?: string) => string;
};

/** Dialog "Tạo mã vận đơn KShip" — cấu hình nhà vận chuyển/dịch vụ/ghi chú cho từng đơn. */
export function KshipDeliveryDialog({
  open,
  onOpenChange,
  kshipOptionsLoading,
  kshipOptionsError,
  kshipProviders,
  selectedOrderIdsForKship,
  selectedKshipOrders,
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
  shipperNoteOptions,
  kshipShipperNotes,
  setKshipShipperNotes,
  kshipBulkShipperNote,
  setKshipBulkShipperNote,
  requiredServiceExtras,
  serviceExtraValues,
  onChangeServiceExtra,
  senderAddresses,
  senderAddressId,
  onChangeSenderAddress,
  canManageSenderAddresses,
  onOpenManageSenderAddresses,
  allKshipRowsConfigured,
  getKshipServicesByProvider,
  onChangeKshipProvider,
  onChangeKshipService,
  onSubmit,
  notePresets,
  onOpenManagePresets,
  t,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogShell
        title={t("orders.kiotviet.createKshipShippingCode", "Tạo mã vận đơn KShip")}
        footer={
          <>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel", "Hủy")}
            </Button>
            <Button
              className="w-full sm:w-auto"
              disabled={kshipOptionsLoading || !allKshipRowsConfigured}
              onClick={onSubmit}
            >
              {t("orders.kiotviet.createShippingCode", "Tạo mã vận đơn")}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {kshipOptionsError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {kshipOptionsError}
            </div>
          ) : null}

          {/* Áp dụng tất cả */}
          <div className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-muted/30 p-3">
            <div className="min-w-[220px] flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t("orders.kiotviet.kshipSenderAddress", "Địa chỉ gửi")}
              </label>
              <div className="flex gap-1">
                <Select
                  value={senderAddressId !== null ? String(senderAddressId) : ""}
                  onValueChange={(value) => onChangeSenderAddress(value ? Number(value) : null)}
                >
                  <SelectTrigger className="w-full">
                    {(() => {
                      const selected = senderAddresses.find((a) => a.id === senderAddressId);
                      return selected ? (
                        <span className="truncate">{selected.name}</span>
                      ) : (
                        <SelectValue
                          placeholder={t(
                            "orders.kiotviet.kshipSenderAddressPlaceholder",
                            "Chọn địa chỉ gửi",
                          )}
                        />
                      );
                    })()}
                  </SelectTrigger>
                  <SelectContent>
                    {senderAddresses.map((addr) => (
                      <SelectItem key={addr.id} value={String(addr.id)}>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate">{addr.name}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {addr.address}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {canManageSenderAddresses ? (
                  <button
                    type="button"
                    className="shrink-0 rounded-md border border-input bg-background px-2 py-1.5 text-muted-foreground hover:text-foreground"
                    title={t("orders.kiotviet.kshipSenderManage", "Quản lý địa chỉ gửi")}
                    onClick={onOpenManageSenderAddresses}
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t("orders.kiotviet.kshipProvider", "Nhà vận chuyển")}
              </label>
              <Select
                value={kshipBulkProvider}
                onValueChange={(value) => {
                  setKshipBulkProvider(value);
                  const nextServices = getKshipServicesByProvider(value);
                  setKshipBulkService(nextServices[0]?.code || "");
                }}
              >
                <SelectTrigger
                  className="w-full"
                  disabled={kshipOptionsLoading || kshipProviders.length === 0}
                >
                  {(() => {
                    const bp = kshipProviders.find((p) => p.code === kshipBulkProvider);
                    return bp ? (
                      <div className="flex min-w-0 items-center gap-2">
                        {bp.imageForMobile || bp.image ? (
                          <img
                            src={bp.imageForMobile || bp.image}
                            alt={bp.name || bp.code}
                            className="h-5 w-5 shrink-0 rounded object-contain"
                            loading="lazy"
                          />
                        ) : null}
                        <span className="truncate">{bp.name || bp.code}</span>
                      </div>
                    ) : (
                      <SelectValue
                        placeholder={t(
                          "orders.kiotviet.kshipProviderPlaceholder",
                          "Chọn nhà vận chuyển",
                        )}
                      />
                    );
                  })()}
                </SelectTrigger>
                <SelectContent>
                  {kshipProviders.map((p) => (
                    <SelectItem key={p.code || String(p.id)} value={p.code}>
                      <div className="flex min-w-0 items-center gap-2">
                        {p.imageForMobile || p.image ? (
                          <img
                            src={p.imageForMobile || p.image}
                            alt={p.name || p.code}
                            className="h-5 w-5 shrink-0 rounded object-contain"
                            loading="lazy"
                          />
                        ) : null}
                        <span className="truncate">{p.name || p.code}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[180px] flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t("orders.kiotviet.kshipService", "Dịch vụ")}
              </label>
              <Select value={kshipBulkService} onValueChange={setKshipBulkService}>
                <SelectTrigger className="w-full" disabled={!kshipBulkProvider}>
                  {(() => {
                    const bs = getKshipServicesByProvider(kshipBulkProvider).find(
                      (s) => s.code === kshipBulkService,
                    );
                    return bs ? (
                      <span className="truncate">{bs.name || bs.code}</span>
                    ) : (
                      <SelectValue
                        placeholder={t("orders.kiotviet.kshipServicePlaceholder", "Chọn dịch vụ")}
                      />
                    );
                  })()}
                </SelectTrigger>
                <SelectContent>
                  {getKshipServicesByProvider(kshipBulkProvider).map((s) => (
                    <SelectItem key={`${s.provider_code}:${s.code || s.id}`} value={s.code}>
                      {s.name || s.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {requiredServiceExtras.map((extra) => (
              <div key={extra.code} className="min-w-[220px] flex-1">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {extra.name || extra.code}
                </label>
                <Select
                  value={serviceExtraValues[extra.code] || ""}
                  onValueChange={(value) => onChangeServiceExtra(extra.code, value)}
                >
                  <SelectTrigger className="w-full">
                    {(() => {
                      const selected = extra.options.find(
                        (option) => option.value === serviceExtraValues[extra.code],
                      );
                      return selected ? (
                        <span className="truncate">{selected.name || selected.value}</span>
                      ) : (
                        <SelectValue
                          placeholder={t(
                            "orders.kiotviet.kshipServiceExtraPlaceholder",
                            "Chọn giá trị",
                          )}
                        />
                      );
                    })()}
                  </SelectTrigger>
                  <SelectContent>
                    {extra.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.name || option.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div className="min-w-[180px] flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t("orders.kiotviet.kshipShipperNote", "Quy định xem hàng")}
              </label>
              <Select value={kshipBulkShipperNote} onValueChange={setKshipBulkShipperNote}>
                <SelectTrigger
                  className="w-full"
                  disabled={kshipOptionsLoading || shipperNoteOptions.length === 0}
                >
                  {(() => {
                    const selected = shipperNoteOptions.find(
                      (item) => item.code === kshipBulkShipperNote,
                    );
                    return selected ? (
                      <span className="truncate">{selected.name || selected.code}</span>
                    ) : (
                      <SelectValue
                        placeholder={t(
                          "orders.kiotviet.kshipShipperNotePlaceholder",
                          "Chọn quy định",
                        )}
                      />
                    );
                  })()}
                </SelectTrigger>
                <SelectContent>
                  {shipperNoteOptions.map((item) => (
                    <SelectItem key={item.code} value={item.code}>
                      {item.name || item.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[160px] flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t("orders.kiotviet.kshipNote", "Ghi chú")}
              </label>
              <div className="flex gap-1">
                <input
                  type="text"
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                  placeholder={t("orders.kiotviet.kshipNotePlaceholder", "Nhập ghi chú...")}
                  value={kshipBulkNote}
                  onChange={(e) => setKshipBulkNote(e.target.value)}
                  maxLength={500}
                />
                <KshipNotePresetPicker
                  presets={notePresets.presets}
                  loading={notePresets.loading}
                  onEnsureLoaded={notePresets.ensureLoaded}
                  onSelect={(text) => setKshipBulkNote(text)}
                  onOpenManage={onOpenManagePresets}
                />
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              disabled={!kshipBulkProvider || !kshipBulkService}
              onClick={() => {
                const next: Record<number, KshipSelection> = {};
                const nextNotes: Record<number, string> = {};
                const nextShipperNotes: Record<number, string> = {};
                for (const id of selectedOrderIdsForKship) {
                  next[id] = { providerCode: kshipBulkProvider, serviceCode: kshipBulkService };
                  nextNotes[id] = kshipBulkNote;
                  nextShipperNotes[id] = kshipBulkShipperNote;
                }
                setKshipSelections(next);
                setKshipNotes(nextNotes);
                setKshipShipperNotes(nextShipperNotes);
              }}
            >
              {t("orders.kiotviet.kshipApplyAll", "Áp dụng tất cả")}
            </Button>
          </div>

          <div className="overflow-x-auto overscroll-contain [-webkit-overflow-scrolling:touch] rounded-md border border-border">
            <table data-slot="table" className="w-full min-w-[1400px] table-fixed text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-border text-left">
                  <th className="w-[110px] px-3 py-2">
                    {t("orders.columns.invoiceCode", "Mã hóa đơn")}
                  </th>
                  <th className="w-[124px] px-3 py-2">
                    {t("orders.table.customer", "Người nhận")}
                  </th>
                  <th className="w-[100px] px-3 py-2">{t("orders.table.phone", "SĐT")}</th>
                  <th className="w-[120px] px-3 py-2">{t("orders.table.address", "Địa chỉ")}</th>
                  <th className="w-[102px] px-3 py-2">{t("orders.table.total", "Giá trị hàng")}</th>
                  <th className="w-[126px] px-3 py-2">
                    {t("orders.table.productInfo", "Thông tin hàng")}
                  </th>
                  <th className="w-[250px] px-3 py-2">
                    {t("orders.kiotviet.kshipProvider", "Nhà vận chuyển")}
                  </th>
                  <th className="w-[200px] px-3 py-2">
                    {t("orders.kiotviet.kshipService", "Dịch vụ")}
                  </th>
                  <th className="w-[180px] px-3 py-2">
                    {t("orders.kiotviet.kshipShipperNote", "Quy định xem hàng")}
                  </th>
                  <th className="w-[180px] px-3 py-2">
                    {t("orders.kiotviet.kshipNote", "Ghi chú")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {selectedKshipOrders.map((order) => {
                  const selection = kshipSelections[order.id] || {
                    providerCode: "",
                    serviceCode: "",
                  };
                  const provider =
                    kshipProviders.find((item) => item.code === selection.providerCode) || null;
                  const servicesForProvider = getKshipServicesByProvider(selection.providerCode);
                  return (
                    <tr key={order.id} className="border-b border-border/60 align-top">
                      <td className="px-3 py-3">{order.invoiceCode || "-"}</td>
                      <td className="px-3 py-3">{order.name || "-"}</td>
                      <td className="px-3 py-3">{order.phone || "-"}</td>
                      <td className="max-w-[340px] px-3 py-3">
                        <div className="whitespace-normal wrap-break-word">
                          {order.address || "-"}
                        </div>
                      </td>
                      <td className="px-3 py-3">{formatMoneyDisplay(order.totalAmount)}</td>
                      <td className="px-3 py-3">
                        <div className="text-muted-foreground">
                          <div>{formatWeightDisplay(order.weight)}</div>
                          <div>{formatDimensionsDisplay(order.dimensions)}</div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="w-full min-w-0">
                          <Select
                            value={selection.providerCode}
                            onValueChange={(value) => onChangeKshipProvider(order.id, value)}
                          >
                            <SelectTrigger
                              className="w-full min-w-0"
                              disabled={kshipOptionsLoading || kshipProviders.length === 0}
                            >
                              {provider ? (
                                <div className="flex min-w-0 items-center gap-2">
                                  {provider.imageForMobile || provider.image ? (
                                    <img
                                      src={provider.imageForMobile || provider.image}
                                      alt={provider.name || provider.code}
                                      className="h-5 w-5 shrink-0 rounded object-contain"
                                      loading="lazy"
                                    />
                                  ) : null}
                                  <span className="truncate">{provider.name || provider.code}</span>
                                </div>
                              ) : (
                                <SelectValue
                                  placeholder={t(
                                    "orders.kiotviet.kshipProviderPlaceholder",
                                    "Chọn nhà vận chuyển",
                                  )}
                                />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              {kshipProviders.map((providerItem) => (
                                <SelectItem
                                  key={providerItem.code || String(providerItem.id)}
                                  value={providerItem.code}
                                >
                                  <div className="flex min-w-0 items-center gap-2">
                                    {providerItem.imageForMobile || providerItem.image ? (
                                      <img
                                        src={providerItem.imageForMobile || providerItem.image}
                                        alt={providerItem.name || providerItem.code}
                                        className="h-5 w-5 shrink-0 rounded object-contain"
                                        loading="lazy"
                                      />
                                    ) : null}
                                    <span className="truncate">
                                      {providerItem.name || providerItem.code}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="w-full min-w-0">
                          <Select
                            value={selection.serviceCode}
                            onValueChange={(value) => onChangeKshipService(order.id, value)}
                          >
                            <SelectTrigger
                              className="w-full min-w-0"
                              disabled={
                                kshipOptionsLoading ||
                                !selection.providerCode ||
                                servicesForProvider.length === 0
                              }
                            >
                              {(() => {
                                const selectedService = servicesForProvider.find(
                                  (s) => s.code === selection.serviceCode,
                                );
                                return selectedService ? (
                                  <span className="truncate">
                                    {selectedService.name || selectedService.code}
                                  </span>
                                ) : (
                                  <SelectValue
                                    placeholder={t(
                                      "orders.kiotviet.kshipServicePlaceholder",
                                      "Chọn dịch vụ",
                                    )}
                                  />
                                );
                              })()}
                            </SelectTrigger>
                            <SelectContent>
                              {servicesForProvider.map((service) => (
                                <SelectItem
                                  key={`${service.provider_code}:${service.code || service.id}`}
                                  value={service.code}
                                >
                                  {service.name || service.code}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="w-full min-w-0">
                          <Select
                            value={kshipShipperNotes[order.id] || ""}
                            onValueChange={(value) =>
                              setKshipShipperNotes((prev) => ({ ...prev, [order.id]: value }))
                            }
                          >
                            <SelectTrigger
                              className="w-full min-w-0"
                              disabled={kshipOptionsLoading || shipperNoteOptions.length === 0}
                            >
                              {(() => {
                                const selected = shipperNoteOptions.find(
                                  (item) => item.code === kshipShipperNotes[order.id],
                                );
                                return selected ? (
                                  <span className="truncate">{selected.name || selected.code}</span>
                                ) : (
                                  <SelectValue
                                    placeholder={t(
                                      "orders.kiotviet.kshipShipperNotePlaceholder",
                                      "Chọn quy định",
                                    )}
                                  />
                                );
                              })()}
                            </SelectTrigger>
                            <SelectContent>
                              {shipperNoteOptions.map((item) => (
                                <SelectItem key={item.code} value={item.code}>
                                  {item.name || item.code}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          <input
                            type="text"
                            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                            placeholder={t(
                              "orders.kiotviet.kshipNotePlaceholder",
                              "Nhập ghi chú...",
                            )}
                            value={kshipNotes[order.id] || ""}
                            onChange={(e) =>
                              setKshipNotes((prev) => ({ ...prev, [order.id]: e.target.value }))
                            }
                            maxLength={500}
                          />
                          <KshipNotePresetPicker
                            presets={notePresets.presets}
                            loading={notePresets.loading}
                            onEnsureLoaded={notePresets.ensureLoaded}
                            onSelect={(text) =>
                              setKshipNotes((prev) => ({ ...prev, [order.id]: text }))
                            }
                            onOpenManage={onOpenManagePresets}
                            compact
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {kshipOptionsLoading ? (
            <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
              {t("common.loading", "Đang tải...")}
            </div>
          ) : null}
        </div>
      </FormDialogShell>
    </Dialog>
  );
}
