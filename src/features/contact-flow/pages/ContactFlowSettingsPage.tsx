import { lazy, Suspense, useState } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { FlowImportDialog } from "../components/FlowImportDialog";
import { ResultsTab } from "../components/ResultsTab";
import { StagesTab } from "../components/StagesTab";
import { TransitionsTab } from "../components/TransitionsTab";

// Nạp @xyflow/react (~200KB + CSS) chỉ khi người dùng mở tab "Sơ đồ" —
// Tabs chỉ render content của tab active nên chunk không tải trước đó.
const FlowDiagramTab = lazy(() =>
  import("../components/FlowDiagramTab").then((m) => ({ default: m.FlowDiagramTab })),
);

/**
 * Trang cấu hình tác nghiệp (contact-flow): quản lý Trạng thái / Kết quả /
 * Chuyển bước dùng trong luồng chăm sóc khách hàng, cộng nút Nhập Excel hàng
 * loạt. Tab "Sơ đồ" trực quan hoá flow (@xyflow/react + dagre layout) kèm
 * cảnh báo cấu hình (ngõ cụt, không thể tới, thiếu/thừa bước bắt đầu).
 */
export default function ContactFlowSettingsPage() {
  const [activeTab, setActiveTab] = useState("stages");
  const [importOpen, setImportOpen] = useState(false);

  const tabs: TabItem[] = [
    { key: "stages", label: "Trạng thái", content: <StagesTab /> },
    { key: "results", label: "Kết quả", content: <ResultsTab /> },
    { key: "transitions", label: "Chuyển bước", content: <TransitionsTab /> },
    {
      key: "diagram",
      label: "Sơ đồ",
      content: (
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center p-8">
              <LogoSpinner label="Đang tải" />
            </div>
          }
        >
          <FlowDiagramTab />
        </Suspense>
      ),
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <PageHeader
        title="Cấu hình tác nghiệp"
        description="Quản lý trạng thái, kết quả liên hệ và luồng chuyển bước dùng trong chăm sóc khách hàng."
        actions={
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Nhập Excel
          </Button>
        }
      />
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-card">
        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      </div>
      <FlowImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
