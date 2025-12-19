import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '@/types';
import defaultRouteHelper from '@/utils/getDefaultRoute';
import { loginUser, normalizeUser } from '@/services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('dms_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      // Normalize in case an older stored object lacks pre_assigned_role
      const normalized = normalizeUser(parsedUser);
      console.debug('[Auth] Loaded stored normalized user:', normalized);
      setUser(normalized);
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (username: string, password: string): Promise<User | null> => {
    const authenticatedUser = await loginUser(username, password);
    if (authenticatedUser) {
      console.debug('[Auth] Successful login, normalized user:', authenticatedUser);
      setUser(authenticatedUser);
      setIsAuthenticated(true);
      localStorage.setItem('dms_user', JSON.stringify(authenticatedUser));
      return authenticatedUser;
    }
    return null;
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('dms_user');
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
