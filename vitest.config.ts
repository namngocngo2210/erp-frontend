import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  // Phải bật React Compiler y như vite.config: nếu không, test chạy với ngữ nghĩa
  // memo KHÁC bản build và cả một lớp lỗi lọt lưới. Lỗi prod 2026-08-06 (nút Xuất
  // Excel luôn đòi chọn row) là đúng lớp đó: compiler đóng băng một biểu thức đọc
  // ref trong thân render, suite test không có compiler nên vẫn xanh.
  plugins: [react({ babel: { plugins: [["babel-plugin-react-compiler", { target: "19" }]] } })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    globals: false,
    css: true,
    // 3 file test sát ngưỡng 5s mặc định (1,1–1,8s cô lập) đỏ giả khi runner
    // tranh CPU (audit 2026-09-23). 10s là trần, không phải mục tiêu.
    testTimeout: 10_000,
  },
});
