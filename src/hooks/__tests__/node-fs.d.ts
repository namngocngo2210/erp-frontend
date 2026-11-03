/**
 * Ambient type tối giản cho "node:fs" — repo không có @types/node
 * (chỉ dùng Node trong config build, không phải trong src). Theo tiền lệ
 * vite-env.d.ts / barcode-detector.d.ts: khai tối thiểu những gì cần, không thêm
 * dependency mới chỉ để type-check một test.
 */
declare module "node:fs" {
  export function readFileSync(path: string, encoding: string): string;
}
