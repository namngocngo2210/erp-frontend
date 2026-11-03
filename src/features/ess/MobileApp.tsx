import { Suspense } from "react";
import { RouterProvider } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";

import { LogoSpinner } from "@/components/ui/logo-spinner";
import { MobileLoginView } from "@/features/ess/MobileLoginView";
import { mobileRouter } from "@/features/ess/mobile-router";
import { useAuthBootstrap } from "@/hooks/use-auth-bootstrap";

// Service worker PWA chỉ đăng ký ở đây (module này chỉ được tải khi vào /m) —
// vite.config `injectRegister: null` nên desktop /orders không còn cài SW và
// tải nền hàng MB mỗi lần deploy (audit 2026-09-23 P1-1).
registerSW({ immediate: true });

export default function MobileApp() {
  const { user, setUser, authChecking } = useAuthBootstrap();
  if (authChecking)
    return (
      <div className="grid min-h-dvh place-items-center">
        <LogoSpinner label="Đang tải..." />
      </div>
    );
  if (!user) return <MobileLoginView onLoggedIn={(u) => setUser(u)} />;
  return (
    <Suspense
      fallback={
        <div className="grid min-h-dvh place-items-center">
          <LogoSpinner label="Đang tải..." />
        </div>
      }
    >
      <RouterProvider router={mobileRouter} />
    </Suspense>
  );
}
