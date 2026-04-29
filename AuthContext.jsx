import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("lore_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("lore_token");
    if (!token) { setLoading(false); return; }
    api.get("/auth/me").then((r) => {
      setUser(r.data);
      localStorage.setItem("lore_user", JSON.stringify(r.data));
    }).catch(() => {
      localStorage.removeItem("lore_token");
      localStorage.removeItem("lore_user");
      setUser(null);
    }).finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const r = await api.post("/auth/login", { email, password });
    localStorage.setItem("lore_token", r.data.token);
    localStorage.setItem("lore_user", JSON.stringify(r.data.user));
    setUser(r.data.user);
    return r.data.user;
  };

  const signup = async (email, password, name) => {
    const r = await api.post("/auth/signup", { email, password, name });
    localStorage.setItem("lore_token", r.data.token);
    localStorage.setItem("lore_user", JSON.stringify(r.data.user));
    setUser(r.data.user);
    return r.data.user;
  };

  const logout = () => {
    localStorage.removeItem("lore_token");
    localStorage.removeItem("lore_user");
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const r = await api.get("/auth/me");
      localStorage.setItem("lore_user", JSON.stringify(r.data));
      setUser(r.data);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
