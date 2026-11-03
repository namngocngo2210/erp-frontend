import { describe, expect, it } from "vitest";

import {
  RECONNECT_MAX_DELAY_MS,
  RECONNECT_MIN_DELAY_MS,
  computeReconnectDelay,
} from "../websocket";

describe("computeReconnectDelay", () => {
  it("giãn theo cấp số nhân qua từng lần thử", () => {
    // random() = 1 → lấy đúng cận trên của mỗi bậc.
    const ceilings = [1, 2, 3, 4, 5].map((attempt) => computeReconnectDelay(attempt, () => 1));
    expect(ceilings).toEqual([1000, 2000, 4000, 8000, 16000]);
  });

  it("không vượt trần dù thử rất nhiều lần", () => {
    expect(computeReconnectDelay(20, () => 1)).toBe(RECONNECT_MAX_DELAY_MS);
  });

  it("không bao giờ xuống dưới sàn — tránh đập lại server tức thì", () => {
    expect(computeReconnectDelay(1, () => 0)).toBe(RECONNECT_MIN_DELAY_MS);
    expect(computeReconnectDelay(9, () => 0)).toBe(RECONNECT_MIN_DELAY_MS);
  });

  // Regression sự cố 2026-07-23: một gunicorn worker recycle làm ~96 tab rớt cùng
  // lúc; backoff cũ không có jitter nên tất cả thử lại đúng cùng mili-giây, mở ~96
  // connection Postgres đồng thời cho bước xác thực JWT và cạn max_connections=100.
  // Với backoff cũ (1000 * 2^(n-1)) toàn bộ 100 client rơi vào CÙNG một ô 1 giây.
  it("phân tán client rớt cùng lúc thay vì dồn tất cả vào một giây", () => {
    const CLIENTS = 100;
    const buckets = new Map<number, number>();

    for (let i = 0; i < CLIENTS; i += 1) {
      const second = Math.floor(computeReconnectDelay(5) / 1000);
      buckets.set(second, (buckets.get(second) ?? 0) + 1);
    }

    const busiestSecond = Math.max(...buckets.values());
    expect(busiestSecond).toBeLessThan(CLIENTS / 4);
  });
});
