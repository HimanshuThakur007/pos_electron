import { useEffect, useContext } from "react";
import toast, { Toaster } from "react-hot-toast";
import GstValidationModal from "../../components/b2b/GstValidationModal";
import StartDayModal from "../../components/modals/StartDayModal";
import EndDayModal from "../../components/modals/EndDayModal";
import MainMenuSyncStatus from "../../components/mainDashComp/MainMenuSyncStatus";
import MainMenuGrid from "../../components/mainDashComp/MainMenuGrid";
import MainMenuFooter from "../../components/mainDashComp/MainMenuFooter";
import { useMainMenuLogic } from "../../hooks/useMainMenuLogic";
import { HeaderPropsContext } from "../../context/HeaderContext";

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
    // finYear,
    fyCode,
    userId,
    userName,
    forceEndDay,
    syncStatus,
    isServerOnline,
    isNetworkOnline,
    setShowEndDayModal,
    // handleLogoutClick,
    handleStartDay,
    handleEndDay,
    handleGstModalClose,
    handleGstModalSuccess,
    handleMenuClick,
  } = useMainMenuLogic(onLogoutProp);

  const headerContext = useContext(HeaderPropsContext);
  useEffect(() => {
    if (headerContext) {
      headerContext.setHeaderProps({
        onEndDayClick: () => {
          if (!activeSession) {
            toast.error("No active session. Please start the day first.");
            return;
          }
          setShowEndDayModal(true);
        },
      });
    }
    return () => headerContext?.setHeaderProps({});
  }, [headerContext, activeSession, setShowEndDayModal]);

  return (
    <div className="h-full bg-slate-50 flex flex-col relative overflow-hidden font-sans select-none">
      <Toaster position="top-center" reverseOrder={false} />

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
      {/* <GlobalAlert /> */}
    </div>
  );
}
