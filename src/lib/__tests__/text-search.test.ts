import { describe, expect, it } from "vitest";

import { matchesSearchTerm, normalizeSearchText } from "@/lib/text-search";

describe("normalizeSearchText", () => {
  it("bỏ dấu tiếng Việt và hạ chữ thường", () => {
    expect(normalizeSearchText("Kênh Hà Nội")).toBe("kenh ha noi");
  });

  it("quy đổi đ/Đ về d", () => {
    expect(normalizeSearchText("Đơn hàng")).toBe("don hang");
  });

  it("gộp khoảng trắng thừa", () => {
    expect(normalizeSearchText("  kênh   A  ")).toBe("kenh a");
  });
});

describe("matchesSearchTerm", () => {
  const fields = ["KV-HN", "Kênh Hà Nội", "Nguyễn Văn A"];

  it("khớp khi từ khoá không dấu", () => {
    expect(matchesSearchTerm("ha noi", fields)).toBe(true);
  });

  it("khớp khi các token nằm ở những trường khác nhau", () => {
    expect(matchesSearchTerm("kvhn", fields)).toBe(false);
    expect(matchesSearchTerm("kv-hn nguyen", fields)).toBe(true);
  });

  it("không khớp khi thiếu một token", () => {
    expect(matchesSearchTerm("ha noi sai gon", fields)).toBe(false);
  });

  it("không cho một cụm từ vắt qua hai trường liền kề", () => {
    expect(matchesSearchTerm("kv-hn kenh", fields)).toBe(true);
    expect(matchesSearchTerm("kv-hn kenh ha noi nguyen", fields)).toBe(true);
    expect(matchesSearchTerm("hn kenh", ["KV-HN", "Kênh Hà Nội"])).toBe(true);
    expect(matchesSearchTerm("kvhn kenh", ["KV-HN", "Kênh Hà Nội"])).toBe(false);
  });

  it("bỏ qua trường rỗng và trả true khi từ khoá rỗng", () => {
    expect(matchesSearchTerm("   ", fields)).toBe(true);
    expect(matchesSearchTerm("kenh", [null, undefined, "Kênh"])).toBe(true);
  });
});
