import { Input } from "@/components/ui/input";
import { Inbox, NotebookPen, PackageOpen, Undo2, type LucideIcon } from "lucide-react";
import { FormGrid } from "@/components/ui/form-dialog-content";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { BestAccount } from "@/lib/api/bestExpress";
import { parseAddress } from "@/lib/api/orders";
import { Field, SectionTitle } from "../journey/journey-fields";
import {
  JOURNEY_TYPE_BLOCK_LABELS,
  JOURNEY_TYPE_OPTIONS,
  NOTE_PRESETS,
  applyJourneyType,
  applyParsedAddress,
  type AddressBlock,
  type BestJourneyType,
  type BestOrderFormState,
} from "./best-order-form";
import { swallowError } from "@/lib/errors";

/** 1 khối địa chỉ. Ô "Địa chỉ đầy đủ" blur là parse ra Tỉnh/Quận/Phường/Địa chỉ. */
function AddressFields({
  icon,
  title,
  block,
  onChange,
  idPrefix,
}: {
  icon: LucideIcon;
  title: string;
  block: AddressBlock;
  /** Updater trên state MỚI NHẤT — tránh stale closure khi có await (parse địa chỉ) ở giữa. */
  onChange: (updater: (prev: AddressBlock) => AddressBlock) => void;
  idPrefix: string;
}) {
  const set = (key: keyof AddressBlock) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onChange((prev) => ({ ...prev, [key]: value }));
  };

  const handleRawBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim();
    if (!raw) return;
    try {
      const parsed = await parseAddress(raw);
      // Áp kết quả parse qua updater trên state hiện tại — nếu người dùng đã
      // sửa Tên/SĐT trong lúc request bay thì không bị ghi đè mất.
      onChange((prev) => applyParsedAddress({ ...prev, raw }, parsed));
    } catch (err) {
      // Parse hỏng/không có quyền — người dùng tự điền 4 ô bên dưới.
      swallowError(err, "warranty.best.parseAddress");
    }
  };

  return (
    <section>
      <SectionTitle icon={icon}>{title}</SectionTitle>
      <FormGrid>
        <Field label="Tên" htmlFor={`${idPrefix}-name`}>
          <Input id={`${idPrefix}-name`} value={block.name} onChange={set("name")} />
        </Field>
        <Field label="SĐT" htmlFor={`${idPrefix}-phone`}>
          <Input id={`${idPrefix}-phone`} value={block.phone} onChange={set("phone")} />
        </Field>
        <Field label="Địa chỉ đầy đủ (dán vào để tự tách)" htmlFor={`${idPrefix}-raw`}>
          <Input
            id={`${idPrefix}-raw`}
            value={block.raw}
            onChange={set("raw")}
            onBlur={handleRawBlur}
            placeholder="VD: 12 Lê Lợi, Tràng Tiền, Hoàn Kiếm, Hà Nội"
          />
        </Field>
        <Field label="Tỉnh/TP" htmlFor={`${idPrefix}-city`}>
          <Input id={`${idPrefix}-city`} value={block.city} onChange={set("city")} />
        </Field>
        <Field label="Quận/Huyện (để trống nếu 2 cấp)" htmlFor={`${idPrefix}-district`}>
          <Input id={`${idPrefix}-district`} value={block.district} onChange={set("district")} />
        </Field>
        <Field label="Phường/Xã" htmlFor={`${idPrefix}-ward`}>
          <Input id={`${idPrefix}-ward`} value={block.ward} onChange={set("ward")} />
        </Field>
        <Field label="Địa chỉ" htmlFor={`${idPrefix}-address`}>
          <Input id={`${idPrefix}-address`} value={block.address} onChange={set("address")} />
        </Field>
      </FormGrid>
    </section>
  );
}

/**
 * Thân form tạo đơn Best — thuần trình bày, không gọi API, không giữ state.
 * Dùng chung cho dialog (chặng gửi đi/thu hồi) và khối §7 bung inline.
 */
