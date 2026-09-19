"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";

export type ColorTheme =
  | "default"
  | "amber"
  | "blue"
  | "cyan"
  | "emerald"
  | "fuchsia"
  | "green"
  | "violet"
  | "purple";

export type ThemeMode = "light" | "dark" | "system";

export interface ColorOption {
  name: string;
  value: ColorTheme;
  previewBg: string;
}

export const AVAILABLE_COLORS: ColorOption[] = [
  { name: "Default (Black & White)", value: "default", previewBg: "#18181b" },
  { name: "Amber", value: "amber", previewBg: "#f59e0b" },
  { name: "Blue", value: "blue", previewBg: "#3b82f6" },
  { name: "Cyan", value: "cyan", previewBg: "#06b6d4" },
  { name: "Emerald", value: "emerald", previewBg: "#10b981" },
  { name: "Fuchsia", value: "fuchsia", previewBg: "#d946ef" },
  { name: "Green", value: "green", previewBg: "#22c55e" },
  { name: "Violet", value: "violet", previewBg: "#8b5cf6" },
  { name: "Purple", value: "purple", previewBg: "#a855f7" },
];

const COLOR_CSS_VARS: Record<
  ColorTheme,
  { light: Record<string, string>; dark: Record<string, string> }
> = {
  default: {
    light: {},
    dark: {},
  },
  amber: {
    light: {
      "--primary": "oklch(0.6 0.22 45)",
      "--primary-foreground": "oklch(0.985 0 0)",
      "--ring": "oklch(0.6 0.22 45)",
      "--sidebar-primary": "oklch(0.6 0.22 45)",
    },
    dark: {
      "--primary": "oklch(0.72 0.2 50)",
      "--primary-foreground": "oklch(0.145 0 0)",
      "--ring": "oklch(0.72 0.2 50)",
      "--sidebar-primary": "oklch(0.72 0.2 50)",
    },
  },
  blue: {
    light: {
      "--primary": "oklch(0.488 0.243 264.376)",
      "--primary-foreground": "oklch(0.97 0.014 254.604)",
      "--ring": "oklch(0.488 0.243 264.376)",
      "--sidebar-primary": "oklch(0.488 0.243 264.376)",
    },
    dark: {
      "--primary": "oklch(0.65 0.22 260)",
      "--primary-foreground": "oklch(0.985 0 0)",
      "--ring": "oklch(0.65 0.22 260)",
      "--sidebar-primary": "oklch(0.65 0.22 260)",
    },
  },
  cyan: {
    light: {
      "--primary": "oklch(0.52 0.105 223.128)",
      "--primary-foreground": "oklch(0.984 0.019 200.873)",
      "--ring": "oklch(0.52 0.105 223.128)",
      "--sidebar-primary": "oklch(0.52 0.105 223.128)",
    },
    dark: {
      "--primary": "oklch(0.65 0.15 220)",
      "--primary-foreground": "oklch(0.145 0 0)",
      "--ring": "oklch(0.65 0.15 220)",
      "--sidebar-primary": "oklch(0.65 0.15 220)",
    },
  },
  emerald: {
    light: {
      "--primary": "oklch(0.508 0.118 165.612)",
      "--primary-foreground": "oklch(0.979 0.021 166.113)",
      "--ring": "oklch(0.508 0.118 165.612)",
      "--sidebar-primary": "oklch(0.508 0.118 165.612)",
    },
    dark: {
      "--primary": "oklch(0.68 0.17 160)",
      "--primary-foreground": "oklch(0.145 0 0)",
      "--ring": "oklch(0.68 0.17 160)",
      "--sidebar-primary": "oklch(0.68 0.17 160)",
    },
  },
  fuchsia: {
    light: {
      "--primary": "oklch(0.518 0.253 323.949)",
      "--primary-foreground": "oklch(0.977 0.017 320.058)",
      "--ring": "oklch(0.518 0.253 323.949)",
      "--sidebar-primary": "oklch(0.518 0.253 323.949)",
    },
    dark: {
      "--primary": "oklch(0.7 0.25 320)",
      "--primary-foreground": "oklch(0.985 0 0)",
      "--ring": "oklch(0.7 0.25 320)",
      "--sidebar-primary": "oklch(0.7 0.25 320)",
    },
  },
  green: {
    light: {
      "--primary": "oklch(0.527 0.154 150.069)",
      "--primary-foreground": "oklch(0.982 0.018 155.826)",
      "--ring": "oklch(0.527 0.154 150.069)",
      "--sidebar-primary": "oklch(0.527 0.154 150.069)",
    },
    dark: {
      "--primary": "oklch(0.7 0.2 145)",
      "--primary-foreground": "oklch(0.145 0 0)",
      "--ring": "oklch(0.7 0.2 145)",
      "--sidebar-primary": "oklch(0.7 0.2 145)",
    },
  },
  violet: {
    light: {
      "--primary": "oklch(0.457 0.24 277.023)",
      "--primary-foreground": "oklch(0.962 0.018 272.314)",
      "--ring": "oklch(0.457 0.24 277.023)",
      "--sidebar-primary": "oklch(0.457 0.24 277.023)",
    },
    dark: {
      "--primary": "oklch(0.68 0.22 275)",
      "--primary-foreground": "oklch(0.985 0 0)",
      "--ring": "oklch(0.68 0.22 275)",
      "--sidebar-primary": "oklch(0.68 0.22 275)",
    },
  },
  purple: {
    light: {
      "--primary": "oklch(0.496 0.265 301.924)",
      "--primary-foreground": "oklch(0.977 0.014 308.299)",
      "--ring": "oklch(0.496 0.265 301.924)",
      "--sidebar-primary": "oklch(0.496 0.265 301.924)",
    },
    dark: {
      "--primary": "oklch(0.68 0.24 300)",
      "--primary-foreground": "oklch(0.985 0 0)",
      "--ring": "oklch(0.68 0.24 300)",
      "--sidebar-primary": "oklch(0.68 0.24 300)",
    },
  },
};

