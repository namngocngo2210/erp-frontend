import { useState } from "react";

import { LogoSpinner } from "@/components/ui/logo-spinner";
import { useMyAttendance } from "@/features/ess/queries";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function MyAttendancePage() {
  const [month, setMonth] = useState(currentMonth());
  const { data, isLoading, isError } = useMyAttendance(month);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Lịch sử chấm công</h1>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
        />
      </div>
      {isLoading && (
        <div className="flex justify-center py-10">
          <LogoSpinner size={32} label="Đang tải..." />
        </div>
      )}
      {isError && (
        <p className="text-sm text-destructive">Không tải được dữ liệu. Vui lòng thử lại.</p>
      )}
      {data && data.length === 0 && (
        <p className="text-sm text-muted-foreground">Chưa có dữ liệu trong tháng.</p>
      )}
      <ul className="space-y-2">
        {data?.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
          >
            <span className="text-sm font-medium">{item.work_date}</span>
            <span className="text-sm text-muted-foreground">
              <span>{item.check_in ?? "--"}</span> → <span>{item.check_out ?? "--"}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