export function BestOrderFormBody({
  form,
  setForm,
  accounts,
  accountId,
  setAccountId,
  customReturn,
  setCustomReturn,
  // Mặc định "best" để test/call-site sẵn có (dialog gửi đi/thu hồi) không
  // phải đổi. §7 bung inline truyền prefix riêng theo hành trình — một phiếu
  // BH có nhiều hành trình, mỗi thẻ mở độc lập nên id phải phân biệt được,
  // nếu không hai khối cùng bung sẽ trùng id và <label htmlFor> lái focus
  // nhầm sang form ĐẦU TIÊN trên trang (review finding 3).
  idPrefix = "best",
}: {
  form: BestOrderFormState;
  setForm: React.Dispatch<React.SetStateAction<BestOrderFormState | null>>;
  accounts: BestAccount[];
  accountId: string;
  setAccountId: (id: string) => void;
  customReturn: boolean;
  setCustomReturn: (value: boolean) => void;
  idPrefix?: string;
}) {
  const setField = <K extends keyof BestOrderFormState>(key: K, value: BestOrderFormState[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  return (
    <div className="space-y-6">
      <FormGrid>
        <Field label="Loại đơn hàng" htmlFor={`${idPrefix}-journey-type`}>
          <Select
            value={String(form.journeyType)}
            onValueChange={(value) =>
              setForm((f) => (f ? applyJourneyType(f, Number(value) as BestJourneyType) : f))
            }
          >
            <SelectTrigger id={`${idPrefix}-journey-type`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JOURNEY_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {accounts.length > 1 && (
          <Field label="Tài khoản Best" htmlFor={`${idPrefix}-account`}>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger id={`${idPrefix}-account`} className="w-full">
                <SelectValue placeholder="Chọn tài khoản" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.name} ({a.environment})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        <Field label="Mã đơn (Code)" htmlFor={`${idPrefix}-code`}>
          <Input
            id={`${idPrefix}-code`}
            value={form.code}
            onChange={(e) => setField("code", e.target.value)}
          />
        </Field>
        <Field label="Tên hàng" htmlFor={`${idPrefix}-product`}>
          <Input
            id={`${idPrefix}-product`}
            value={form.productName}
            onChange={(e) => setField("productName", e.target.value)}
          />
        </Field>
        <Field label="Cân nặng (gram)" htmlFor={`${idPrefix}-weight`}>
          <Input
            id={`${idPrefix}-weight`}
            type="number"
            value={form.weight}
            onChange={(e) => setField("weight", e.target.value)}
          />
        </Field>
        <Field label="Khai giá" htmlFor={`${idPrefix}-declared`}>
          <Input
            id={`${idPrefix}-declared`}
            type="number"
            step="0.01"
            value={form.declaredValue}
            onChange={(e) => setField("declaredValue", e.target.value)}
          />
        </Field>
        <Field label="Thu hộ (COD)" htmlFor={`${idPrefix}-cod`}>
          <Input
            id={`${idPrefix}-cod`}
            type="number"
            step="0.01"
            value={form.cod}
            onChange={(e) => setField("cod", e.target.value)}
          />
        </Field>
        <Field label="Dài (cm)" htmlFor={`${idPrefix}-length`}>
          <Input
            id={`${idPrefix}-length`}
            type="number"
            value={form.length}
            onChange={(e) => setField("length", e.target.value)}
          />
        </Field>
        <Field label="Rộng (cm)" htmlFor={`${idPrefix}-width`}>
          <Input
            id={`${idPrefix}-width`}
            type="number"
            value={form.width}
            onChange={(e) => setField("width", e.target.value)}
          />
        </Field>
        <Field label="Cao (cm)" htmlFor={`${idPrefix}-height`}>
          <Input
            id={`${idPrefix}-height`}
            type="number"
            value={form.height}
            onChange={(e) => setField("height", e.target.value)}
          />
        </Field>
      </FormGrid>

      <AddressFields
        icon={PackageOpen}
        title={JOURNEY_TYPE_BLOCK_LABELS[form.journeyType].from}
        block={form.from}
        onChange={(updater) => setForm((f) => (f ? { ...f, from: updater(f.from) } : f))}
        idPrefix={`${idPrefix}-from`}
      />
      <AddressFields
        icon={Inbox}
        title={JOURNEY_TYPE_BLOCK_LABELS[form.journeyType].to}
        block={form.to}
        onChange={(updater) => setForm((f) => (f ? { ...f, to: updater(f.to) } : f))}
        idPrefix={`${idPrefix}-to`}
      />

      <section>
        <SectionTitle icon={NotebookPen}>Ghi chú cho bưu tá</SectionTitle>
        <Field label="Ghi chú" htmlFor={`${idPrefix}-note`}>
          <Input
            id={`${idPrefix}-note`}
            value={form.note}
            onChange={(e) => setField("note", e.target.value)}
            placeholder="Để lại lời nhắn cho nhân viên giao hàng"
          />
        </Field>
        <div className="mt-2 flex flex-wrap gap-2">
          {NOTE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent"
              onClick={() => setField("note", preset)}
            >
              {preset}
            </button>
          ))}
        </div>
      </section>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4"
          checked={!customReturn}
          onChange={(e) => setCustomReturn(!e.target.checked)}
        />
        Hàng không phát được hoàn về địa chỉ kho gửi
      </label>
      {customReturn && (
        <AddressFields
          icon={Undo2}
          title="Địa chỉ hoàn (khác kho)"
          block={form.returnBlock}
          onChange={(updater) =>
            setForm((f) => (f ? { ...f, returnBlock: updater(f.returnBlock) } : f))
          }
          idPrefix={`${idPrefix}-return`}
        />
      )}
    </div>
  );
}