export interface ThemeContextType {
  color: ColorTheme;
  mode: string;
  resolvedMode: string;
  themeClass: string;
  setColor: (color: ColorTheme) => void;
  setMode: (mode: string) => void;
  toggleMode: () => void;
  availableColors: ColorOption[];
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);
const COLOR_STORAGE_KEY = "testloom-theme-color";

function ThemeInnerProvider({
  children,
  defaultColor = "default",
}: {
  children: React.ReactNode;
  defaultColor?: ColorTheme;
}) {
  const { theme, setTheme, resolvedTheme } = useNextTheme();
  const [color, setColorState] = React.useState<ColorTheme>(defaultColor);
  const [mounted, setMounted] = React.useState(false);

  // Read saved color palette from localStorage
  React.useEffect(() => {
    try {
      const savedColor = localStorage.getItem(COLOR_STORAGE_KEY) as ColorTheme;
      if (savedColor && AVAILABLE_COLORS.some((c) => c.value === savedColor)) {
        setColorState(savedColor);
      }
    } catch {
      // Ignore localStorage read errors
    }
    setMounted(true);
  }, []);

  const activeMode = (resolvedTheme as "light" | "dark") || "dark";
  const themeClass = `${color}-${activeMode}`;

  // Apply classes and CSS variables directly to HTML root
  React.useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;

    AVAILABLE_COLORS.forEach((c) => {
      root.classList.remove(`${c.value}-light`, `${c.value}-dark`, c.value);
    });

    // Remove previous inline style overrides
    const varsToRemove = [
      "--primary",
      "--primary-foreground",
      "--ring",
      "--sidebar-primary",
    ];
    varsToRemove.forEach((v) => root.style.removeProperty(v));

    if (color !== "default") {
      root.classList.add(themeClass, color);
      root.setAttribute("data-color", color);

      // Apply color CSS variables as inline styles so they override global CSS rules
      const modeVars = COLOR_CSS_VARS[color]?.[activeMode] || {};
      Object.entries(modeVars).forEach(([varName, varValue]) => {
        root.style.setProperty(varName, varValue);
      });
    } else {
      root.removeAttribute("data-color");
    }
  }, [color, activeMode, themeClass, mounted]);

  const setColor = React.useCallback((newColor: ColorTheme) => {
    setColorState(newColor);
    try {
      localStorage.setItem(COLOR_STORAGE_KEY, newColor);
    } catch {
      // Ignore localStorage write errors
    }
  }, []);

  const toggleMode = React.useCallback(() => {
    setTheme(activeMode === "dark" ? "light" : "dark");
  }, [activeMode, setTheme]);

  const value = React.useMemo(
    () => ({
      color,
      mode: theme || "dark",
      resolvedMode: activeMode,
      themeClass,
      setColor,
      setMode: setTheme,
      toggleMode,
      availableColors: AVAILABLE_COLORS,
    }),
    [color, theme, activeMode, themeClass, setColor, setTheme, toggleMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function ThemeProvider({
  children,
  defaultColor = "default",
  defaultMode = "dark",
}: {
  children: React.ReactNode;
  defaultColor?: ColorTheme;
  defaultMode?: string;
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultMode}
      enableSystem
      disableTransitionOnChange
    >
      <ThemeInnerProvider defaultColor={defaultColor}>{children}</ThemeInnerProvider>
    </NextThemesProvider>
  );
}

export function useTheme(): ThemeContextType {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}