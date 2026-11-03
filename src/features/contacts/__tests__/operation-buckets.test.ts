import { describe, expect, it } from "vitest";

import {
  OPERATION_BUCKET_ORDER,
  OPERATION_BUCKETS,
  type OperationBucketKey,
} from "../operation-buckets";

describe("OPERATION_BUCKETS", () => {
  const allKeys: OperationBucketKey[] = ["overdue", "today", "upcoming", "ended", "none"];

  it("has a non-empty label and badgeClass for every bucket key", () => {
    allKeys.forEach((key) => {
      expect(OPERATION_BUCKETS[key]).toBeDefined();
      expect(OPERATION_BUCKETS[key].label.length).toBeGreaterThan(0);
      expect(OPERATION_BUCKETS[key].badgeClass.length).toBeGreaterThan(0);
    });
  });

  it("uses the expected Vietnamese labels", () => {
    expect(OPERATION_BUCKETS.overdue.label).toBe("Quá hạn");
    expect(OPERATION_BUCKETS.today.label).toBe("Hôm nay");
    expect(OPERATION_BUCKETS.upcoming.label).toBe("Sắp tới");
    expect(OPERATION_BUCKETS.ended.label).toBe("Kết thúc");
    expect(OPERATION_BUCKETS.none.label).toBe("Chưa vào flow");
  });
});

describe("OPERATION_BUCKET_ORDER", () => {
  it("orders buckets overdue, today, upcoming, ended, none", () => {
    expect(OPERATION_BUCKET_ORDER).toEqual(["overdue", "today", "upcoming", "ended", "none"]);
  });

  it("includes none (unlike CHIP_ORDER of action_needed)", () => {
    expect(OPERATION_BUCKET_ORDER).toContain("none");
  });

  it("only references keys defined in OPERATION_BUCKETS", () => {
    OPERATION_BUCKET_ORDER.forEach((key) => {
      expect(OPERATION_BUCKETS[key]).toBeDefined();
    });
  });

  it("has no duplicate keys", () => {
    expect(new Set(OPERATION_BUCKET_ORDER).size).toBe(OPERATION_BUCKET_ORDER.length);
  });
});
