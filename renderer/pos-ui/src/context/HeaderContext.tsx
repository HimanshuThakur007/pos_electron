import { createContext } from "react";

export const HeaderPropsContext = createContext<{
  setHeaderProps: React.Dispatch<React.SetStateAction<any>>;
} | null>(null);

export default HeaderPropsContext;
