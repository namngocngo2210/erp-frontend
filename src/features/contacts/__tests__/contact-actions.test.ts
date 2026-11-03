import { describe, expect, it } from "vitest";

import {
  CHIP_ORDER,
  CONTACT_ACTIONS,
  defaultDateFilter,
  humanizeWaiting,
  waitingTooltip,
  waitingUrgencyClass,
  type ContactActionKey,
} from "../contact-actions";

describe("CONTACT_ACTIONS", () => {
  const allKeys: ContactActionKey[] = [
    "new_customer",
    "new_lead",
    "call_2",
    "call_3",
    "call_4",
    "call_5",
    "call_6",
    "recheck_phone",
    "nurture",
    "follow_up",
    "awaiting_delivery",
    "post_sale",
    "none",
  ];

  it("has a non-empty label and badgeClass for every action key", () => {
    allKeys.forEach((key) => {
      expect(CONTACT_ACTIONS[key]).toBeDefined();
      expect(CONTACT_ACTIONS[key].label.length).toBeGreaterThan(0);
      expect(CONTACT_ACTIONS[key].badgeClass.length).toBeGreaterThan(0);
    });
  });
});

describe("CHIP_ORDER", () => {
  it("does not include none", () => {
    expect(CHIP_ORDER).not.toContain("none");
  });

  it("only references keys defined in CONTACT_ACTIONS", () => {
    CHIP_ORDER.forEach((key) => {
      expect(CONTACT_ACTIONS[key]).toBeDefined();
    });
  });

  it("has no duplicate keys", () => {
    expect(new Set(CHIP_ORDER).size).toBe(CHIP_ORDER.length);
  });

  it("giữ chuỗi gọi liên tục call_2..call_6 rồi mới tới recheck_phone", () => {
    // Chip xếp theo nhịp tác nghiệp. Thêm mốc "không nghe máy" mới mà quên chèn
    // chip thì sale không lọc được nhóm đó — lỗi im lặng, không văng lỗi.
    const calls = CHIP_ORDER.filter((key) => key.startsWith("call_"));
    expect(calls).toEqual(["call_2", "call_3", "call_4", "call_5", "call_6"]);
    expect(CHIP_ORDER.indexOf("recheck_phone")).toBe(CHIP_ORDER.indexOf("call_6") + 1);
  });
});

describe("humanizeWaiting", () => {
  const now = new Date("2026-07-15T12:00:00Z");

  it("returns — when waiting_since is null", () => {
    expect(humanizeWaiting(null, now)).toBe("—");
  });

  it("returns — for an invalid ISO string", () => {
    expect(humanizeWaiting("not-a-date", now)).toBe("—");
  });

  it("returns <1h when waiting less than an hour", () => {
    const iso = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    expect(humanizeWaiting(iso, now)).toBe("<1h");
  });

  it("returns Xh when waiting a few hours (mốc 2h)", () => {
    const iso = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    expect(humanizeWaiting(iso, now)).toBe("2h");
  });

  it("returns Xd when waiting multiple days (mốc 3d)", () => {
    const iso = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(humanizeWaiting(iso, now)).toBe("3d");
  });

  // Các mốc lẻ — bắt regression floor vs round/ceil (fixture chẵn chia hết
  // thì floor/round/ceil cho cùng kết quả, không phát hiện được).
  const minutes = (m: number) => new Date(now.getTime() - m * 60 * 1000).toISOString();

  it("floors within the hour branch: 2h50m → 2h (not 3h)", () => {
    expect(humanizeWaiting(minutes(2 * 60 + 50), now)).toBe("2h");
  });

  it("crosses into hours exactly at 1h0m → 1h", () => {
    expect(humanizeWaiting(minutes(60), now)).toBe("1h");
  });

  it("stays in hours just under a day: 23h59m → 23h", () => {
    expect(humanizeWaiting(minutes(23 * 60 + 59), now)).toBe("23h");
  });

  it("crosses into days exactly at 24h0m → 1d", () => {
    expect(humanizeWaiting(minutes(24 * 60), now)).toBe("1d");
  });

  it("floors within the day branch: 24h1m → 1d and 71h → 2d (not 3d)", () => {
    expect(humanizeWaiting(minutes(24 * 60 + 1), now)).toBe("1d");
    expect(humanizeWaiting(minutes(71 * 60), now)).toBe("2d");
  });

  it("stays <1h just under the hour: 59m59s", () => {
    const iso = new Date(now.getTime() - (59 * 60 + 59) * 1000).toISOString();
    expect(humanizeWaiting(iso, now)).toBe("<1h");
  });
});

