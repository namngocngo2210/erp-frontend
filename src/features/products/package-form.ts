import type { ProductPackage, ProductPackageInput } from "@/lib/api/products";

export type PackageFormNumField = "quantity" | "weight" | "length" | "width" | "height";

export type PackageForm = {
  id?: number;
  quantity: number | "";
  /** Giá theo code bảng giá. Ô để trống = kế thừa bảng giá mặc định. */
  prices: Record<string, number | "">;
  weight: number | "";
  length: number | "";
  width: number | "";
  height: number | "";
};

export const EMPTY_PACKAGE = (quantity: number | "" = ""): PackageForm => ({
  quantity,
  prices: {},
  weight: "",
  length: "",
  width: "",
  height: "",
});

export const numOrEmptyFromUnknown = (v: number | string | undefined | null): number | "" => {
  if (v === undefined || v === null || v === "") return "";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n === 0) return "";
  return n;
};

// Trả `ProductPackageInput` (type GHI, không có `price`) — BE khai `price`
// `read_only_fields` nên payload không cần/không nên gửi field đó, BE tự
// resolve từ `prices[default_book]`. Không cần cast: object trả về thoả type
// một cách trung thực, thiếu/rớt field khác vẫn bị `tsc` bắt.
export const packageFormToPayload = (p: PackageForm): ProductPackageInput => {
  const prices: Record<string, number> = {};
  for (const [code, value] of Object.entries(p.prices)) {
    if (value === "" || value === null || value === undefined) continue;
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) prices[code] = n;
  }
  return {
    ...(p.id ? { id: p.id } : {}),
    quantity: p.quantity === "" ? 0 : Number(p.quantity),
    prices,
    weight: p.weight === "" ? 0 : Number(p.weight),
    length: p.length === "" ? 0 : Number(p.length),
    width: p.width === "" ? 0 : Number(p.width),
    height: p.height === "" ? 0 : Number(p.height),
  };
};

// Đọc từ API — data thật luôn có `price` (readonly) + `prices` dạng
// decimal-string, KHÁC hẳn `ProductPackageInput` (type GHI, `prices` number).
// `sortedPackageForms` không đọc `pkg.price` ở đâu cả nên nới type tham số bỏ
// field đó — data thật (có `price`) vẫn gán được vào type hẹp hơn này bình
// thường (structural subtyping), fixture test thiếu `price` cũng hợp lệ.
type PackageApiRead = Omit<ProductPackage, "price">;

export const sortedPackageForms = (packages: PackageApiRead[] | undefined): PackageForm[] => {
  const list = Array.isArray(packages) ? packages : [];
  const mapped = list.map<PackageForm>((pkg) => {
    const prices: Record<string, number | ""> = {};
    for (const [code, value] of Object.entries(pkg.prices ?? {})) {
      prices[code] = numOrEmptyFromUnknown(value as string);
    }
    return {
      id: pkg.id,
      quantity: numOrEmptyFromUnknown(pkg.quantity) || (pkg.quantity ? Number(pkg.quantity) : ""),
      prices,
      weight: numOrEmptyFromUnknown(pkg.weight),
      length: numOrEmptyFromUnknown(pkg.length),
      width: numOrEmptyFromUnknown(pkg.width),
      height: numOrEmptyFromUnknown(pkg.height),
    };
  });
  if (!mapped.some((p) => Number(p.quantity) === 1)) {
    mapped.unshift(EMPTY_PACKAGE(1));
  }
  return mapped.sort((a, b) => Number(a.quantity || 0) - Number(b.quantity || 0));
};
