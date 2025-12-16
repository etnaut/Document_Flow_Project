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

        <div className="rounded-3xl border bg-white/60 dark:bg-black/40 backdrop-blur-md p-12 min-h-[520px] shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-transform duration-200 ring-1 ring-border">
          <div className="mb-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">Welcome to Document Flow System</h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">Sign in to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div className="space-y-1">
              <Label htmlFor="username" className="text-sm">Username</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-12 py-4 rounded-2xl text-base"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className="text-sm">Password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 pr-4 py-4 rounded-2xl text-base"
                  disabled={isLoading}
                />
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
                className={`group w-full sm:w-56 rounded-2xl py-4 px-6 bg-gradient-to-r from-primary to-accent text-white text-center text-lg transition-transform duration-200 ease-in-out transform hover:-translate-y-1 hover:scale-105 active:scale-95 shadow-lg hover:shadow-2xl ${isLoading ? 'cursor-wait opacity-80' : ''}`}
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


          <div className="mt-8 rounded-lg bg-muted p-6">
            <p className="text-sm sm:text-base font-semibold text-muted-foreground">Demo Credentials</p>
            <div className="mt-3 grid gap-2 sm:flex sm:items-center sm:gap-4">
              <p className="text-sm text-muted-foreground">Super Admin: <code className="rounded bg-background px-2 py-0.5">superadmin / superadmin</code></p>
              <p className="text-sm text-muted-foreground">Admin: <code className="rounded bg-background px-2 py-0.5">admin / admin</code></p>
              <p className="text-sm text-muted-foreground">Employee: <code className="rounded bg-background px-2 py-0.5">employee / employee</code></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
