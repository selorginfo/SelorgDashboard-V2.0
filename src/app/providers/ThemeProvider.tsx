import { useEffect } from "react";
import type { ReactNode } from "react";
import { useUiStore } from "@/store/uiStore";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute("data-om-theme", theme);
  }, [theme]);

  return <>{children}</>;
}
