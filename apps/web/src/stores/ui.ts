import { create } from "zustand";

export type ThemeName = "dawn" | "dusk";

const DEFAULT_MOCK = import.meta.env.VITE_MOCK_DATA === "true";

const readTheme = (): ThemeName => {
  if (typeof window === "undefined") return "dawn";
  const stored = window.localStorage.getItem("fw-theme");
  return stored === "dusk" || stored === "dawn" ? stored : "dawn";
};

const readMockMode = (): boolean => {
  if (typeof window === "undefined") return DEFAULT_MOCK;
  const stored = window.localStorage.getItem("fw-mock-mode");
  if (stored === "true") return true;
  if (stored === "false") return false;
  return DEFAULT_MOCK;
};

interface UiState {
  theme: ThemeName;
  mockMode: boolean;
  paletteOpen: boolean;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
  setMockMode: (value: boolean) => void;
  toggleMockMode: () => void;
  setPaletteOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: readTheme(),
  mockMode: readMockMode(),
  paletteOpen: false,
  setTheme: (theme) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("fw-theme", theme);
    }
    set({ theme });
  },
  toggleTheme: () => {
    const next = get().theme === "dusk" ? "dawn" : "dusk";
    if (typeof window !== "undefined") {
      window.localStorage.setItem("fw-theme", next);
    }
    set({ theme: next });
  },
  setMockMode: (value) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("fw-mock-mode", String(value));
    }
    set({ mockMode: value });
  },
  toggleMockMode: () => {
    const next = !get().mockMode;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("fw-mock-mode", String(next));
    }
    set({ mockMode: next });
  },
  setPaletteOpen: (open) => set({ paletteOpen: open }),
}));
