import type { WarrantyJourney } from "@/features/warranty-claims/warranty-claim-types";
import { swallowError } from "@/lib/errors";

/**
 * Logic thuần cho form tạo đơn Best từ hành trình BH — không React, test được.
 * Payload Order/Add build theo tài liệu Best V3 (BE passthrough, Best validate).
 */

export type BestLeg = "new" | "recall" | "return";

export const LEG_FIELD = {
  new: "new_tracking_code",
  recall: "recall_code",
  return: "return_tracking_code",
} as const satisfies Record<BestLeg, string>;

export const LEG_LABEL: Record<BestLeg, string> = {
  new: "Gửi đi",
  recall: "Thu hồi",
  return: "Gửi lại khách",
};

/** Loại đơn hàng theo tài liệu Best V3. */
export type BestJourneyType = 1 | 2 | 3;

export const JOURNEY_TYPE_OPTIONS: { value: BestJourneyType; label: string }[] = [
  { value: 1, label: "Giao hàng" },
  { value: 2, label: "Thu hồi" },
  { value: 3, label: "Đơn đổi hàng" },
];

/**
 * Nhãn 2 khối địa chỉ đổi theo loại đơn — giống form web của Best. Vị trí trong
 * payload KHÔNG đổi: Source luôn là bên đưa hàng cho bưu tá.
 */
export const JOURNEY_TYPE_BLOCK_LABELS: Record<BestJourneyType, { from: string; to: string }> = {
  1: { from: "Người gửi", to: "Người nhận" },
  2: { from: "Người mua", to: "Shop" },
  3: { from: "Shop", to: "Người mua" },
};

/** Phía nào của payload là SHOP — đơn thu hồi thì shop là bên nhận. */
export function shopSideOf(journeyType: BestJourneyType): "from" | "to" {
  return journeyType === 2 ? "to" : "from";
}

/** Phía còn lại là khách. */
export function customerSideOf(journeyType: BestJourneyType): "from" | "to" {
  return shopSideOf(journeyType) === "from" ? "to" : "from";
}

/**
 * Đổi loại đơn. Nếu shop chuyển phía (vd. 1 → 2) thì swap nội dung 2 khối, nếu
 * không dữ liệu sẽ đứng nguyên dưới nhãn mới và bị gửi sai bên.
 */
export function applyJourneyType(
  form: BestOrderFormState,
  nextType: BestJourneyType,
): BestOrderFormState {
  if (shopSideOf(form.journeyType) === shopSideOf(nextType)) {
    return { ...form, journeyType: nextType };
  }
  return { ...form, journeyType: nextType, from: form.to, to: form.from };
}

const LEG_JOURNEY_TYPE: Record<BestLeg, BestJourneyType> = {
  new: 1,
  recall: 2,
  return: 1,
};

/** 1 khối địa chỉ trên form. `district` rỗng = địa chỉ 2 cấp mới. */
export type AddressBlock = {
  name: string;
  phone: string;
  city: string;
  district: string;
  ward: string;
  address: string;
  /** Chuỗi địa chỉ đầy đủ người dùng dán vào để parse — không gửi lên Best. */
  raw: string;
};

export const EMPTY_ADDRESS: AddressBlock = {
  name: "",
  phone: "",
  city: "",
  district: "",
  ward: "",
  address: "",
  raw: "",
};

/** Phần kết quả của `POST /api/orders/parse-address` mà form Best dùng tới. */
export type ParsedAddressLike = {
  address?: string;
  ward?: string;
  district?: string;
  province?: string;
};

/** Đổ kết quả parse vào khối địa chỉ — parser trả rỗng thì giữ giá trị đang có. */
export function applyParsedAddress(block: AddressBlock, parsed: ParsedAddressLike): AddressBlock {
  const keep = (value: string | undefined, current: string) => (value || "").trim() || current;
  return {
    ...block,
    city: keep(parsed.province, block.city),
    district: keep(parsed.district, block.district),
    ward: keep(parsed.ward, block.ward),
    address: keep(parsed.address, block.address),
  };
}

export type BestOrderFormState = {
  leg: BestLeg;
  journeyType: BestJourneyType;
  code: string;
  productName: string;
  weight: string; // gram
  declaredValue: string;
  cod: string;
  /** Kích thước (cm) — rỗng thì không gửi lên Best. */
  length: string;
  width: string;
  height: string;
  /** Ghi chú cho bưu tá. */
  note: string;
  /** Bên GIAO hàng cho Best (Source). */
  from: AddressBlock;
  /** Bên NHẬN hàng (Dest). */
  to: AddressBlock;
  /** Hàng không phát được trả về đâu (Return) — mặc định = địa chỉ kho. */
  returnBlock: AddressBlock;
};

/** Câu ghi chú bấm nhanh — lấy nguyên các chip của form web Best. */
export const NOTE_PRESETS: string[] = [
  "cho khách xem hàng, không cho thử",
  "không cho xem hàng",
  "cho khách xem và thử hàng",
  "nếu giao không thành công liên hệ shop",
  "Hàng dễ vỡ, vui lòng nhẹ tay",
  "Gọi điện cho khách trước khi giao",
  "Giao hàng vào giờ hành chính",
  "Cho xem hàng, không được bóc hộp",
];

