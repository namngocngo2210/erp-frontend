/**
 * Dedup mã quét camera: cửa sổ TRƯỢT theo lần-thấy-cuối, độc lập theo từng mã.
 *
 * Vòng detect camera bắt cùng một barcode mỗi frame khi người dùng giữ điện
 * thoại trên tem. Mỗi lần "thấy" đều refresh mốc thời gian, nên mã còn trong
 * khung hình thì KHÔNG bao giờ bắn lại — chỉ khi mã rời khung đủ `windowMs`
 * mới được bắn lần nữa. Theo dõi mọi mã từng thấy (không chỉ mã cuối) để tem
 * có nhiều barcode luân phiên A/B không lọt qua dedup.
 */
export function createScanDeduper(windowMs: number): (code: string, now: number) => boolean {
  const lastSeenAt = new Map<string, number>();
  return (code, now) => {
    const prev = lastSeenAt.get(code);
    lastSeenAt.set(code, now);
    return prev === undefined || now - prev >= windowMs;
  };
}
