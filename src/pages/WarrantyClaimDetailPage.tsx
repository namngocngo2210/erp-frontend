import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { formatDateTime } from "@/lib/utils";
import { JourneyCard } from "@/features/warranty-claims/components/JourneyCard";
import {
  useAddJourney,
  useCompleteClaim,
  useDeleteWarrantyClaim,
  useUpdateWarrantyClaim,
  useWarrantyClaim,
} from "@/features/warranty-claims/queries";
import {
  STATUS_BADGE_CLASS,
  formatDaysLeft,
} from "@/features/warranty-claims/warranty-claim-columns";
import { formatDateVi } from "@/lib/format";
import { useConfirm } from "@/hooks/use-confirm";

export default function WarrantyClaimDetailPage() {
  const { claimId } = useParams();
  const id = Number(claimId);
  const navigate = useNavigate();
  const { data: claim, isLoading, isError } = useWarrantyClaim(id);
  const updateMutation = useUpdateWarrantyClaim();
  const deleteMutation = useDeleteWarrantyClaim();
  const completeMutation = useCompleteClaim();
  const confirm = useConfirm();
  const addJourneyMutation = useAddJourney();

  const back = () => navigate("/aftersales/warranty");

  if (isLoading)
    return (
      <div className="flex justify-center p-10">
        <LogoSpinner label="Đang tải phiếu bảo hành" />
      </div>
    );
  // Lỗi tải (mạng/API) tách khỏi "không tìm thấy" — tránh báo sai là phiếu
  // không tồn tại khi thực chất request thất bại.
  if (isError)
    return (
      <div className="p-6 text-destructive">Không tải được phiếu bảo hành. Thử tải lại trang.</div>
    );
  if (!claim) return <div className="p-6 text-muted-foreground">Không tìm thấy phiếu.</div>;

  const isCompleted = claim.status === 9;

  const handleReportDateChange = (value: string) => {
    if ((claim.customer_report_date ?? "") === value) return;
    updateMutation.mutate(
      { id, payload: { customer_report_date: value || null } },
      {
        onError: (err) => toast.error(err instanceof Error ? err.message : "Thao tác thất bại."),
      },
    );
  };

  const handleActivationDateChange = (value: string) => {
    if ((claim.activation_date ?? "") === value) return;
    updateMutation.mutate(
      { id, payload: { activation_date: value || null } },
      {
        onError: (err) => toast.error(err instanceof Error ? err.message : "Thao tác thất bại."),
      },
    );
  };

  const handleWarrantyMonthsChange = (value: string) => {
    const months = Number(value);
    if (!Number.isInteger(months) || months < 1 || months > 120) {
      toast.error("Số tháng bảo hành phải từ 1 đến 120.");
      return;
    }
    if (months === claim.warranty_months) return;
    updateMutation.mutate(
      { id, payload: { warranty_months: months } },
      {
        onError: (err) => toast.error(err instanceof Error ? err.message : "Thao tác thất bại."),
      },
    );
  };

  const handleComplete = async () => {
    if (isCompleted) return;
    const ok = await confirm({
      title: "Đánh dấu phiếu bảo hành này đã hoàn thành?",
      confirmText: "Hoàn thành",
    });
    if (!ok) return;
    completeMutation.mutate(id, {
      onSuccess: () => toast.success("Đã hoàn thành phiếu bảo hành."),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Thao tác thất bại."),
    });
  };

  const handleDelete = async () => {
    if (!(await confirm({ title: "Xóa phiếu bảo hành này?", destructive: true }))) return;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Đã xóa phiếu bảo hành.");
        back();
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Thao tác thất bại."),
    });
  };

  const handleAddJourney = () => {
    addJourneyMutation.mutate(id, {
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Thêm hành trình thất bại."),
    });
  };

  const o = claim.order;
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon-sm" onClick={back} aria-label="Quay lại">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold">Phiếu bảo hành {o.invoice_code || `#${claim.id}`}</h1>
        <span
          className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[claim.status]}`}
        >
          {claim.status_label}
        </span>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            disabled={isCompleted || completeMutation.isPending}
            onClick={handleComplete}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Hoàn thành
          </Button>
          <Button
            variant="outline"
            className="text-destructive"
            disabled={deleteMutation.isPending}
            onClick={handleDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Xóa
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 lg:grid-cols-3">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-muted-foreground">Ngày báo lỗi:</span>
            <Input
              type="date"
              key={claim.customer_report_date ?? ""}
              defaultValue={claim.customer_report_date ?? ""}
              onBlur={(e) => handleReportDateChange(e.target.value)}
              className="h-7 w-[150px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-muted-foreground">Ngày kích hoạt:</span>
            <Input
              type="date"
              key={claim.activation_date ?? ""}
              defaultValue={claim.activation_date ?? ""}
              onBlur={(e) => handleActivationDateChange(e.target.value)}
              className="h-7 w-[150px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-muted-foreground">Số tháng bảo hành:</span>
            <Input
              type="number"
              min={1}
              max={120}
              key={claim.warranty_months}
              defaultValue={claim.warranty_months}
              onBlur={(e) => handleWarrantyMonthsChange(e.target.value)}
              className="h-7 w-20"
            />
          </div>
          <div className="truncate">
            <span className="text-muted-foreground">Ngày hết hạn: </span>
            {claim.expiry_date ? formatDateVi(claim.expiry_date) : "—"}
          </div>
          <div className="truncate">
            <span className="text-muted-foreground">Số ngày bảo hành: </span>
            <span
              className={
                claim.warranty_days_left != null && claim.warranty_days_left <= 0
                  ? "font-medium text-destructive"
                  : ""
              }
            >
              {formatDaysLeft(claim.warranty_days_left)}
            </span>
          </div>
          <div className="truncate">
            <span className="text-muted-foreground">Mã đơn gốc: </span>
            {o.invoice_code || "—"}
          </div>
          <div className="truncate">
            <span className="text-muted-foreground">Ngày gửi đơn: </span>
            {formatDateTime(o.created_at)}
          </div>
          <div className="truncate">
            <span className="text-muted-foreground">Kênh KiotViet: </span>
            {o.kiotviet_channel_name || "—"}
          </div>
          <div className="truncate">
            <span className="text-muted-foreground">Khách: </span>
            {o.name}
          </div>
          <div className="truncate">
            <span className="text-muted-foreground">SĐT: </span>
            {o.phone}
          </div>
          <div className="truncate">
            <span className="text-muted-foreground">Mã vận đơn: </span>
            {o.shipping_code || "—"}
          </div>
          <div className="truncate">
            <span className="text-muted-foreground">Mã đơn: </span>
            {o.order_code || "—"}
          </div>
          <div className="col-span-2 lg:col-span-3">
            <span className="text-muted-foreground">Địa chỉ: </span>
            {o.address}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium">Hành trình bảo hành</h2>
          <Button
            variant="outline"
            disabled={addJourneyMutation.isPending}
            onClick={handleAddJourney}
          >
            <Plus className="mr-2 h-4 w-4" />
            Thêm hành trình
          </Button>
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto">
          {claim.journeys.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Chưa có hành trình nào.
            </div>
          ) : (
            claim.journeys.map((journey) => <JourneyCard key={journey.id} journey={journey} />)
          )}
        </div>
      </div>
    </div>
  );
}
