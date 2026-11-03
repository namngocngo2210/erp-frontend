import { useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";
import { lookupAddress, type AddressLookupResult } from "@/lib/api/orders";

import { AddressResultCard } from "@/features/address-lookup/components/AddressResultCard";

const SOURCE_NOTE: Record<AddressLookupResult["level2"]["source"], string> = {
  converted: "Quy đổi từ địa chỉ 3 cấp theo bảng sáp nhập 01/07/2025.",
  parsed: "Chuỗi nhập đã ở cấu trúc mới (phường/xã + tỉnh), không cần quy đổi.",
  "": "",
};

/**
 * Tiện ích › Tra cứu địa chỉ: nhập địa chỉ thô, trả về địa chỉ chuẩn 3 cấp
 * (tỉnh – quận/huyện – phường/xã, 63 tỉnh) và 2 cấp (tỉnh – phường/xã, 34 tỉnh).
 * Không lưu gì; chỉ gọi POST /api/orders/lookup-address.
 */
export default function AddressLookupPage() {
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState<AddressLookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = raw.trim().length > 0 && !loading;

  async function submit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await lookupAddress(raw.trim()));
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Tra cứu thất bại, thử lại sau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tra cứu địa chỉ"
        description="Nhập địa chỉ khách ghi tự do, hệ thống trả về địa chỉ chuẩn theo 3 cấp (cũ) và 2 cấp (sau sáp nhập 01/07/2025)."
      />

      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label htmlFor="address-lookup-input" className="text-sm font-medium">
          Địa chỉ thô
        </label>
        <Textarea
          id="address-lookup-input"
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          onKeyDown={(event) => {
            // Enter = tra cứu; Shift+Enter xuống dòng cho địa chỉ dài.
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder="VD: Số 5 ngõ 12 Chùa Láng, Láng Thượng, Đống Đa, Hà Nội"
          rows={3}
          autoFocus
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={!canSubmit}>
            <Search className="h-4 w-4" />
            {loading ? "Đang tra cứu…" : "Tra cứu"}
          </Button>
          <span className="text-xs text-muted-foreground">
            Enter để tra cứu · Shift+Enter xuống dòng
          </span>
        </div>
      </form>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <AddressResultCard
            title="Địa chỉ 3 cấp"
            description="Tỉnh/Thành phố – Quận/Huyện – Phường/Xã (63 tỉnh, trước 01/07/2025)"
            address={result.level3.address}
            fields={[
              { label: "Số nhà, đường", value: result.level3.street },
              { label: "Phường/Xã", value: result.level3.ward },
              { label: "Quận/Huyện", value: result.level3.district },
              { label: "Tỉnh/Thành phố", value: result.level3.province },
            ]}
          />
          <AddressResultCard
            title="Địa chỉ 2 cấp"
            description="Tỉnh/Thành phố – Phường/Xã (34 tỉnh, sau sáp nhập)"
            address={result.level2.address}
            note={SOURCE_NOTE[result.level2.source]}
            fields={[
              { label: "Số nhà, đường", value: result.level2.street },
              { label: "Phường/Xã", value: result.level2.ward },
              { label: "Tỉnh/Thành phố", value: result.level2.province },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}
