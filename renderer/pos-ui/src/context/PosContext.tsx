import React, { createContext, useContext } from "react";
import { usePosLogic } from "../hooks/usePosLogic";

type PosLogicReturn = ReturnType<typeof usePosLogic>;

const PosContext = createContext<PosLogicReturn | undefined>(undefined);

export const PosProvider: React.FC<{
  value: PosLogicReturn;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return <PosContext.Provider value={value}>{children}</PosContext.Provider>;
};

export const usePosContext = () => {
  const context = useContext(PosContext);
  if (context === undefined) {
    throw new Error("usePosContext must be used within a PosProvider");
  }
  return context;
};
