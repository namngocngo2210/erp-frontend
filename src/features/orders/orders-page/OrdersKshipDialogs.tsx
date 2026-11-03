import { KshipDeliveryDialog } from "@/features/orders/KshipDeliveryDialog";
import { KshipNotePresetManageDialog } from "@/features/orders/KshipNotePresetPicker";
import { KshipSenderAddressManageDialog } from "@/features/orders/KshipSenderAddressManageDialog";
import { useI18n } from "@/i18n";

import { type OrdersKshipDialogsState } from "./use-orders-kship-dialogs";

type Translate = ReturnType<typeof useI18n>["t"];

/**
 * Ba hộp thoại KShip của trang đơn. Nhận nguyên bundle state từ
 * useOrdersKshipDialogs thay vì ~30 prop rời — chúng luôn đi cùng nhau.
 */
export function OrdersKshipDialogs({
  kship,
  canManageSenderAddresses,
  t,
}: {
  kship: OrdersKshipDialogsState;
  canManageSenderAddresses: boolean;
  t: Translate;
}) {
  return (
    <>
      <KshipDeliveryDialog
        open={kship.createKshipCodeModalOpen}
        onOpenChange={kship.setCreateKshipCodeModalOpen}
        kshipOptionsLoading={kship.kshipOptionsLoading}
        kshipOptionsError={kship.kshipOptionsError}
        kshipProviders={kship.kshipProviders}
        selectedOrderIdsForKship={kship.selectedOrderIdsForKship}
        selectedKshipOrders={kship.selectedKshipOrders}
        kshipSelections={kship.kshipSelections}
        setKshipSelections={kship.setKshipSelections}
        kshipNotes={kship.kshipNotes}
        setKshipNotes={kship.setKshipNotes}
        kshipBulkProvider={kship.kshipBulkProvider}
        setKshipBulkProvider={kship.setKshipBulkProvider}
        kshipBulkService={kship.kshipBulkService}
        setKshipBulkService={kship.setKshipBulkService}
        kshipBulkNote={kship.kshipBulkNote}
        setKshipBulkNote={kship.setKshipBulkNote}
        shipperNoteOptions={kship.kshipShipperNoteOptions}
        kshipShipperNotes={kship.kshipShipperNotes}
        setKshipShipperNotes={kship.setKshipShipperNotes}
        kshipBulkShipperNote={kship.kshipBulkShipperNote}
        setKshipBulkShipperNote={kship.setKshipBulkShipperNote}
        requiredServiceExtras={kship.kshipRequiredServiceExtras}
        serviceExtraValues={kship.kshipServiceExtraValues}
        onChangeServiceExtra={(code, value) =>
          kship.setKshipServiceExtraValues((prev) => ({ ...prev, [code]: value }))
        }
        senderAddresses={kship.kshipSenderAddresses}
        senderAddressId={kship.kshipSenderAddressId}
        onChangeSenderAddress={kship.setKshipSenderAddressId}
        canManageSenderAddresses={canManageSenderAddresses}
        onOpenManageSenderAddresses={() => kship.setKshipSenderManageOpen(true)}
        allKshipRowsConfigured={kship.allKshipRowsConfigured}
        getKshipServicesByProvider={kship.getKshipServicesByProvider}
        onChangeKshipProvider={kship.handleChangeKshipProvider}
        onChangeKshipService={kship.handleChangeKshipService}
        onSubmit={() => void kship.handleSubmitKshipDelivery()}
        notePresets={kship.kshipNotePresets}
        onOpenManagePresets={() => kship.setKshipNotePresetManageOpen(true)}
        t={t}
      />

      <KshipNotePresetManageDialog
        open={kship.kshipNotePresetManageOpen}
        onOpenChange={kship.setKshipNotePresetManageOpen}
        presets={kship.kshipNotePresets.presets}
        loading={kship.kshipNotePresets.loading}
        onCreate={kship.kshipNotePresets.create}
        onUpdate={kship.kshipNotePresets.update}
        onDelete={kship.kshipNotePresets.remove}
      />

      {canManageSenderAddresses ? (
        <KshipSenderAddressManageDialog
          open={kship.kshipSenderManageOpen}
          onOpenChange={kship.setKshipSenderManageOpen}
          addresses={kship.kshipSenderAddresses}
        />
      ) : null}
    </>
  );
}
