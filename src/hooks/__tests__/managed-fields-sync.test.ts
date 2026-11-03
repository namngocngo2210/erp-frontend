import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Rút danh sách field từ catalog backend (nguồn sự thật) và so với MANAGED_FIELDS.
 *
 * Đọc khối ORDER_FIELD_LABELS chứ KHÔNG đọc ORDER_FIELD_GROUPS: khoá của dict labels
 * đúng bằng tập field, còn GROUPS trộn cả mã nhóm vào cùng dấu nháy nên phải lọc tay
 * — mà "address"/"status" vừa là mã nhóm vừa là tên field, lọc kiểu gì cũng sai một
 * trong hai. Task 1 đã có test khoá ALL_ORDER_FIELDS == set(ORDER_FIELD_LABELS), nên
 * đọc labels vẫn là đọc đúng nguồn sự thật.
 */
describe("MANAGED_FIELDS bám catalog backend", () => {
  it("không trôi khỏi ORDER_FIELD_LABELS", () => {
    const py = readFileSync("../backend/apps/users/rbac_catalog.py", "utf8");
    const labelsBlock = py.slice(py.indexOf("ORDER_FIELD_LABELS"), py.indexOf("ALL_ORDER_FIELDS"));
    // chỉ lấy KHOÁ của dict: chuỗi đứng ngay trước dấu hai chấm
    const backendFields = Array.from(labelsBlock.matchAll(/"([a-z_.]+)":/g), (m) => m[1]);

    const ts = readFileSync("src/hooks/useOrderFieldGrants.ts", "utf8");
    const feBlock = ts.slice(ts.indexOf("MANAGED_FIELDS"), ts.indexOf("]);"));
    const feFields = Array.from(feBlock.matchAll(/"([a-z_.]+)"/g), (m) => m[1]);

    expect(backendFields.length).toBeGreaterThan(40); // regex hỏng thì phải đỏ, không phải xanh rỗng
    expect([...new Set(feFields)].sort()).toEqual([...new Set(backendFields)].sort());
  });
});
