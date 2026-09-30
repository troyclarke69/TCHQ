import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Theme = "dark" | "light" | "monet" | "funky";

const THEMES: Theme[] = ["dark", "light", "monet", "funky"];
const STORAGE_KEY = "tchq-theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  cycleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light" || stored === "monet" || stored === "funky") return stored;
  } catch {
    /* ignore */
  }
  // Fall back to the attribute the inline bootstrap script in index.html
  // already set on <html>, so we don't flash a second theme on mount.
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark" || attr === "light" || attr === "monet" || attr === "funky") return attr;
  return "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore (private browsing, storage disabled, etc.) */
    }
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: setThemeState,
      cycleTheme: () =>
        setThemeState((current) => THEMES[(THEMES.indexOf(current) + 1) % THEMES.length]),
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
