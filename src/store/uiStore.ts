import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark";

export interface Toast {
  id: string;
  message: string;
  tone?: "success" | "error" | "warning" | "info";
}

/** Matches the approved design's topbar store-scope selector (dc.html:8844). */
export const STORE_SCOPE_OPTIONS = [
  "All dark stores",
  "DS-01 Indiranagar",
  "DS-02 Koramangala",
  "DS-03 HSR Layout",
  "DS-04 Whitefield",
  "WH-01 Bommasandra",
] as const;

interface UiState {
  sidebarExpanded: boolean;
  toggleSidebar: () => void;
  /** Off-canvas sidebar drawer state below the mobile breakpoint — separate from
   * `sidebarExpanded`, which only applies to the desktop collapsed/expanded rail. */
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  density: "comfortable" | "compact";
  setDensity: (density: "comfortable" | "compact") => void;
  defaultLanding: string;
  setDefaultLanding: (path: string) => void;
  toasts: Toast[];
  pushToast: (message: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: string) => void;
  storeScope: string;
  setStoreScope: (scope: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarExpanded: true,
      toggleSidebar: () => set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),
      mobileNavOpen: false,
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),
      theme: "light",
      setTheme: (theme) => set({ theme }),
      density: "comfortable",
      setDensity: (density) => set({ density }),
      defaultLanding: "/dashboard",
      setDefaultLanding: (defaultLanding) => set({ defaultLanding }),
      toasts: [],
      pushToast: (message, tone = "info") =>
        set((s) => ({
          toasts: [...s.toasts, { id: crypto.randomUUID(), message, tone }],
        })),
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      storeScope: STORE_SCOPE_OPTIONS[0],
      setStoreScope: (scope) => set({ storeScope: scope }),
    }),
    {
      name: "selorg-admin-ui",
      partialize: (s) => ({
        sidebarExpanded: s.sidebarExpanded,
        theme: s.theme,
        storeScope: s.storeScope,
        density: s.density,
        defaultLanding: s.defaultLanding,
      }),
    }
  )
);
