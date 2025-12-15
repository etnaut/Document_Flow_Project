import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { FileText, Lock, User } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      toast({ title: 'Validation Error', description: 'Please provide both username and password.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(username.trim(), password);
      if (success) {
        navigate('/dashboard');
      } else {
        toast({ title: 'Authentication Failed', description: 'Invalid username or password.', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-muted/20 via-accent/10 to-background p-6">
      {/* Decorative shapes */}
      <div className="pointer-events-none absolute -z-10 md:block hidden">
        <div className="relative">
          <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 blur-3xl opacity-70" />
          <div className="absolute right-[-120px] bottom-[-80px] h-64 w-64 rounded-full bg-gradient-to-br from-accent/10 to-primary/10 blur-2xl opacity-60" />
        </div>
      </div>

      <div className="w-full max-w-md animate-slide-up">

        <div className="rounded-3xl border bg-white/60 dark:bg-black/40 backdrop-blur-md p-8 shadow-md hover:shadow-xl hover:-translate-y-1 transition-transform duration-200 ring-1 ring-border">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-extrabold text-foreground">Welcome to Document Flow System</h2>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="username" className="text-sm">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 py-3 rounded-xl"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className="text-sm">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 py-3 rounded-xl"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.176.192-2.305.545-3.357M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(Boolean(v))} />
                <Label htmlFor="remember" className="text-sm">Remember me</Label>
              </div>
              <a className="text-sm font-medium text-primary hover:underline" href="#">Forgot password?</a>
            </div>

            <div className="flex justify-center">
              <Button
                type="submit"
                className={`group w-48 sm:w-56 rounded-xl py-3 px-6 bg-gradient-to-r from-primary to-accent text-white text-center transition-transform duration-200 ease-in-out transform hover:-translate-y-1 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg ${isLoading ? 'cursor-wait opacity-80' : ''}`}
                disabled={isLoading}
                aria-busy={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    <span className="inline-block transition-all duration-200 group-hover:tracking-wider">Signing in...</span>
                  </span>
                ) : (
                  <span className="inline-block transition-all duration-200 group-hover:tracking-wider">Sign In</span>
                )}
              </Button>
            </div>
          </form>


          <div className="mt-6 rounded-lg bg-muted p-4">
            <p className="text-xs font-medium text-muted-foreground">Demo Credentials:</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Super Admin: <code className="rounded bg-background px-1">superadmin / superadmin</code>
            </p>
            <p className="text-xs text-muted-foreground">
              Admin: <code className="rounded bg-background px-1">admin / admin</code>
            </p>
            <p className="text-xs text-muted-foreground">
              Employee: <code className="rounded bg-background px-1">employee / employee</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
