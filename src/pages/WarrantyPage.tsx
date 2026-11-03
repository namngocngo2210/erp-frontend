import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { type WarrantySource } from "@/lib/api/warranty";
import { useSubmitWarranty } from "@/features/warranty/queries";

const SOURCE_OPTIONS: { value: WarrantySource; label: string }[] = [
  { value: "tiktok", label: "TikTok" },
  { value: "shopee", label: "Shopee" },
  { value: "facebook", label: "Facebook" },
];

export default function WarrantyPage() {
  const [source, setSource] = useState<WarrantySource | "">("");
  const [invoiceCode, setInvoiceCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { mutate, isPending } = useSubmitWarranty();

  const reset = () => {
    setSource("");
    setInvoiceCode("");
    setFullName("");
    setPhone("");
    setEmail("");
    setNote("");
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!source) {
      toast.error("Vui lòng chọn nguồn đơn.");
      return;
    }
    if (!invoiceCode.trim() || !fullName.trim() || !phone.trim()) {
      toast.error("Vui lòng điền đủ Mã hóa đơn, Họ tên, SDT.");
      return;
    }

    mutate(
      {
        source,
        invoice_code: invoiceCode.trim(),
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        note: note.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Đã gửi thông tin bảo hành thành công!");
          setSubmitted(true);
          reset();
        },
        onError: (err) => {
          const msg =
            err instanceof Error ? err.message : "Gửi thông tin thất bại. Vui lòng thử lại.";
          toast.error(msg);
        },
      },
    );
  };

  return (
    <div className="min-h-dvh bg-muted/30 flex items-stretch justify-center p-4 sm:p-8">
      <Card className="w-full max-w-xl flex flex-col">
        <CardHeader>
          <img src="/delax.png" alt="Delax" className="mx-auto mb-3 h-20 w-auto object-contain" />
          <CardTitle className="text-2xl text-center">Đăng ký bảo hành</CardTitle>
          <CardDescription className="text-center">
            Vui lòng điền thông tin bên dưới để chúng tôi tiếp nhận yêu cầu bảo hành.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          {submitted && (
            <div className="mb-4 rounded-lg border border-action-success/30 bg-action-success/10 px-3 py-2 text-sm text-action-success">
              Thông tin của bạn đã được tiếp nhận. Bộ phận CSKH sẽ liên hệ sớm.
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Nguồn đơn <span className="text-action-danger">*</span>
              </label>
              <Select value={source} onValueChange={(v) => setSource(v as WarrantySource)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn nguồn đơn" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Mã hóa đơn <span className="text-action-danger">*</span>
              </label>
              <Input
                value={invoiceCode}
                onChange={(e) => setInvoiceCode(e.target.value)}
                placeholder="VD: HD123456"
                maxLength={100}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Họ tên <span className="text-action-danger">*</span>
              </label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Họ và tên"
                maxLength={255}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Số điện thoại <span className="text-action-danger">*</span>
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="VD: 0901234567"
                inputMode="tel"
                maxLength={30}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                maxLength={255}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Ghi chú</label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Mô tả thêm về tình trạng sản phẩm (nếu có)"
                rows={4}
              />
            </div>

            <Button type="submit" className="w-full mt-auto" disabled={isPending}>
              {isPending ? "Đang gửi..." : "Gửi thông tin"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
}
