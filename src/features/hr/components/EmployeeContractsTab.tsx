import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { ResponsiveList } from "@/components/ui/responsive-list";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { useI18n } from "@/i18n";

import type { Contract, ContractSignPayload, ContractTypeKey } from "../hr-types";
import { useContracts, useSignContract } from "../queries";

interface EmployeeContractsTabProps {
  employeeId: number;
}

const COLUMN_COUNT = 6;

const CONTRACT_TYPES: ContractTypeKey[] = ["probation", "official", "seasonal", "collaborator"];

const CONTRACT_TYPE_FALLBACK: Record<ContractTypeKey, string> = {
  probation: "Thử việc",
  official: "Chính thức",
  seasonal: "Thời vụ",
  collaborator: "Cộng tác viên",
};

export function EmployeeContractsTab({ employeeId }: EmployeeContractsTabProps) {
  const { t } = useI18n();
  const { data: contracts = [], isLoading } = useContracts(employeeId);
  const signContract = useSignContract(employeeId);

  const [contractType, setContractType] = useState<ContractTypeKey>("official");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [contractNo, setContractNo] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const headerClass = "h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground";
  const labelClass = "mb-1 block text-sm font-medium text-muted-foreground";

  const typeLabel = (key: ContractTypeKey) =>
    t(`hr.contract.type.${key}`, CONTRACT_TYPE_FALLBACK[key]);

  const resetForm = () => {
    setContractType("official");
    setStartDate("");
    setEndDate("");
    setBaseSalary("");
    setContractNo("");
    setNote("");
    setError("");
  };

  const handleSubmit = () => {
    if (signContract.isPending) return;
    if (!startDate) {
      setError(t("hr.contract.errors.startDateRequired", "Vui lòng chọn ngày bắt đầu."));
      return;
    }
    const payload: ContractSignPayload = {
      contract_type: contractType,
      start_date: startDate,
      end_date: endDate || null,
      base_salary: baseSalary ? Number(baseSalary) : undefined,
      contract_no: contractNo.trim() || undefined,
      note: note.trim() || undefined,
    };
    signContract.mutate(payload, {
      onSuccess: () => {
        toast.success(t("hr.contract.toast.saved", "Đã thêm hợp đồng."));
        resetForm();
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : t("hr.toast.saveFailed", "Lưu thất bại.")),
    });
  };

  return (
    <div className="space-y-6 p-4">
      <form
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div>
          <label htmlFor="contract-type" className={labelClass}>
            {t("hr.contract.type", "Loại hợp đồng")}
          </label>
          <Select value={contractType} onValueChange={(v) => setContractType(v as ContractTypeKey)}>
            <SelectTrigger id="contract-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTRACT_TYPES.map((key) => (
                <SelectItem key={key} value={key}>
                  {typeLabel(key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="contract-start" className={labelClass}>
            {t("hr.contract.startDate", "Ngày bắt đầu")}
          </label>
          <Input
            id="contract-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="contract-end" className={labelClass}>
            {t("hr.contract.endDate", "Ngày kết thúc")}
          </label>
          <Input
            id="contract-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="contract-base-salary" className={labelClass}>
            {t("hr.contract.baseSalary", "Lương cơ bản")}
          </label>
          <Input
            id="contract-base-salary"
            type="number"
            value={baseSalary}
            onChange={(e) => setBaseSalary(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="contract-no" className={labelClass}>
            {t("hr.contract.contractNo", "Số hợp đồng")}
          </label>
          <Input
            id="contract-no"
            value={contractNo}
            onChange={(e) => setContractNo(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="contract-note" className={labelClass}>
            {t("hr.contract.note", "Ghi chú")}
          </label>
          <Input id="contract-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex items-end sm:col-span-3">
          <Button type="submit" disabled={signContract.isPending}>
            <Plus className="mr-2 h-4 w-4" />
            {signContract.isPending
              ? t("common.saving", "Đang lưu...")
              : t("hr.contract.add", "Thêm hợp đồng")}
          </Button>
        </div>
        {error && <p className="text-xs text-action-danger sm:col-span-3">{error}</p>}
      </form>

      <ResponsiveList
        items={contracts}
        getKey={(row: Contract) => row.id}
        loading={isLoading}
        loadingText={t("common.loading", "Đang tải...")}
        emptyText={t("hr.contract.empty", "Chưa có hợp đồng nào.")}
        renderCard={(row: Contract) => (
          <div className="rounded-lg border border-border bg-card px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 text-sm font-semibold text-foreground">
                {row.contract_no || "-"}
              </p>
              <Badge variant="outline">{typeLabel(row.contract_type)}</Badge>
            </div>
            <dl className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">
                  {t("hr.contract.startDate", "Bắt đầu")} - {t("hr.contract.endDate", "Kết thúc")}
                </dt>
                <dd className="text-right">
                  {row.start_date} → {row.end_date || "-"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">
                  {t("hr.contract.baseSalary", "Lương cơ bản")}
                </dt>
                <dd className="text-right font-medium tabular-nums">
                  {row.base_salary ? formatCurrency(row.base_salary) : "-"}
                </dd>
              </div>
              {row.note && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{t("hr.contract.note", "Ghi chú")}</dt>
                  <dd className="text-right">{row.note}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
        table={
          <Table className="min-w-[760px] [&_td]:px-3 [&_th]:px-3">
            <TableHeader>
              <TableRow>
                <TableHead className={headerClass}>
                  {t("hr.contract.contractNo", "Số hợp đồng")}
                </TableHead>
                <TableHead className={headerClass}>
                  {t("hr.contract.type", "Loại hợp đồng")}
                </TableHead>
                <TableHead className={headerClass}>
                  {t("hr.contract.startDate", "Bắt đầu")}
                </TableHead>
                <TableHead className={headerClass}>
                  {t("hr.contract.endDate", "Kết thúc")}
                </TableHead>
                <TableHead className={`${headerClass} text-right`}>
                  {t("hr.contract.baseSalary", "Lương cơ bản")}
                </TableHead>
                <TableHead className={headerClass}>{t("hr.contract.note", "Ghi chú")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && contracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMN_COUNT} className="py-8 text-center">
                    <LogoSpinner label={t("common.loading", "Đang tải...")} className="mx-auto" />
                  </TableCell>
                </TableRow>
              ) : contracts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={COLUMN_COUNT}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {t("hr.contract.empty", "Chưa có hợp đồng nào.")}
                  </TableCell>
                </TableRow>
              ) : (
                contracts.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.contract_no || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{typeLabel(row.contract_type)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.start_date}</TableCell>
                    <TableCell className="text-muted-foreground">{row.end_date || "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.base_salary ? formatCurrency(row.base_salary) : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.note || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        }
      />
    </div>
  );
}
