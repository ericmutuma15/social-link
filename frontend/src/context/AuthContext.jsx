import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/apiClient";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); const [loading, setLoading] = useState(true);
  const refreshSession = useCallback(async () => {
    try { await api.post("/api/refresh"); const { data } = await api.get("/api/current_user"); setUser(data); return data; }
    catch { setUser(null); return null; }
  }, []);
  const loadSession = useCallback(async () => {
    try { const { data } = await api.get("/api/current_user"); setUser(data); }
    catch { await refreshSession(); } finally { setLoading(false); }
  }, [refreshSession]);
  useEffect(() => { loadSession(); }, [loadSession]);
  const logout = useCallback(async () => { try { await api.post("/api/logout"); } finally { setUser(null); } }, []);
  const value = useMemo(() => ({ user, loading, setUser, loadSession, refreshSession, logout, isAuthenticated: Boolean(user) }), [user, loading, loadSession, refreshSession, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
