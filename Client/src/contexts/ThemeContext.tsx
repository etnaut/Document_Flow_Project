import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getDepartmentTheme, updateDepartmentTheme } from '@/services/api';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>('light');
  const [loading, setLoading] = useState(true);

  // Fetch theme when user or department changes
  useEffect(() => {
    const fetchTheme = async () => {
      if (!user?.Department) {
        setLoading(false);
        return;
      }

      try {
        const result = await getDepartmentTheme(user.Department);
        const newTheme = (result.theme === 'dark' ? 'dark' : 'light') as Theme;
        setThemeState(newTheme);
        applyThemeToDocument(newTheme);
      } catch (error) {
        console.error('Error fetching department theme:', error);
        // Default to light theme on error
        setThemeState('light');
        applyThemeToDocument('light');
      } finally {
        setLoading(false);
      }
    };

    fetchTheme();
  }, [user?.Department]);

  // Apply theme to document
  const applyThemeToDocument = (newTheme: Theme) => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (newTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  // Update theme (Admin only)
  const setTheme = async (newTheme: Theme) => {
    if (!user?.Department || user.User_Role !== 'Admin') {
      throw new Error('Only Admins can update department theme');
    }

    try {
      await updateDepartmentTheme(
        user.Department,
        newTheme,
        user.User_Role,
        user.Department
      );
      setThemeState(newTheme);
      applyThemeToDocument(newTheme);
    } catch (error) {
      console.error('Error updating department theme:', error);
      throw error;
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, loading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
