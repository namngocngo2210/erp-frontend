import { useState } from "react";

import { PageHeader } from "@/components/ui/page-header";
import { Tabs, type TabItem } from "@/components/ui/tabs";

import { BatchesTab } from "@/features/warranty-codes/components/BatchesTab";
import { CodesTab } from "@/features/warranty-codes/components/CodesTab";
import { ScanLogsTab } from "@/features/warranty-codes/components/ScanLogsTab";

type TabKey = "batches" | "codes" | "logs";

export default function WarrantyCodesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("batches");
  const [viewBatchId, setViewBatchId] = useState<number | null>(null);

  const tabs: TabItem[] = [
    {
      key: "batches",
      label: "Lô hàng",
      content: (
        <BatchesTab
          onViewCodes={(batchId) => {
            setViewBatchId(batchId);
            setActiveTab("codes");
          }}
        />
      ),
    },
    {
      key: "codes",
      label: "IMEI",
      content: <CodesTab initialBatchId={viewBatchId} />,
    },
    {
      key: "logs",
      label: "Nhật ký",
      content: <ScanLogsTab />,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Mã bảo hành" />
      <Tabs tabs={tabs} active={activeTab} onChange={(key) => setActiveTab(key as TabKey)} />
    </div>
  );
}
