import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getMe, logout as logoutApi } from "@/api/auth";

interface AuthContextValue {
  isAuthenticated: boolean;
  loading: boolean;
  setAuthenticated: (value: boolean) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    getMe()
      .then(() => setIsAuthenticated(true))
      .catch(() => setIsAuthenticated(false))
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    await logoutApi();
    setIsAuthenticated(false);
    // El fix de LLE-342 saca el 401 que hoy fuerza un full reload en sesión
    // vencida (interceptor de client.ts) — ese reload era lo único que
    // limpiaba el caché de React Query al cerrar sesión. Sin este clear(),
    // reservas/viajes cacheados quedarían en memoria después del logout.
    queryClient.clear();
  }

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, loading, setAuthenticated: setIsAuthenticated, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
