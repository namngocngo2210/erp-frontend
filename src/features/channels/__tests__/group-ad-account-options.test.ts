import { describe, expect, it } from "vitest";

import { groupAdAccountOptions } from "../utils";

const FB_ACCOUNTS = [
  { id: 21, name: "LỢI_TK7_HKD", account_id: "25322428374101900" },
  { id: 172, name: "LỢI_TK7_HKD", account_id: "25322428374101900" },
  { id: 64, name: "LỢI_TK7_HKD", account_id: "25322428374101900" },
  { id: 30, name: "Lợi_TK6_HKD", account_id: "2007931173486188" },
];

const byAccountId = (acc: { account_id: string }) => acc.account_id;

describe("groupAdAccountOptions", () => {
  it("gộp mọi bản sao cùng id ngoài thành một dòng", () => {
    const options = groupAdAccountOptions(FB_ACCOUNTS, byAccountId);
    expect(options).toHaveLength(2);
  });

  it("giữ mọi PK của nhóm để chip đang chọn không biến mất", () => {
    const [first] = groupAdAccountOptions(FB_ACCOUNTS, byAccountId);
    expect(first.ids).toEqual([21, 64, 172]);
  });

  it("chọn PK nhỏ nhất làm đại diện để ổn định giữa các lần tải", () => {
    const [first] = groupAdAccountOptions(FB_ACCOUNTS, byAccountId);
    expect(first.value).toBe("21");
  });

  it("nhãn gồm tên và id ngoài", () => {
    const [first] = groupAdAccountOptions(FB_ACCOUNTS, byAccountId);
    expect(first.label).toBe("LỢI_TK7_HKD (25322428374101900)");
  });

  it("danh sách rỗng trả mảng rỗng", () => {
    expect(groupAdAccountOptions([], byAccountId)).toEqual([]);
  });
});
