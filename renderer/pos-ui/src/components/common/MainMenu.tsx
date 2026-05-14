import toast, { Toaster } from "react-hot-toast";
import GstValidationModal from "../b2b/GstValidationModal";
import StartDayModal from "../modals/StartDayModal";
import EndDayModal from "../modals/EndDayModal";
import MainMenuHeader from "./MainMenuHeader";
import MainMenuSyncStatus from "./MainMenuSyncStatus";
import MainMenuGrid from "./MainMenuGrid";
import MainMenuFooter from "./MainMenuFooter";
import { useMainMenuLogic } from "../../hooks/useMainMenuLogic";

interface MainMenuProps {
  onLogout: () => void;
}

export default function MainMenu({ onLogout: onLogoutProp }: MainMenuProps) {
  const {
    firstButtonRef,
    buttonRefs,
    showGstModal,
    showStartDayModal,
    showEndDayModal,
    activeSession,
    pendingTxCount,
    previousClosing,
    previousDifference,
    branchName,
    branchCode,
    terminalCode,
    finYear,
    fyCode,
    userId,
    userName,
    forceEndDay,
    syncStatus,
    isServerOnline,
    isNetworkOnline,
    setShowEndDayModal,
    handleLogoutClick,
    handleStartDay,
    handleEndDay,
    handleGstModalClose,
    handleGstModalSuccess,
    handleMenuClick,
  } = useMainMenuLogic(onLogoutProp);

  const isSyncingMaster =
    !syncStatus.items ||
    !syncStatus.stock ||
    !syncStatus.schemes ||
    !syncStatus.branches;

  let syncMessage = "Syncing Master Data...";
  if (isSyncingMaster) {
    // The order should ideally match the sync process order
    if (!syncStatus.stock) syncMessage = "Syncing Stock Data...";
    else if (!syncStatus.items) syncMessage = "Syncing Items...";
    else if (!syncStatus.schemes) syncMessage = "Syncing Schemes...";
    else if (!syncStatus.branches) syncMessage = "Syncing Branches...";
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden font-sans select-none">
      <Toaster position="top-center" reverseOrder={false} />
      {/* Master Data Syncing Overlay */}
      {isSyncingMaster && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center">
              <div className="text-base font-bold text-slate-800">
                {syncMessage}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-1">
                Please wait, fetching latest data from server...
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-400/20 rounded-full blur-[120px] pointer-events-none" />

      <MainMenuHeader
        branchName={branchName}
        branchCode={branchCode}
        userName={userName}
        finYear={finYear}
        isServerOnline={isServerOnline}
        isNetworkOnline={isNetworkOnline}
        onEndDayClick={() => {
          if (!activeSession) {
            toast.error("No active session. Please start the day first.");
            return;
          }
          if (pendingTxCount > 0) {
            toast.error(
              "Please sync all pending transactions before ending the day.",
            );
            return;
          }
          setShowEndDayModal(true);
        }}
        onLogoutClick={handleLogoutClick}
      />

      {/* Offline/Server Down Running Bar */}
      {!isServerOnline && (
        <div
          className={`w-full py-1.5 text-xs font-bold tracking-widest uppercase shrink-0 z-40 shadow-sm flex items-center justify-center text-center px-4 text-white ${
            isNetworkOnline ? "bg-amber-600" : "bg-rose-600"
          }`}
        >
          <div>
            {isNetworkOnline
              ? "⚠️ SERVER UNREACHABLE. OFFLINE BILLING MODE IS ACTIVE. ALL TRANSACTIONS WILL BE SAVED LOCALLY AND SYNCED AUTOMATICALLY WHEN SERVER IS RESTORED. ⚠️"
              : "⚠️ SYSTEM IS CURRENTLY OFFLINE. OFFLINE BILLING MODE IS ACTIVE. ALL TRANSACTIONS WILL BE SAVED LOCALLY AND SYNCED AUTOMATICALLY WHEN INTERNET IS RESTORED. ⚠️"}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-7xl mx-auto px-6 z-10">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
            Select an Operation
          </h2>
          <p className="text-slate-600 text-sm md:text-base max-w-2xl mx-auto">
            Choose a module below to proceed with your daily terminal tasks.
          </p>
        </div>

        <MainMenuSyncStatus
          pendingTxCount={pendingTxCount}
          syncStatus={syncStatus}
        />

        <MainMenuGrid
          onItemClick={handleMenuClick}
          buttonRefs={buttonRefs}
          firstButtonRef={firstButtonRef}
        />
      </main>

      <MainMenuFooter />

      <GstValidationModal
        show={showGstModal}
        onClose={handleGstModalClose}
        onSuccess={handleGstModalSuccess}
      />
      <StartDayModal
        isOpen={showStartDayModal}
        userDetails={{
          userName,
          branchName,
          branchCode,
          terminalCode,
        }}
        onStartDay={handleStartDay}
        previousDayClosing={previousClosing}
        previousDayDifference={previousDifference}
      />
      <EndDayModal
        isOpen={showEndDayModal}
        userDetails={{
          userName,
          branchName,
          branchCode,
          terminalCode,
          userId,
          fyCode,
        }}
        activeSession={activeSession}
        pendingTxCount={pendingTxCount}
        onEndDay={handleEndDay}
        onClose={() => !forceEndDay && setShowEndDayModal(false)}
        forceEndDay={forceEndDay}
      />
    </div>
  );
}
