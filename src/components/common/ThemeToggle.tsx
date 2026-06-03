"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "nas-theme";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const initial = getInitialTheme();
    const timer = setTimeout(() => {
      setTheme(initial);
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, mounted]);

  const isDark = theme === "dark";

  if (!mounted) {
    return (
      <button
        type="button"
        className="theme-toggle opacity-50"
        aria-label="加载主题..."
        disabled
      >
        <Sun size={15} />
        <span className="header-action-label">
          暖阳
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="theme-toggle"
      aria-label={isDark ? "切换到暖阳纸张主题" : "切换到深邃极光主题"}
      title={isDark ? "暖阳纸张" : "深邃极光"}
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
      <span className="header-action-label">
        {isDark ? "暖阳" : "极光"}
      </span>
    </button>
  );
}
