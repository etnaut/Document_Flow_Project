import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '@/types';
import defaultRouteHelper from '@/utils/getDefaultRoute';
import { loginUser, normalizeUser } from '@/services/api';

const STORAGE_KEY = 'dms_user';

const readStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const stored = sessionStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return normalizeUser(JSON.parse(stored));
  } catch (error) {
    console.warn('[Auth] Failed to parse stored user', error);
    return null;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for existing session
    const storedUser = readStoredUser();
    if (storedUser) {
      console.debug('[Auth] Loaded stored normalized user:', storedUser);
      setUser(storedUser);
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (username: string, password: string): Promise<User | null> => {
    const authenticatedUser = await loginUser(username, password);
    if (authenticatedUser) {
      console.debug('[Auth] Successful login, normalized user:', authenticatedUser);
      setUser(authenticatedUser);
      setIsAuthenticated(true);
      // Store per-tab to allow different sessions in different tabs
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(authenticatedUser));
      // Clean up legacy persisted value so old tabs don't resurrect outdated sessions
      localStorage.removeItem(STORAGE_KEY);
      return authenticatedUser;
    }
    return null;
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Use the shared helper for default route logic
  const getDefaultRoute = (userOrRole: any) => defaultRouteHelper(userOrRole);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, getDefaultRoute }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
