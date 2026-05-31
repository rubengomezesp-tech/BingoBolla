import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, setToken, getToken } from "./api";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    const t = getToken();
    if (!t) { setLoading(false); return; }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };
  const register = async (email, password, name) => {
    const { data } = await api.post("/auth/register", { email, password, name });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };
  const logout = () => { setToken(null); setUser(null); };

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
