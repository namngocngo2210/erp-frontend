import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ConfirmProvider } from "./components/ui/confirm-dialog";
import { I18nProvider } from "./i18n";
import { queryClient } from "./lib/query-client";
// Self-host font qua @fontsource (không phụ thuộc Google CDN). Cả hai đều có
// subset vietnamese (unicode-range) — browser chỉ tải subset cần dùng.
import "@fontsource-variable/inter";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "./styles.css";

// Error tracking — env-gated: chỉ init khi VITE_SENTRY_DSN được set (RB.8).
// Dynamic import để bundle chính không phình khi không dùng Sentry.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (sentryDsn) {
  void import("@sentry/react").then((Sentry) => {
    Sentry.init({
      dsn: sentryDsn,
      environment: import.meta.env.MODE,
      // Phải khớp release lúc upload sourcemap (CI đặt = $CI_COMMIT_SHA), nếu không
      // Sentry không tìm được map để giải mã stack trace.
      release: import.meta.env.VITE_SENTRY_RELEASE as string | undefined,
      sendDefaultPii: false,
    });
  });
}

// Dev-only: cảnh báo phần tử tràn ngang (body không còn overflow-x: hidden che bug).
// Nhánh DEV bị Vite thay bằng `false` khi build → module không vào bundle prod.
if (import.meta.env.DEV) {
  void import("./lib/dev/overflow-detector").then(({ startOverflowDetector }) => {
    startOverflowDetector();
  });
}

const WarrantyPage = lazy(() => import("./pages/WarrantyPage"));
const WarrantyPortalPage = lazy(
  () => import("./features/warranty-portal/pages/WarrantyPortalPage"),
);
const ProductScanPage = lazy(() => import("./features/warranty-portal/pages/ProductScanPage"));
const MobileApp = lazy(() => import("./features/ess/MobileApp"));

const path = window.location.pathname.toLowerCase();
const isPortalRoute = path.startsWith("/bao-hanh");
const isProductScanRoute = path.startsWith("/sp/");
const isWarrantyRoute = path.startsWith("/warranty");
const isMobileRoute = path === "/m" || path.startsWith("/m/");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      {/* Mọi entry (app, /warranty, /bao-hanh, /sp, /m) dùng chung useConfirm(). */}
      <ConfirmProvider>
        <ErrorBoundary>
          {isProductScanRoute ? (
            <Suspense fallback={null}>
              <ProductScanPage />
            </Suspense>
          ) : isPortalRoute ? (
            <Suspense fallback={null}>
              <WarrantyPortalPage />
            </Suspense>
          ) : isWarrantyRoute ? (
            <Suspense fallback={null}>
              <WarrantyPage />
            </Suspense>
          ) : isMobileRoute ? (
            <Suspense fallback={null}>
              <MobileApp />
            </Suspense>
          ) : (
            <App />
          )}
        </ErrorBoundary>
      </ConfirmProvider>
    </I18nProvider>
  </QueryClientProvider>,
);
