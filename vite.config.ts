import path from "node:path";

import { sentryVitePlugin } from "@sentry/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import visualizer from "rollup-plugin-visualizer";

/**
 * Service worker CHỈ phục vụ app nhân viên `/m` (audit 2026-09-23 P1-1).
 *
 * Trước đây VitePWA precache toàn bộ dist (146 entry, 4,36 MB): user desktop mở
 * /orders vẫn cài SW và tải nền cả OrdersPage/FlowDiagramTab/leaflet/zxing, lặp
 * lại mỗi lần deploy. Plugin này đi đồ thị chunk từ entry + `MobileApp` (theo
 * cả import tĩnh lẫn `import()` của các trang /m) và ghi lại tập file thật sự
 * cần cho /m; `manifestTransforms` bên dưới lọc precache theo tập đó. Không cần
 * liệt kê tên chunk bằng tay — thêm trang mới vào mobile-router là tự vào.
 */
const MOBILE_ENTRY_MODULE = "/src/features/ess/MobileApp.tsx";
const mobilePrecacheFiles = new Set<string>();

function mobilePrecacheGraph(): Plugin {
  return {
    name: "desi:mobile-precache-graph",
    apply: "build",
    generateBundle(_options, bundle) {
      mobilePrecacheFiles.clear();
      const chunks = Object.values(bundle).filter(
        (item): item is Extract<typeof item, { type: "chunk" }> => item.type === "chunk",
      );
      const byFile = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));
      const visit = (fileName: string, followDynamic: boolean) => {
        if (mobilePrecacheFiles.has(fileName)) return;
        const chunk = byFile.get(fileName);
        if (!chunk) return;
        mobilePrecacheFiles.add(fileName);
        for (const css of chunk.viteMetadata?.importedCss ?? []) mobilePrecacheFiles.add(css);
        for (const dep of chunk.imports) visit(dep, followDynamic);
        if (followDynamic) for (const dep of chunk.dynamicImports) visit(dep, true);
      };
      // Entry: chỉ theo import tĩnh — dynamicImports của entry là MỌI route lazy.
      for (const chunk of chunks) if (chunk.isEntry) visit(chunk.fileName, false);
      // MobileApp: theo cả import() vì 4 trang /m đều lazy.
      for (const chunk of chunks) {
        if (chunk.facadeModuleId?.replace(/\\/g, "/").endsWith(MOBILE_ENTRY_MODULE))
          visit(chunk.fileName, true);
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || "http://localhost:8000";
  // Dev-only host allowlist (e.g. ngrok/tunnel domains). Cấu hình qua env
  // VITE_ALLOWED_HOSTS="host1,host2" thay vì hardcode để không lộ URL staging.
  const allowedHosts = String(env.VITE_ALLOWED_HOSTS || "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);

  return {
    plugins: [
      // React Compiler (D10) — auto-memo, bỏ dần useMemo/useCallback thủ công.
      // Compiler "safe by design": tự bỏ qua component vi phạm Rules of React, không
      // phá runtime. target "19" → dùng runtime built-in của React 19, không cần
      // react-compiler-runtime.
      react({
        babel: {
          plugins: [["babel-plugin-react-compiler", { target: "19" }]],
        },
      }),
      mobilePrecacheGraph(),
      VitePWA({
        registerType: "autoUpdate",
        // Không inject registerSW.js vào index.html (mọi route) — MobileApp.tsx
        // tự gọi registerSW() nên chỉ user vào /m mới cài service worker.
        injectRegister: null,
        scope: "/m",
        includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
        manifest: {
          name: "DESI Nhân viên",
          short_name: "DESI NV",
          start_url: "/m",
          scope: "/m",
          display: "standalone",
          background_color: "#ffffff",
          theme_color: "#2563eb",
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
            {
              src: "/icons/maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          navigateFallbackDenylist: [/^\/api/, /^\/warranty/],
          runtimeCaching: [],
          // Chỉ precache file mà /m thật sự dùng (xem mobilePrecacheGraph). File
          // ngoài assets/ (index.html, manifest, icon) giữ nguyên.
          manifestTransforms: [
            (entries) => ({
              manifest: entries.filter(
                (entry) => !entry.url.startsWith("assets/") || mobilePrecacheFiles.has(entry.url),
              ),
            }),
          ],
          // Workbox mặc định bám theo build.sourcemap; từ khi bật "hidden" nó sẽ
          // sinh sw.js.map + gắn //# sourceMappingURL vào sw.js. Sentry không cần
          // map của service worker, nên tắt hẳn để sw.js giữ nguyên như trước.
          sourcemap: false,
        },
      }),
      mode === "analyze" &&
        visualizer({
          open: true,
          filename: "dist/report.html",
          gzipSize: true,
          brotliSize: true,
        }),
      // Upload sourcemap lên Sentry — chỉ bật khi có SENTRY_AUTH_TOKEN để build
      // local/CI không có token vẫn chạy bình thường. `filesToDeleteAfterUpload`
      // xoá .map ngay sau khi upload nên dist không mang theo sourcemap; trường
      // hợp plugin KHÔNG bật thì Dockerfile lo việc dọn .map.
      env.SENTRY_AUTH_TOKEN &&
        sentryVitePlugin({
          org: env.SENTRY_ORG,
          project: env.SENTRY_PROJECT,
          authToken: env.SENTRY_AUTH_TOKEN,
          release: { name: env.VITE_SENTRY_RELEASE || undefined },
          sourcemaps: { filesToDeleteAfterUpload: ["dist/**/*.map"] },
        }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    esbuild:
      mode === "production"
        ? { pure: ["console.log", "console.debug", "console.info"] }
        : undefined,
    build: {
      // "hidden" = vẫn sinh file .map (để Sentry giải mã stack trace) nhưng KHÔNG
      // gắn comment //# sourceMappingURL vào bundle → client không lần ra sourcemap.
      sourcemap: "hidden",
      cssCodeSplit: true,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            const normalized = id.replace(/\\/g, "/");
            const pkg = normalized.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/)?.[1] ?? "";
            // Chỉ match ĐÚNG package react/react-dom: mẫu cũ `/react/` quét nhầm
            // cả @xyflow/react (~200KB) vào vendor-react — chunk nằm trong entry
            // nên mọi người dùng đều tải xyflow dù không mở tab Sơ đồ.
            if (pkg === "react" || pkg === "react-dom" || pkg === "scheduler")
              return "vendor-react";
            // clsx/tailwind-merge/cva: tiện ích nhỏ mà entry dùng ở mọi nơi. Phải gán
            // tường minh: rollup kéo dependency CHƯA gán vào manual chunk đầu tiên
            // import nó (build thử: clsx rơi vào vendor-charts → entry kéo cả recharts).
            if (
              pkg === "lucide-react" ||
              pkg === "sonner" ||
              pkg === "clsx" ||
              pkg === "tailwind-merge" ||
              pkg === "class-variance-authority"
            )
              return "vendor-ui";
            // Audit 2026-09-23 P2-3: thư viện nặng tách chunk riêng, tên ổn định.
            // Trước đây recharts trộn vào chunk `dashboard-constants` (371 KB):
            // sửa một hằng dashboard là mọi user tải lại cả recharts.
            if (pkg === "@tanstack/react-query" || pkg.startsWith("react-router"))
              return "vendor-core";
            if (
              pkg === "recharts" ||
              pkg === "victory-vendor" ||
              pkg === "react-smooth" ||
              pkg === "decimal.js-light" ||
              pkg === "@reduxjs/toolkit" ||
              pkg === "redux" ||
              pkg === "react-redux" ||
              pkg === "immer" ||
              pkg === "reselect"
            )
              return "vendor-charts";
            // d3-* dùng chung giữa recharts (scale/shape) và @xyflow (zoom/drag) —
            // để riêng, không nhét vào vendor-charts kẻo sơ đồ kéo cả recharts.
            if (pkg.startsWith("d3-") || pkg === "internmap") return "vendor-d3";
            // Lib nhỏ dùng chung giữa recharts (react-smooth, react-is) và
            // react-select (@emotion → hoist-non-react-statics → react-is) — để riêng
            // kẻo chunk charts import cả chunk select chỉ vì một module 3 KB.
            if (
              pkg === "react-transition-group" ||
              pkg === "dom-helpers" ||
              pkg === "react-is" ||
              pkg === "hoist-non-react-statics" ||
              pkg === "@babel/runtime" ||
              pkg === "tiny-invariant" ||
              // react-redux (recharts) và zustand (@xyflow) cùng dùng shim này.
              pkg === "use-sync-external-store"
            )
              return "vendor-shared";
            if (
              pkg === "react-select" ||
              pkg.startsWith("@emotion/") ||
              pkg.startsWith("@floating-ui/") ||
              pkg === "memoize-one" ||
              pkg === "use-isomorphic-layout-effect" ||
              pkg === "stylis"
            )
              return "vendor-select";
            if (pkg.startsWith("@zxing/")) return "vendor-zxing";
            if (pkg.startsWith("@xyflow/") || pkg.startsWith("@dagrejs/") || pkg === "zustand")
              return "vendor-flow";
            if (pkg === "leaflet") return "vendor-map";
            return undefined;
          },
        },
      },
    },
    server: {
      host: true,
      port: 5173,
      allowedHosts,
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
        "/ws": {
          target: proxyTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});
