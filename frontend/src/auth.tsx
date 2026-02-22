import React, { createContext, useContext, useEffect, useState } from "react";
import { apiFetch, setToken, getToken } from "./api";

export type User = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  bio: string;
  signature: string;
  role: "USER" | "ADMIN";
  isBanned: boolean;
  mutedUntil?: string | null;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (token: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const data = await apiFetch<{ user: User }>("/api/me");
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (getToken()) {
      refresh();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (token: string) => {
    setToken(token);
    await refresh();
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, refresh, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("AuthContext missing");
  }
  return ctx;
}
