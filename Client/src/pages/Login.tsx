import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Lock, User } from 'lucide-react';
import Logo from '@/assets/Logo.svg';
// Background image removed per new palette rollout

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const { login, isAuthenticated, getDefaultRoute, user } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    // Redirect using the normalized user from context so pre_assigned_role is respected
    const route = user ? getDefaultRoute(user) : '/dashboard';
    return <Navigate to={route} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      toast({ title: 'Validation Error', description: 'Please provide both username and password.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const authenticatedUser = await login(username.trim(), password);
      if (authenticatedUser) {
        // Route based on the full user object so pre_assigned_role redirects are respected
        const defaultRoute = getDefaultRoute(authenticatedUser);
        navigate(defaultRoute);
      } else {
        toast({ title: 'Authentication Failed', description: 'Invalid username or password.', variant: 'destructive' });
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      const message = err instanceof Error ? err.message : String(err);
      const errorMessage = message || 'An unexpected error occurred. Please check if the backend server is running.';
      toast({ 
        title: 'Error', 
        description: errorMessage, 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'hsl(var(--background))' }}>
      <div className="w-full max-w-6xl animate-slide-up flex items-center md:gap-12 gap-8 md:translate-x-4">
        {/* Left: Logo with 3D coin-spin and enhanced shadow, shifted left */}
        <style>{`
          @keyframes coin-rotate {
            0% { transform: rotateY(0deg) rotateX(10deg); }
            50% { transform: rotateY(180deg) rotateX(10deg); }
            100% { transform: rotateY(360deg) rotateX(10deg); }
          }
          .coin-3d {
            perspective: 1000px;
          }
          .coin-spin {
            transform-style: preserve-3d;
            animation: coin-rotate 10s linear infinite;
          }
          .logo-shadow {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            bottom: -12px;
            width: 70%;
            height: 18px;
            background: radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.18) 45%, rgba(0,0,0,0.0) 75%);
            filter: blur(8px);
            opacity: 0.6;
          }
        `}</style>
        <div className="hidden md:flex flex-[1.2] items-center justify-center md:-translate-x-12">
          <div className="relative coin-3d">
            <div className="relative coin-spin inline-block">
              <img src={Logo} alt="DocuFlow Logo" className="max-h-[26rem] md:max-h-[28rem] w-auto object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.35)]" />
              <div className="logo-shadow" />
            </div>
          </div>
        </div>

        {/* Right: Login Card shifted slightly to the right and taller */}
        <div className="flex-[0.9] w-full max-w-sm flex md:justify-end md:translate-x-3">
          <div className="ml-auto rounded-3xl border bg-card p-8 shadow-card hover:shadow-elevated hover:-translate-y-1 transition-transform duration-200 ring-1 ring-border min-h-[420px]">
            <div className="mb-4 text-center">
              <h2 className="text-3xl font-extrabold text-foreground">Welcome to Document Flow System</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">Sign in to continue.</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-3 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-sm">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary pointer-events-none z-10" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-12 py-2.5 text-sm rounded-xl placeholder:text-gray-500"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary pointer-events-none z-10" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 py-2.5 text-sm rounded-xl placeholder:text-gray-500"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(Boolean(v))} />
                  <Label htmlFor="remember" className="text-sm text-foreground font-semibold">Remember me</Label>
                </div>
                <a className="text-sm font-bold text-primary hover:underline" href="#">Forgot password?</a>
              </div>

              <div className="flex justify-center">
                <Button
                  type="submit"
                  className={`group w-56 sm:w-64 rounded-xl py-2.5 px-8 bg-primary text-white text-sm font-semibold text-center transition-transform duration-200 ease-in-out transform hover:-translate-y-1 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg ${isLoading ? 'cursor-wait opacity-80' : ''}`}
                  disabled={isLoading}
                  aria-busy={isLoading}
                >
                  <span className="inline-block transition-all duration-200 group-hover:tracking-wider">
                    {isLoading ? 'Logging In...' : 'S U B M I T'}
                  </span>
                </Button>
              </div>
            </form>

            <div className="mt-4 rounded-lg bg-muted p-3">
              <p className="text-sm font-medium text-muted-foreground">DocuFlow</p>
              <p className="mt-2 text-sm text-muted-foreground">
                <code className="text-foreground rounded px-1">A Document Flow System that helps you manage/track your documents efficiently.</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
