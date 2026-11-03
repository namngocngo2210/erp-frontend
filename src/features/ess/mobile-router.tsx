import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";

import { MobileLayout } from "@/features/ess/MobileLayout";

const CheckInPage = lazy(() => import("@/features/ess/pages/CheckInPage"));
const MyAttendancePage = lazy(() => import("@/features/ess/pages/MyAttendancePage"));
const MyLeavePage = lazy(() => import("@/features/ess/pages/MyLeavePage"));
const ProfilePage = lazy(() => import("@/features/ess/pages/ProfilePage"));

export const mobileRouter = createBrowserRouter([
  {
    path: "/m",
    element: <MobileLayout />,
    children: [
      { index: true, element: <ProfilePage /> },
      { path: "cham-cong", element: <CheckInPage /> },
      { path: "lich-su", element: <MyAttendancePage /> },
      { path: "nghi-phep", element: <MyLeavePage /> },
    ],
  },
]);
