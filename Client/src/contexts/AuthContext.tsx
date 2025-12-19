import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '@/types';
import { loginUser } from '@/services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('dms_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (username: string, password: string): Promise<User | null> => {
    const authenticatedUser = await loginUser(username, password);
    if (authenticatedUser) {
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

  const getDefaultRoute = (role: string) => {
    const normalizedRole = (role || '').toLowerCase();
    if (normalizedRole === 'superadmin') return '/super-admin';
    // Head roles map to the head dashboard
    if (['departmenthead', 'divisionhead', 'officerincharge'].includes(normalizedRole)) return '/head';
    // Admins and employees use the regular dashboard
    return '/dashboard';
  };

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
