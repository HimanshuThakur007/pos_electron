import { RefreshCcw } from "lucide-react";

interface SyncCardProps {
  title: string;
  icon: React.ElementType;
  date: string;
  color: string;
  total?: number;
  action: () => void;
  isSyncing: boolean;
  isDisabled?: boolean;
}

function SyncCard({
  title,
  icon: Icon,
  date,
  color,
  total,
  action,
  isSyncing,
  isDisabled,
}: SyncCardProps) {
  const isCurrentlySyncing = isSyncing;
  const buttonDisabled = isCurrentlySyncing || isDisabled;
  return (
    <div className="group bg-white rounded-xl border border-slate-200/80 p-2.5 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-2">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`p-2 rounded-lg bg-${color}-50 text-${color}-600 border border-${color}-100 shrink-0 group-hover:scale-105 transition-transform`}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <h5 className="font-bold text-[13px] text-slate-800 leading-tight truncate">
            {title}
          </h5>
          <div className="text-[10px] font-medium text-slate-500 flex flex-wrap items-center gap-x-2 mt-0.5">
            {total !== undefined && (
              <span className="truncate">
                Total:{" "}
                <span className={`text-${color}-600 font-bold`}>{total}</span>
              </span>
            )}
            <span className="truncate">
              Last:{" "}
              <span className={`text-${color}-600 font-bold`}>{date}</span>
            </span>
          </div>
        </div>
      </div>
      <button
        onClick={action}
        disabled={buttonDisabled}
        title={isDisabled ? "You don't have right to sync" : "Sync Now"}
        className={`shrink-0 h-8 px-3 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors ${
          buttonDisabled
            ? "bg-slate-100 text-slate-400"
            : "bg-slate-800 text-white hover:bg-slate-700 active:scale-[0.98]"
        }`}
      >
        <RefreshCcw
          size={14}
          className={isCurrentlySyncing ? "animate-spin" : ""}
        />
        <span className="hidden xl:inline">
          {isCurrentlySyncing ? "Syncing..." : "Sync"}
        </span>
      </button>
    </div>
  );
}

interface SyncCardsGridProps {
  syncActions: any[];
  isSyncing: string | null;
}

export default function SyncCardsGrid({
  syncActions,
  isSyncing,
}: SyncCardsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-2 shrink-0">
      {syncActions.map((item) => (
        <SyncCard
          key={item.id}
          title={item.title}
          icon={item.icon}
          date={item.date}
          color={item.color}
          total={item.total}
          action={item.action}
          isSyncing={isSyncing === item.title}
          isDisabled={item.id === "stock" || item.disabled}
        />
      ))}
    </div>
  );
}
