import { UploadCloud, Box, Database, Tag, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const BouncingDots = ({
  color = "bg-amber-600",
}: {
  color?: string;
}) => (
  <span className="inline-flex items-center gap-[2px] ml-1">
    <span
      className={`w-1 h-1 rounded-full ${color} animate-bounce`}
      style={{ animationDelay: "0ms" }}
    />
    <span
      className={`w-1 h-1 rounded-full ${color} animate-bounce`}
      style={{ animationDelay: "150ms" }}
    />
    <span
      className={`w-1 h-1 rounded-full ${color} animate-bounce`}
      style={{ animationDelay: "300ms" }}
    />
  </span>
);

interface SyncStatus {
  items: boolean;
  stock: boolean;
  schemes: boolean;
  branches: boolean;
}

interface MainMenuSyncStatusProps {
  pendingTxCount: number;
  syncStatus: SyncStatus;
}

const SyncItem = ({
  label,
  isSynced,
  Icon,
}: {
  label: string;
  isSynced: boolean;
  Icon: any;
}) => (
  <div className="flex items-center gap-2.5">
    <Icon
      size={16}
      className={isSynced ? "text-emerald-500" : "text-amber-500"}
    />
    <div className="leading-tight">
      <span className="font-bold text-sm text-slate-800">{label}</span>
      <p
        className={`text-xs font-medium flex items-center ${
          isSynced ? "text-slate-500" : "text-amber-600"
        }`}
      >
        {isSynced ? (
          "Synced Today"
        ) : (
          <>
            Sync Pending <BouncingDots />
          </>
        )}
      </p>
    </div>
  </div>
);

export default function MainMenuSyncStatus({
  pendingTxCount,
  syncStatus,
}: MainMenuSyncStatusProps) {
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-5xl mb-8">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-x-5 gap-y-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <UploadCloud
              size={16}
              className={
                pendingTxCount > 0
                  ? "text-rose-500 animate-pulse"
                  : "text-emerald-500"
              }
            />
            <div className="leading-tight">
              <span className="font-bold text-sm text-slate-800">
                Pending Bills
              </span>
              <p
                className={`text-xs font-medium flex items-center ${
                  pendingTxCount > 0 ? "text-rose-600" : "text-slate-500"
                }`}
              >
                {pendingTxCount > 0 ? (
                  <>
                    {pendingTxCount} to upload{" "}
                    <BouncingDots color="bg-rose-600" />
                  </>
                ) : (
                  "All Synced"
                )}
              </p>
            </div>
          </div>

          <div className="h-8 w-[1px] bg-slate-200/80 hidden sm:block" />

          <SyncItem label="Items" isSynced={syncStatus.items} Icon={Box} />
          <SyncItem label="Stock" isSynced={syncStatus.stock} Icon={Database} />
          <SyncItem label="Schemes" isSynced={syncStatus.schemes} Icon={Tag} />
          <SyncItem
            label="Branches"
            isSynced={syncStatus.branches}
            Icon={Store}
          />
        </div>

        <button
          onClick={() => navigate("/sync-dashboard")}
          className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-colors shadow-md active:scale-95 flex-shrink-0"
        >
          Go to Sync
        </button>
      </div>
    </div>
  );
}
