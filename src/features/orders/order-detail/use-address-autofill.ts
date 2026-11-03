import { toast } from "sonner";

import { parseAddress, parseAddressLevel2 } from "@/lib/api/orders";
import { swallowError } from "@/lib/errors";
import type { OrderRow } from "../order-types";

/** Tự điền các field địa chỉ khi sale sửa "Địa chỉ thô" / "Địa chỉ 2 cấp". */
export function useAddressAutofill(patch: (p: Partial<OrderRow>) => void) {
  // Đưa raw_address vào pending rồi gọi parse để tự fill địa chỉ 3 cấp / 2 cấp /
  // khu vực / phường xã. Backend vẫn re-parse khi save thật (raw_address có trong
  // payload), FE chỉ preview. Dùng chung cho ô "Địa chỉ thô" và nút "Quy đổi 2 cấp".
  const applyRawAddress = async (nextRaw: string) => {
    patch({ raw_address: nextRaw });
    if (!nextRaw.trim()) return;
    try {
      const data = await parseAddress(nextRaw);
      patch({
        address: data.address ?? "",
        kiotviet_location: data.kiotviet_location ?? "",
        kiotviet_ward: data.kiotviet_ward ?? "",
        ward_code: data.ward_code ?? "",
        district_code: data.district_code ?? "",
        province_code: data.province_code ?? "",
        // Chỉ để preview: backend bỏ qua khi PATCH và tự tính lại.
        address_level2: data.address_level2 ?? "",
        ward_level2: data.ward_level2 ?? "",
        province_level2: data.province_level2 ?? "",
      });
    } catch (err) {
      // ignore — backend sẽ parse lại lúc save
      swallowError(err, "orders.detail.parseAddress");
    }
  };

  // Sale sửa tay ô "Địa chỉ 2 cấp": tách tỉnh mới/phường mới + Khu vực/Phường xã Kiot
  // từ chính chuỗi đó (không đụng Địa chỉ thô / 3 cấp). Không tra được Kiot thì giữ
  // Khu vực/Phường xã cũ. Backend PATCH tính lại y hệt khi bấm Lưu.
  const applyAddressLevel2 = async (next: string) => {
    patch({ address_level2: next });
    if (!next.trim()) return;
    try {
      const data = await parseAddressLevel2(next);
      const matched = Boolean(data.kiotviet_location && data.kiotviet_ward);
      patch({
        ward_level2: data.ward_level2 ?? "",
        province_level2: data.province_level2 ?? "",
        ...(matched
          ? { kiotviet_location: data.kiotviet_location, kiotviet_ward: data.kiotviet_ward }
          : {}),
      });
      if (!matched) {
        toast.warning(
          "Không tra được tỉnh/phường mới trong danh mục Kiot — giữ nguyên Khu vực/Phường xã cũ",
        );
      }
    } catch (err) {
      // ignore — backend sẽ parse lại lúc save
      swallowError(err, "orders.detail.parseAddressLevel2");
    }
  };

  return { applyRawAddress, applyAddressLevel2 };
}
