import { Outlet } from "react-router-dom";

import { BottomTabNav } from "@/features/ess/BottomTabNav";

export function MobileLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <main className="flex-1 overflow-y-auto px-4 pb-[calc(4rem+env(safe-area-inset-bottom))] pt-4">
        <Outlet />
      </main>
      <BottomTabNav />
    </div>
  );
}
