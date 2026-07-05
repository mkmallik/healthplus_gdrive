import React, { createContext, useContext, ReactNode } from 'react';
import { useDrive } from './DriveContext';

interface User {
  id: number;
  username: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  updateName: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { status, userEmail, userName, disconnect } = useDrive();

  const loading = status === 'checking' || status === 'loading' || status === 'connecting';

  const user: User | null = (status === 'ready')
    ? { id: 1, username: userEmail || 'user', name: userName || 'User' }
    : null;

  const login = async () => {};
  const logout = disconnect;
  const updateName = async (_name: string) => {};

  return (
    <AuthContext.Provider value={{ user, token: status === 'ready' ? 'google' : null, loading, login, logout, updateName }}>
      {children}
    </AuthContext.Provider>
  );
}
