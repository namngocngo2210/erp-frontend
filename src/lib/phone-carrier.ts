/**
 * Nhận diện nhà mạng VN theo đầu số di động (3 số đầu sau khi normalize).
 *
 * Giới hạn đã thống nhất: số "chuyển mạng giữ số" (MNP, ~2-3%) vẫn hiện theo
 * nhà mạng gốc của đầu số — muốn chính xác tuyệt đối phải tra API bên thứ ba.
 * Bảng đầu số mirror với backend `apps/orders/phone_carrier.py` — sửa một bên
 * phải sửa bên kia.
 */

export type CarrierKey =
  | "viettel"
  | "vinaphone"
  | "mobifone"
  | "vietnamobile"
  | "gmobile"
  | "itel"
  | "wintel";

export type CarrierInfo = {
  key: CarrierKey;
  /** Tên đầy đủ (dùng cho báo cáo). */
  label: string;
  /** Nhãn ngắn in hoa hiển thị dưới SĐT. */
  shortLabel: string;
};

const CARRIERS: Record<CarrierKey, { label: string; shortLabel: string; prefixes: string[] }> = {
  viettel: {
    label: "Viettel",
    shortLabel: "VIETTEL",
    prefixes: ["032", "033", "034", "035", "036", "037", "038", "039", "086", "096", "097", "098"],
  },
  vinaphone: {
    label: "Vinaphone",
    shortLabel: "VINA",
    prefixes: ["081", "082", "083", "084", "085", "088", "091", "094"],
  },
  mobifone: {
    label: "MobiFone",
    shortLabel: "MOBI",
    prefixes: ["070", "076", "077", "078", "079", "089", "090", "093"],
  },
  vietnamobile: {
    label: "Vietnamobile",
    shortLabel: "VNMOBI",
    prefixes: ["052", "056", "058", "092"],
  },
  gmobile: { label: "Gmobile", shortLabel: "GMOBILE", prefixes: ["059", "099"] },
  itel: { label: "iTel", shortLabel: "ITEL", prefixes: ["087"] },
  wintel: { label: "Wintel", shortLabel: "WINTEL", prefixes: ["055"] },
};

const PREFIX_TO_CARRIER: ReadonlyMap<string, CarrierKey> = new Map(
  (Object.keys(CARRIERS) as CarrierKey[]).flatMap((key) =>
    CARRIERS[key].prefixes.map((prefix): [string, CarrierKey] => [prefix, key]),
  ),
);

/**
 * Đưa SĐT nhập tay/import về dạng `0xxxxxxxxx`: bỏ ký tự không phải số,
 * `+84`/`84` → `0`, số 9 chữ số mất số 0 đầu (Excel) → thêm lại `0`.
 */
export function normalizePhoneDigits(raw: string): string {
  let digits = (raw || "").replace(/\D/g, "");
  if (digits.startsWith("84") && digits.length >= 11) digits = `0${digits.slice(2)}`;
  if (digits.length === 9 && !digits.startsWith("0")) digits = `0${digits}`;
  return digits;
}

/** Nhà mạng của một SĐT, `null` khi không nhận diện được (số bàn, số rác...). */
export function getCarrier(raw: string): CarrierInfo | null {
  const digits = normalizePhoneDigits(raw);
  const key = PREFIX_TO_CARRIER.get(digits.slice(0, 3));
  if (!key) return null;
  const { label, shortLabel } = CARRIERS[key];
  return { key, label, shortLabel };
}

/** Màu chữ nhận diện thương hiệu cho nhãn nhà mạng dưới SĐT. */
export const CARRIER_TEXT_CLASS: Record<CarrierKey, string> = {
  viettel: "text-red-600",
  vinaphone: "text-sky-600",
  mobifone: "text-blue-700",
  vietnamobile: "text-orange-500",
  gmobile: "text-purple-600",
  itel: "text-rose-500",
  wintel: "text-emerald-600",
};
