import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('civic_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('civic_token'));

  const login = useCallback((newToken, newUser) => {
    localStorage.setItem('civic_token', newToken);
    localStorage.setItem('civic_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('civic_token');
    localStorage.removeItem('civic_user');
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user, token, isAuthenticated: !!token, login, logout,
  }), [user, token, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
