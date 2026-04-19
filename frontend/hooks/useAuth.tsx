'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  username: string | null;
  token: string | null;
  login: (username: string, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  username: null, token: null,
  login: () => {}, logout: () => {},
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const u = localStorage.getItem('username');
    const t = localStorage.getItem('token');
    if (u && t) { setUsername(u); setToken(t); }
  }, []);

  const login = (u: string, t: string) => {
    localStorage.setItem('username', u);
    localStorage.setItem('token', t);
    setUsername(u); setToken(t);
  };

  const logout = () => {
    localStorage.removeItem('username');
    localStorage.removeItem('token');
    setUsername(null); setToken(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ username, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
