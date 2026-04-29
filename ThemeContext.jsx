import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const ThemeCtx = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("lore_theme") || "dark");

  const applyTheme = (t) => {
    const sys = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const eff = t === "system" ? sys : t;
    document.documentElement.classList.toggle("dark", eff === "dark");
    document.documentElement.classList.toggle("light", eff === "light");
    document.documentElement.style.colorScheme = eff;
  };

  useEffect(() => { applyTheme(theme); localStorage.setItem("lore_theme", theme); }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => { if (theme === "system") applyTheme("system"); };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [theme]);

  // hydrate from server settings on first auth
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/users/me/settings");
        if (r.data?.theme) setTheme(r.data.theme);
      } catch {}
    })();
  }, []);

  const update = async (next) => {
    setTheme(next);
    try { await api.put("/users/me", { settings: { theme: next } }); } catch {}
  };

  return <ThemeCtx.Provider value={{ theme, setTheme: update }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
