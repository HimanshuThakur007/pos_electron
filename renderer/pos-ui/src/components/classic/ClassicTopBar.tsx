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
  netMsg?: string;
  netBackOnline?: boolean;
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
  netMsg,
  netBackOnline,
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
        netMsg={netMsg}
        netBackOnline={netBackOnline}
      />
    </>
  );
}
