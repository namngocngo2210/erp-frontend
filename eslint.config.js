import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import reactCompiler from "eslint-plugin-react-compiler";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-config-prettier";

// UI/UX audit 2026-09-25 (2.1): chữ < 12px khó đọc — dùng `text-xs` (sàn 12px),
// badge đếm số dùng `text-2xs`. Chặn tái phát `text-[9|10|11px]` (kể cả .5).
const TINY_TEXT_RE = "/text-\\[(9|10|11)(\\.5)?px\\]/";
const TINY_TEXT_MESSAGE =
  "Chữ < 12px khó đọc: dùng text-xs (sàn 12px); badge đếm số dùng text-2xs.";
const TINY_TEXT_SELECTORS = [
  { selector: `Literal[value=${TINY_TEXT_RE}]`, message: TINY_TEXT_MESSAGE },
  { selector: `TemplateElement[value.raw=${TINY_TEXT_RE}]`, message: TINY_TEXT_MESSAGE },
];

// UI/UX audit 2026-09-25 (2.5): hộp thoại native chặn luồng, không style được,
// không test được bằng role — dùng useConfirm() (@/hooks/use-confirm) hoặc toast.
const NATIVE_DIALOG_MESSAGE =
  "Dùng useConfirm() từ @/hooks/use-confirm (xác nhận) hoặc toast (thông báo) thay hộp thoại native.";
const NATIVE_DIALOG_GLOBALS = ["confirm", "alert"].map((name) => ({
  name,
  message: NATIVE_DIALOG_MESSAGE,
}));
const NATIVE_DIALOG_PROPERTIES = ["window", "globalThis"].flatMap((object) =>
  ["confirm", "alert"].map((property) => ({ object, property, message: NATIVE_DIALOG_MESSAGE })),
);

// Bộ a11y chọn lọc (0 vi phạm lúc bật). Chưa bật label-has-associated-control,
// click-events-have-key-events, no-static-element-interactions… — hàng trăm vi phạm
// cũ, dọn dần theo sprint (docs/ui-ux-audit-2026-09-25.md).
const A11Y_RULES = Object.fromEntries(
  [
    "alt-text",
    "anchor-has-content",
    "aria-props",
    "aria-proptypes",
    "aria-role",
    "aria-unsupported-elements",
    "role-has-required-aria-props",
    "role-supports-aria-props",
    "no-redundant-roles",
    "iframe-has-title",
    "html-has-lang",
    "tabindex-no-positive",
    "no-access-key",
  ].map((rule) => [`jsx-a11y/${rule}`, "error"]),
);
// `role` còn là prop nghiệp vụ của component (role="marketing"/"staff") — chỉ soát DOM.
A11Y_RULES["jsx-a11y/aria-role"] = ["error", { ignoreNonDOM: true }];

