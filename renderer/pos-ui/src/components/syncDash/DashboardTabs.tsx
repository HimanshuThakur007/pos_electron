type TabType =
  | "retailBills"
  | "b2bBills"
  | "retailSync"
  | "b2bSync"
  | "invoiceSeries"
  | "stocks"
  | "schemes";

const TABS = [
  { id: "retailBills", label: "Sale Bills" },
  { id: "b2bBills", label: "B2B Bills" },
  { id: "retailSync", label: "Sales Sync Tracker" },
  { id: "b2bSync", label: "B2B Sync Tracker" },
  { id: "invoiceSeries", label: "Invoice Sync Data" },
  { id: "stocks", label: "Stocks Data" },
  { id: "schemes", label: "Schemes Data" },
];

interface DashboardTabsProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export default function DashboardTabs({
  activeTab,
  setActiveTab,
}: DashboardTabsProps) {
  return (
    <div className="flex items-center gap-6 px-4 pt-3 border-b border-slate-200 shrink-0 overflow-x-auto no-scrollbar">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as TabType)}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === tab.id
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
