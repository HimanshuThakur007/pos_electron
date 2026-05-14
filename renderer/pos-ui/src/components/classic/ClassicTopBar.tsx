import ClassicPOSHeader from "./ClassicPOSHeader";

interface ClassicTopBarProps {
  user?: any;
  now?: Date;
  formatTime?: (date: Date) => string;
  formatDate?: (date: Date) => string;
  logout?: (options?: any) => void;
  stopAutoSync?: () => void;
  openCustomerDisplay?: () => void;
  displayConnected?: boolean;
  displayWindow?: boolean;
  onOpenSettings: () => void;
  netOffline?: boolean;
  isServerOnline?: boolean;
  isNetworkOnline?: boolean;
  netMsg?: string;
  netBackOnline?: boolean;
  manualMode?: string;
  setManualMode?: (mode: string) => void;
  isB2B?: boolean;
  onEndDayClick?: () => void;
}

export default function ClassicTopBar({
  // header
  user,
  now,
  formatTime,
  formatDate,
  logout,
  stopAutoSync,
  openCustomerDisplay,
  displayConnected,
  displayWindow,
  onOpenSettings,

  // connectivity
  netOffline,
  isServerOnline,
  isNetworkOnline,
  netMsg,
  netBackOnline,
  manualMode,
  setManualMode,
  isB2B,
  onEndDayClick,
}: ClassicTopBarProps) {
  return (
    <>
      <ClassicPOSHeader
        user={user}
        now={now}
        formatTime={formatTime}
        formatDate={formatDate}
        logout={logout}
        stopAutoSync={stopAutoSync}
        openCustomerDisplay={openCustomerDisplay}
        displayConnected={displayConnected}
        displayWindow={displayWindow}
        onOpenSettings={onOpenSettings}
        netOffline={netOffline}
        isServerOnline={isServerOnline}
        isNetworkOnline={isNetworkOnline}
        netMsg={netMsg}
        netBackOnline={netBackOnline}
        manualMode={manualMode}
        setManualMode={setManualMode}
        isB2B={isB2B}
        onEndDayClick={onEndDayClick}
      />
    </>
  );
}
