import { Clock, CalendarDays, FileText, User } from "lucide-react";
import { NavLink } from "react-router-dom";

const TABS = [
  { to: "/m", end: true, icon: User, label: "Cá nhân" },
  { to: "/m/cham-cong", end: false, icon: Clock, label: "Chấm công" },
  { to: "/m/lich-su", end: false, icon: CalendarDays, label: "Lịch sử" },
  { to: "/m/nghi-phep", end: false, icon: FileText, label: "Nghỉ phép" },
];

export function BottomTabNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
      {TABS.map(({ to, end, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-2 text-xs ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`
          }
        >
          <Icon className="h-5 w-5" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