const LEG_SUFFIX: Record<BestLeg, string> = { new: "N", recall: "R", return: "S" };
const RAND_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Gợi ý mã đơn (merchant_order_code — unique): BHJ<journeyId><N|R|S>-<4 ký tự>. */
export function suggestMerchantCode(journeyId: number, leg: BestLeg): string {
  let rand = "";
  for (let i = 0; i < 4; i += 1) {
    rand += RAND_CHARS[Math.floor(Math.random() * RAND_CHARS.length)];
  }
  return `BHJ${journeyId}${LEG_SUFFIX[leg]}-${rand}`;
}

/** Khối địa chỉ KHÁCH prefill từ người nhận của hành trình (city/ward user tự điền). */
function customerBlock(journey: WarrantyJourney): AddressBlock {
  return {
    ...EMPTY_ADDRESS,
    name: journey.receiver_name,
    phone: journey.receiver_phone,
    address: journey.receiver_raw_address,
    raw: journey.receiver_raw_address,
  };
}

/**
 * Form mặc định theo chặng: gửi đi/gửi lại = kho → khách; thu hồi = khách → kho.
 * Chặng gửi lại dùng khai giá/COD của phần CSKH chốt phương án.
 */
export function defaultFormForLeg(
  journey: WarrantyJourney,
  leg: BestLeg,
  sender: AddressBlock,
): BestOrderFormState {
  const customer = customerBlock(journey);
  const isRecall = leg === "recall";
  const isResend = leg === "return";
  return {
    leg,
    journeyType: LEG_JOURNEY_TYPE[leg],
    code: suggestMerchantCode(journey.id, leg),
    productName: journey.product_sku || journey.product_name || "",
    weight: "500",
    declaredValue: isResend ? journey.resolution_declared_value : journey.declared_value,
    cod: isResend ? journey.resolution_cod : journey.cod_amount,
    length: "",
    width: "",
    height: "",
    note: "",
    from: isRecall ? customer : sender,
    to: isRecall ? sender : customer,
    returnBlock: sender,
  };
}

const num = (v: string): number => {
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Kích thước là tùy chọn — Best hiểu "thiếu key" là không khai, gửi 0 thì không. */
function optionalNum(value: string, key: string): Record<string, number> {
  const parsed = num(value);
  return parsed > 0 ? { [key]: parsed } : {};
}

/**
 * Payload Order/Add nguyên bản Best V3.
 *
 * Tên trường tiền là `ProductPrice` (khai giá) và `CollectAmount` (thu hộ) —
 * KHÔNG phải `DeclareValue`/`CollectionValue`; gửi sai tên thì Best bỏ qua và
 * đơn ra COD = 0.
 */
export function buildOrderAddPayload(form: BestOrderFormState): Record<string, unknown> {
  return {
    Code: form.code.trim(),
    ProductName: form.productName.trim(),
    JourneyType: form.journeyType,
    ServiceId: 12491,
    PickupType: 2,
    Weight: num(form.weight),
    ProductPrice: num(form.declaredValue),
    CollectAmount: num(form.cod),
    ...optionalNum(form.length, "Length"),
    ...optionalNum(form.width, "Width"),
    ...optionalNum(form.height, "Height"),
    Note: form.note.trim(),
    SourceName: form.from.name.trim(),
    SourcePhoneNumber: form.from.phone.trim(),
    SourceCity: form.from.city.trim(),
    SourceDistrict: form.from.district.trim(),
    SourceWard: form.from.ward.trim(),
    SourceAddress: form.from.address.trim(),
    DestName: form.to.name.trim(),
    DestPhoneNumber: form.to.phone.trim(),
    DestCity: form.to.city.trim(),
    DestDistrict: form.to.district.trim(),
    DestWard: form.to.ward.trim(),
    DestAddress: form.to.address.trim(),
    ReturnName: form.returnBlock.name.trim(),
    ReturnPhoneNumber: form.returnBlock.phone.trim(),
    ReturnCity: form.returnBlock.city.trim(),
    ReturnDistrict: form.returnBlock.district.trim(),
    ReturnWard: form.returnBlock.ward.trim(),
    ReturnAddress: form.returnBlock.address.trim(),
  };
}

const SENDER_STORAGE_KEY = "warranty-best-sender-address";

/** Địa chỉ kho gửi đã nhớ từ lần tạo trước (localStorage) — hỏng/thiếu → rỗng. */
export function loadSenderAddress(): AddressBlock {
  try {
    const raw = window.localStorage.getItem(SENDER_STORAGE_KEY);
    if (!raw) return { ...EMPTY_ADDRESS };
    const parsed = JSON.parse(raw) as Partial<AddressBlock>;
    return {
      name: String(parsed.name ?? ""),
      phone: String(parsed.phone ?? ""),
      city: String(parsed.city ?? ""),
      district: String(parsed.district ?? ""),
      ward: String(parsed.ward ?? ""),
      address: String(parsed.address ?? ""),
      raw: String(parsed.raw ?? ""),
    };
  } catch {
    return { ...EMPTY_ADDRESS };
  }
}

export function saveSenderAddress(block: AddressBlock): void {
  try {
    window.localStorage.setItem(SENDER_STORAGE_KEY, JSON.stringify(block));
  } catch (err) {
    // localStorage đầy/không khả dụng — bỏ qua, lần sau nhập lại.
    swallowError(err, "warranty.best.senderAddress.storage");
  }
}
