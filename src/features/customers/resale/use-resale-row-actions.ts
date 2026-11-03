import { useState } from "react";
import { toast } from "sonner";

import type { ResaleTrackingRow } from "@/lib/api/customers";
import {
  useCreateResaleOrderNote,
  useUpdateResaleAppointment,
  useUpdateResaleContact,
} from "@/features/customers/queries";
import { fromDateTimeLocalValue, nextContactNo } from "../resale-format";
import {
  EMPTY_APPOINTMENT_FORM,
  EMPTY_CONTACT_FORM,
  EMPTY_RESALE_FORM,
  appointmentFormFromRow,
  resaleFormFromRow,
  type ResaleAppointmentForm,
  type ResaleContactForm,
  type ResaleOrderForm,
} from "./resale-tracking-state";

type PatchRow = (orderId: number, patch: (row: ResaleTrackingRow) => ResaleTrackingRow) => void;

/** State + submit của 3 dialog trên từng dòng: ghi liên hệ, đặt hẹn, ghi đơn resale. */
export function useResaleRowActions(patchRow: PatchRow) {
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [activeContactRow, setActiveContactRow] = useState<ResaleTrackingRow | null>(null);
  const [activeAppointmentRow, setActiveAppointmentRow] = useState<ResaleTrackingRow | null>(null);
  const [activeResaleRow, setActiveResaleRow] = useState<ResaleTrackingRow | null>(null);
  const [contactForm, setContactForm] = useState<ResaleContactForm>(EMPTY_CONTACT_FORM);
  const [appointmentForm, setAppointmentForm] =
    useState<ResaleAppointmentForm>(EMPTY_APPOINTMENT_FORM);
  const [resaleForm, setResaleForm] = useState<ResaleOrderForm>(EMPTY_RESALE_FORM);

  const contactMutation = useUpdateResaleContact();
  const appointmentMutation = useUpdateResaleAppointment();
  const resaleOrderMutation = useCreateResaleOrderNote();

  const openContactDialog = (row: ResaleTrackingRow) => {
    const contactNo = nextContactNo(row);
    if (!contactNo) {
      toast.info("Đơn này đã ghi đủ 3 lần liên hệ.");
      return;
    }
    setContactForm({ ...EMPTY_CONTACT_FORM });
    setActiveContactRow(row);
  };

  const openAppointmentDialog = (row: ResaleTrackingRow) => {
    setAppointmentForm(appointmentFormFromRow(row));
    setActiveAppointmentRow(row);
  };

  const openResaleDialog = (row: ResaleTrackingRow) => {
    setResaleForm(resaleFormFromRow(row));
    setActiveResaleRow(row);
  };

  const submitContact = async () => {
    const row = activeContactRow;
    if (!row) return;
    const contactNo = nextContactNo(row);
    if (!contactNo) return;
    const key = `${row.order_id}:${contactNo}`;
    setSavingKey(key);
    try {
      const updated = await contactMutation.mutateAsync({
        orderId: row.order_id,
        payload: { contact_no: contactNo, checked: true, ...contactForm },
      });
      patchRow(row.order_id, (item) => ({ ...item, ...updated }));
      setActiveContactRow(null);
      toast.success(`Đã ghi liên hệ lần ${contactNo}.`);
    } catch (error) {
      console.error("Error updating resale contact:", error);
      toast.error("Cập nhật thời gian liên hệ thất bại.");
    } finally {
      setSavingKey(null);
    }
  };

  const submitAppointment = async () => {
    const row = activeAppointmentRow;
    if (!row) return;
    const appointmentAt = fromDateTimeLocalValue(appointmentForm.appointment_at);
    if (!appointmentAt) {
      toast.error("Vui lòng chọn ngày giờ hẹn gọi.");
      return;
    }
    setSavingKey(`${row.order_id}:appointment`);
    try {
      const updated = await appointmentMutation.mutateAsync({
        orderId: row.order_id,
        payload: {
          appointment_at: appointmentAt,
          channel: appointmentForm.channel,
          purpose: appointmentForm.purpose,
          note: appointmentForm.note,
        },
      });
      patchRow(row.order_id, (item) => ({ ...item, appointment: updated.appointment }));
      setActiveAppointmentRow(null);
      toast.success("Đã lưu lịch hẹn.");
    } catch (error) {
      console.error("Error updating resale appointment:", error);
      toast.error("Lưu lịch hẹn thất bại.");
    } finally {
      setSavingKey(null);
    }
  };

  const submitResaleOrder = async () => {
    const row = activeResaleRow;
    if (!row) return;
    if (!resaleForm.product.trim()) {
      toast.error("Vui lòng nhập sản phẩm resale.");
      return;
    }
    setSavingKey(`${row.order_id}:resale`);
    try {
      const updated = await resaleOrderMutation.mutateAsync({
        orderId: row.order_id,
        payload: { ...resaleForm, order_value: resaleForm.order_value || "0" },
      });
      patchRow(row.order_id, (item) => ({ ...item, resale_orders: updated.resale_orders }));
      setActiveResaleRow(null);
      toast.success("Đã lưu đơn resale.");
    } catch (error) {
      console.error("Error creating resale order note:", error);
      toast.error("Lưu đơn resale thất bại.");
    } finally {
      setSavingKey(null);
    }
  };

  return {
    savingKey,
    contact: {
      row: activeContactRow,
      form: contactForm,
      setForm: setContactForm,
      open: openContactDialog,
      close: () => setActiveContactRow(null),
      submit: submitContact,
    },
    appointment: {
      row: activeAppointmentRow,
      form: appointmentForm,
      setForm: setAppointmentForm,
      open: openAppointmentDialog,
      close: () => setActiveAppointmentRow(null),
      submit: submitAppointment,
    },
    resale: {
      row: activeResaleRow,
      form: resaleForm,
      setForm: setResaleForm,
      open: openResaleDialog,
      close: () => setActiveResaleRow(null),
      submit: submitResaleOrder,
    },
  };
}
