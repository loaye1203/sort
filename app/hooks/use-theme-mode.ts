import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "dark" | "light";

export function useThemeMode() {
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const savedTheme = document.documentElement.dataset.theme ?? window.localStorage.getItem("sorting-zoo-theme");

    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem("sorting-zoo-theme", theme);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [hydrated, theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  return {
    theme,
    themeIcon: theme === "dark" ? "☾" : "☀",
    themeLabel: theme === "dark" ? "切换到浅色主题" : "切换到深色主题",
    toggleTheme,
  };
}