export default tseslint.config(
  { ignores: ["dist", "coverage"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "react-compiler": reactCompiler,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...A11Y_RULES,
      // D10 — lưới an toàn: cảnh báo (không chặn) component vi phạm Rules of React
      // mà compiler sẽ phải bỏ qua. Siết dần lên error sau khi dọn sạch.
      "react-compiler/react-compiler": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // Nợ cũ: cảnh báo trước, siết dần (xem Task 6)
      "no-console": ["warn", { allow: ["error", "warn"] }],
      // Audit 2026-09-23 P2-8: không nuốt lỗi bằng `catch {}` trống — dùng
      // swallowError(err, "ngữ cảnh") từ @/lib/errors (log + Sentry khi 5xx/mạng),
      // hoặc handleApiError. Block chỉ có comment giải thích vẫn được chấp nhận
      // cho các nhánh KHÔNG phải lỗi (parse fallback, control-flow).
      "no-empty": ["error", { allowEmptyCatch: false }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Task 5.5 — select dùng components/ui (select / searchable-select / multi-select).
      // react-select đã gỡ hẳn (UI audit S4) — chặn thêm lại.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react-select",
              message: "Use components/ui select/searchable-select/multi-select instead",
            },
          ],
          patterns: [
            {
              group: ["react-select/*"],
              message: "Use components/ui select/searchable-select/multi-select instead",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**/*.test.{ts,tsx}"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  // Audit 2026-09-23 P1-2: lớp lib/api phải đi qua client typed (@/api/typed —
  // path/body/response suy từ hợp đồng OpenAPI), không gọi fetchJson trần.
  // File chưa migrate được allowlist TẠI CHỖ bằng eslint-disable có lý do
  // (xem đầu từng file) — không thêm file mới vào nợ này. `fetchBlob` vẫn được phép.
  {
    files: ["src/lib/api/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/services/http",
              importNames: ["fetchJson"],
              message:
                "lib/api phải dùng apiGet/apiPost/apiPatch/apiPut/apiDelete từ @/api/typed " +
                "(path/body/response theo OpenAPI). Endpoint spec chưa khai schema: vẫn đi qua " +
                "client typed và cast kết quả (xem lib/api/orders.ts).",
            },
          ],
        },
      ],
    },
  },
  // Test của lib/api mock `fetchJson` (lớp transport dưới client typed) — miễn luật.
  {
    files: ["src/lib/api/__tests__/**/*.ts"],
    rules: { "no-restricted-imports": "off" },
  },
  // shadcn/ui pattern: file component export kèm cva variants (buttonVariants,
  // badgeVariants...) — chuẩn upstream, không tách file. Chỉ tắt cho ui/**.
  {
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  // Nợ cũ (D10): các file dưới đây có eslint-disable exhaustive-deps CHỦ ĐÍCH
  // (effect keyed / mount-only / handler đọc state qua ref) — compiler tự skip
  // các component đó nên cảnh báo react-compiler chỉ là thông tin. Tắt cục bộ để
  // lint:strict gate được nợ MỚI; gỡ dần khi refactor từng trang (WP6).
  {
    files: [
      "src/App.tsx",
      "src/hooks/use-crm-websocket.ts",
      "src/features/hr/components/LocationMapCanvas.tsx",
    ],
    rules: { "react-compiler/react-compiler": "off" },
  },
  // Luật cỡ chữ cho phần src còn lại (app/hooks/lib/…); pages/features/components
  // gộp vào khối no-restricted-syntax bên dưới (flat config: khối sau ghi đè cả mảng).
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/pages/**", "src/features/**", "src/components/**"],
    rules: {
      "no-restricted-syntax": ["error", ...TINY_TEXT_SELECTORS],
      "no-restricted-globals": ["error", ...NATIVE_DIALOG_GLOBALS],
      "no-restricted-properties": ["error", ...NATIVE_DIALOG_PROPERTIES],
    },
  },
  // Task 6: restrict raw `fetch` in UI layers — use fetchJson (src/services/http) or
  // the typed api modules (src/lib/api/*) instead.
  // Legitimate exceptions (SSE/streaming, blob downloads) must be annotated with
  // `// eslint-disable-next-line no-restricted-globals` and a reason comment.
  {
    files: [
      "src/pages/**/*.{ts,tsx}",
      "src/features/**/*.{ts,tsx}",
      "src/components/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-globals": [
        "error",
        ...NATIVE_DIALOG_GLOBALS,
        {
          name: "fetch",
          message:
            "Use fetchJson from @/services/http or a typed api module from @/lib/api/ instead of raw fetch. " +
            "For SSE/streaming/blob endpoints add eslint-disable-next-line with a reason.",
        },
      ],
      // Task 4: điều hướng phải qua react-router (useNavigate / <Link> / <NavLink>),
      // không dùng history.pushState/replaceState thủ công ở lớp UI.
      // src/app/** và src/services/** được miễn (router infra / low-level).
      // Catalog sản phẩm: lớp UI KHÔNG tự ghép URL /api/orders/products?... —
      // đi qua @/lib/api/products (getProductOptions cho ô lọc/ô chọn, getProducts
      // cho payload đầy đủ, productsCatalogUrl khi phải tự cầm fetchJson).
      // Sự cố 20/08: ô lọc tự gọi limit=1000 nên SKU xếp sau biến mất khỏi ô tìm.
      "no-restricted-syntax": [
        "error",
        ...TINY_TEXT_SELECTORS,
        // Audit 2026-09-23 P2-2: định dạng số/ngày đi qua @/lib/format
        // (formatNumber / formatCurrency / formatDateTimeVi / formatDateVi /
        // formatDatePattern) — không gọi toLocaleString("vi-VN") hay
        // new Intl.NumberFormat rải rác. Trường hợp thật sự đặc thù: disable tại
        // chỗ kèm lý do.
        {
          selector:
            "CallExpression[callee.property.name=/^toLocale(Date|Time)?String$/][arguments.0.value='vi-VN']",
          message:
            "Dùng formatNumber / formatDateTimeVi / formatDateVi / formatDatePattern từ @/lib/format " +
            'thay vì toLocale*String("vi-VN") inline.',
        },
        {
          selector: "NewExpression[callee.object.name='Intl'][callee.property.name='NumberFormat']",
          message:
            "Dùng formatNumber / formatCurrency từ @/lib/format thay vì new Intl.NumberFormat tại chỗ.",
        },
        {
          selector: "Literal[value=/^\\/api\\/orders\\/products(\\?|$)/]",
          message:
            "Use @/lib/api/products (getProductOptions / getProducts / productsCatalogUrl) " +
            "instead of hand-built /api/orders/products URLs.",
        },
        {
          selector: "TemplateElement[value.raw=/^\\/api\\/orders\\/products(\\?|$)/]",
          message:
            "Use @/lib/api/products (getProductOptions / getProducts / productsCatalogUrl) " +
            "instead of hand-built /api/orders/products URLs.",
        },
      ],
      "no-restricted-properties": [
        "error",
        ...NATIVE_DIALOG_PROPERTIES,
        {
          object: "history",
          property: "pushState",
          message:
            "Use react-router (useNavigate / <Link>) instead of history.pushState. " +
            "Router wiring lives in src/app/.",
        },
        {
          object: "history",
          property: "replaceState",
          message:
            "Use react-router (useNavigate with { replace: true } / <Navigate replace />) " +
            "instead of history.replaceState. Router wiring lives in src/app/.",
        },
      ],
    },
  },
  // Test mock/assert theo URL THẬT của endpoint → miễn luật cấm ghép URL catalog.
  // Đặt sau block trên vì flat config lấy block sau đè block trước.
  {
    files: ["src/**/*.test.{ts,tsx}", "src/**/__tests__/**/*.{ts,tsx}"],
    rules: { "no-restricted-syntax": "off" },
  },
  prettier,
);
