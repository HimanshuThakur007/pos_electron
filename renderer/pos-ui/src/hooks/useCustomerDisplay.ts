import { useState, useEffect, useCallback } from "react";

export function useCustomerDisplay() {
  const [customerWindow, setCustomerWindow] = useState<Window | null>(null);

  const openCustomerDisplay = useCallback(() => {
    if (customerWindow && !customerWindow.closed) {
      customerWindow.focus();
      return;
    }
    const width = 1024;
    const height = 768;
    const left = window.screen.width;
    const top = 0;

    const win = window.open(
      "",
      "CustomerDisplay",
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`,
    );

    if (win) {
      Array.from(document.styleSheets).forEach((styleSheet) => {
        try {
          if (styleSheet.href) {
            const link = win.document.createElement("link");
            link.rel = "stylesheet";
            link.href = styleSheet.href;
            win.document.head.appendChild(link);
          } else if (styleSheet.cssRules) {
            const style = win.document.createElement("style");
            Array.from(styleSheet.cssRules).forEach((rule) => {
              style.appendChild(win.document.createTextNode(rule.cssText));
            });
            win.document.head.appendChild(style);
          }
        } catch (e) {
          console.warn("Could not copy stylesheet", e);
        }
      });
      win.document.title = "Customer Display - Market99";
      setCustomerWindow(win);
      win.onbeforeunload = () => {
        setCustomerWindow(null);
      };
    }
  }, [customerWindow]);

  useEffect(() => {
    return () => {
      if (customerWindow) {
        customerWindow.close();
      }
    };
  }, [customerWindow]);

  return { customerWindow, openCustomerDisplay };
}
