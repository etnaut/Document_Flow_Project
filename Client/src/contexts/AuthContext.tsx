import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '@/types';
import defaultRouteHelper from '@/utils/getDefaultRoute';
import { loginUser, normalizeUser, impersonateUser } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'dms_user';
const STORAGE_IMPERSONATOR_KEY = 'dms_impersonator';

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
  const [loading, setLoading] = useState(true);
  const [impersonator, setImpersonator] = useState<User | null>(null);

  useEffect(() => {
    // Check for existing session
    const storedUser = readStoredUser();
    if (storedUser) {
      console.debug('[Auth] Loaded stored normalized user:', storedUser);
      setUser(storedUser);
      setIsAuthenticated(true);
    }
    // Restore impersonator if present (so revert is possible after reload)
    try {
      const storedImp = sessionStorage.getItem(STORAGE_IMPERSONATOR_KEY);
      if (storedImp) {
        setImpersonator(normalizeUser(JSON.parse(storedImp)));
      }
    } catch (err) {
      // ignore
    }
    // Done initializing auth state
    setLoading(false);
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

  const revertImpersonation = () => {
    // Restore the previous user saved at impersonation time
    const stored = sessionStorage.getItem(STORAGE_IMPERSONATOR_KEY);
    let prev: User | null = impersonator ?? null;
    if (!prev && stored) {
      try { prev = normalizeUser(JSON.parse(stored)); } catch {}
    }

    if (!prev) {
      toast({ title: 'Cannot revert', description: 'No impersonation session found to revert.', variant: 'destructive' });
      return;
    }

    setUser(prev);
    setIsAuthenticated(true);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(prev));
    setImpersonator(null);
    sessionStorage.removeItem(STORAGE_IMPERSONATOR_KEY);
    toast({ title: 'Session restored', description: `Signed back in as ${prev.Full_Name}` });
  };

  const impersonateById = async (userId: number): Promise<User | null> => {
    try {
      const target = await impersonateUser(userId);
      if (!target) throw new Error('User not found');

      const previous = user;
      if (previous) {
        setImpersonator(previous);
        try { sessionStorage.setItem(STORAGE_IMPERSONATOR_KEY, JSON.stringify(previous)); } catch {}
      }

      setUser(target);
      setIsAuthenticated(true);
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(target)); } catch {}

      // Show revert action in toast
      toast({
        title: `Signed in as ${target.Full_Name}`,
        description: 'You are now impersonating this account.',
        action: (
          <ToastAction altText="Revert impersonation" asChild>
            <Button onClick={() => revertImpersonation()}>Revert</Button>
          </ToastAction>
        ) as any,
      });

      return target;
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to impersonate', variant: 'destructive' });
      return null;
    }
  };

  // Use the shared helper for default route logic
  const getDefaultRoute = (userOrRole: any) => defaultRouteHelper(userOrRole);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, getDefaultRoute, loading, impersonateById, revertImpersonation, impersonator }}>
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
