import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Building2, Briefcase, Mail, Phone, Palette } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { theme, setTheme, loading: themeLoading } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark'>(theme);
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.User_Role === 'Admin';
  const isEmployee = user?.User_Role === 'Employee';
  const isDivisionHead = user?.User_Role === 'DivisionHead';

  // Update selected theme when theme changes
  useEffect(() => {
    setSelectedTheme(theme);
  }, [theme]);

  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    if (!isAdmin) return;

    setSelectedTheme(newTheme);
    setSaving(true);
    try {
      await setTheme(newTheme);
      toast({
        title: 'Theme updated',
        description: `Department theme has been changed to ${newTheme}. All employees in your department will see this change.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update theme',
        variant: 'destructive',
      });
      // Revert selection on error
      setSelectedTheme(theme);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account preferences and information
        </p>
      </div>

      <div className="grid gap-6">
        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
            <CardDescription>
              Your personal account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Full Name</label>
                <div className="text-sm text-foreground bg-muted p-3 rounded-md border">
                  {user?.Full_Name || 'N/A'}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Role</label>
                <div className="text-sm text-foreground bg-muted p-3 rounded-md border">
                  {user?.User_Role || 'N/A'}
                </div>
              </div>
              {user?.Email && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </label>
                  <div className="text-sm text-foreground bg-muted p-3 rounded-md border">
                    {user.Email}
                  </div>
                </div>
              )}
              {user?.Phone && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone
                  </label>
                  <div className="text-sm text-foreground bg-muted p-3 rounded-md border">
                    {user.Phone}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Department Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Department Information
            </CardTitle>
            <CardDescription>
              Your department and division details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Division
                </label>
                <div className="text-sm text-foreground bg-muted p-3 rounded-md border">
                  {user?.Division || 'N/A'}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Department
                </label>
                <div className="text-sm text-foreground bg-muted p-3 rounded-md border">
                  {user?.Department || 'N/A'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Theme Settings - Only visible to Admin */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Theme Settings
              </CardTitle>
              <CardDescription>
                Change the theme for all employees in your department
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme-select">Department Theme</Label>
                <Select
                  value={selectedTheme}
                  onValueChange={(value) => handleThemeChange(value as 'light' | 'dark')}
                  disabled={saving || themeLoading}
                >
                  <SelectTrigger id="theme-select" className="w-full">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  This theme will be applied to all employees and division heads in your department.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Theme Display - Visible to all users */}
        {!isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Theme
              </CardTitle>
              <CardDescription>
                Current department theme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Current Theme</Label>
                <div className="text-sm text-foreground bg-muted p-3 rounded-md border capitalize">
                  {themeLoading ? 'Loading...' : theme}
                </div>
                <p className="text-xs text-muted-foreground">
                  Theme is managed by your department administrator.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Settings;