describe("defaultDateFilter", () => {
  it("mặc định là một khoảng ngày NON-RỖNG (không quét toàn bộ khi vào trang)", () => {
    // Trống date_from/date_to = list query materialize toàn bộ khách (seq-scan,
    // ~7s prod). Test này chốt: trang luôn vào với một khoảng ngày bị chặn.
    const value = defaultDateFilter();
    expect(value.option).toBe("this_month");
    expect(value.from).toBeTruthy();
    expect(value.to).toBeTruthy();
    // Định dạng YYYY-MM-DD để khớp param API date_from/date_to.
    expect(value.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(value.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(value.from! <= value.to!).toBe(true);
  });
});

describe("waitingUrgencyClass", () => {
  const now = new Date("2026-07-15T12:00:00Z");
  const hours = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();
  const days = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();

  it("stays neutral for null/invalid regardless of basis", () => {
    expect(waitingUrgencyClass(null, "activity", now)).toContain("text-muted-foreground");
    expect(waitingUrgencyClass("not-a-date", "gtc", now)).toContain("text-muted-foreground");
  });

  describe('basis "activity" — thang giờ (bộ đếm reset được theo tương tác)', () => {
    it("stays foreground under 3h", () => {
      expect(waitingUrgencyClass(hours(1), "activity", now)).toContain("text-foreground");
    });

    it("turns amber from 3h", () => {
      expect(waitingUrgencyClass(hours(3), "activity", now)).toContain("text-action-warning");
    });

    it("turns red once past 24h", () => {
      expect(waitingUrgencyClass(hours(25), "activity", now)).toMatch(
        /text-action-danger font-medium/,
      );
    });

    it("turns darker red once past 72h", () => {
      expect(waitingUrgencyClass(hours(73), "activity", now)).toMatch(
        /text-action-danger font-semibold/,
      );
    });
  });

  describe.each(["gtc", "gtc_estimated"])(
    'basis "%s" — thang ngày (bộ đếm KHÔNG reset theo tương tác)',
    (basis) => {
      it("stays foreground under 3d", () => {
        expect(waitingUrgencyClass(days(1), basis, now)).toContain("text-foreground");
      });

      it("stays foreground past 25h — thang giờ cũ đã đỏ ở mốc này (regression F2)", () => {
        // Bẫy chính của F2: basis "activity" đã đỏ (text-action-danger) từ 24h, còn
        // basis GTC không được đỏ cho tới khi đủ 3 NGÀY (72h) — nếu lỡ tay áp
        // lại thang giờ cũ thì test này sẽ đỏ theo và bắt được ngay.
        expect(waitingUrgencyClass(hours(25), basis, now)).toContain("text-foreground");
      });

      it("turns amber from 3d", () => {
        expect(waitingUrgencyClass(days(3), basis, now)).toContain("text-action-warning");
      });

      it("turns red from 7d", () => {
        expect(waitingUrgencyClass(days(7), basis, now)).toMatch(/text-action-danger font-medium/);
      });

      it("turns darker red from 14d", () => {
        expect(waitingUrgencyClass(days(14), basis, now)).toMatch(
          /text-action-danger font-semibold/,
        );
      });
    },
  );
});

describe("waitingTooltip", () => {
  // Dựng mốc bằng giờ ĐỊA PHƯƠNG rồi mới đổi sang ISO: waitingTooltip format
  // bằng getDate()/getHours() (local) nên kỳ vọng chỉ ổn định ở mọi TZ khi
  // input được neo theo TZ của runner, không phải ghim offset +07:00 cứng.
  const localStamp = new Date(2026, 7, 1, 9, 15).toISOString();

  it("mô tả mốc giao thành công khi basis là gtc", () => {
    expect(waitingTooltip(localStamp, "gtc")).toBe("Chờ từ lúc giao thành công 01/08 09:15");
  });

  it("mô tả mốc ước tính khi basis là gtc_estimated", () => {
    expect(waitingTooltip(localStamp, "gtc_estimated")).toBe(
      "Chờ từ lúc giao thành công (ước tính) 01/08 09:15",
    );
  });

  it("mô tả mốc chờ thường khi basis là activity", () => {
    expect(waitingTooltip(localStamp, "activity")).toBe("Chờ từ 01/08 09:15");
  });

  it("trả chuỗi rỗng khi không có mốc", () => {
    expect(waitingTooltip(null, "gtc")).toBe("");
  });

  it("trả chuỗi rỗng khi ISO không hợp lệ", () => {
    expect(waitingTooltip("khong-phai-ngay", "gtc")).toBe("");
  });
});
