import { useEffect } from "react";

import { useI18n } from "@/i18n";
import { type AppSection } from "@/lib/routes";
import { type AuthUser } from "@/hooks/use-auth-bootstrap";

/**
 * Đồng bộ document.title theo section đang xem. Chỉ DI CHUYỂN từ App.tsx —
 * logic + deps giữ nguyên (deps vẫn là object user như cũ).
 */
export function usePageTitle(section: AppSection, user: AuthUser | null): void {
  const { t } = useI18n();

  useEffect(() => {
    const pageTitle = !user
      ? "Login."
      : section === "orders"
        ? t("page.title.orders")
        : section === "landing-orders"
          ? t("page.title.landingOrders")
          : section === "koc-orders"
            ? t("page.title.kocOrders")
            : section === "contacts"
              ? t("page.title.contacts")
              : section === "customers"
                ? t("page.title.customers")
                : section === "customer-explorer"
                  ? t("page.title.customerExplorer")
                  : section === "loyal-customers"
                    ? t("page.title.loyalCustomers")
                    : section === "resale-tracking"
                      ? t("page.title.resaleTracking")
                      : section === "channels"
                        ? t("page.title.channels")
                        : section === "dashboard"
                          ? t("page.title.dashboard")
                          : section === "ads-report"
                            ? t("page.title.adsReport")
                            : section === "overview-report"
                              ? t("page.title.overviewReport")
                              : section === "kiotviet"
                                ? t("page.title.kiotviet")
                                : section === "facebook-ads"
                                  ? t("page.title.facebookAds")
                                  : section === "google-ads"
                                    ? t("page.title.googleAds")
                                    : section === "users"
                                      ? t("page.title.users")
                                      : section === "departments"
                                        ? t("page.title.departments")
                                        : t("page.title.orders");
    document.title = `DESI GLOBAL - ${pageTitle}`;
  }, [section, user, t]);
}
