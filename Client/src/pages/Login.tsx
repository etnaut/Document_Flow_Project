import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { FileText, Lock, User } from 'lucide-react';
import loginBackground from '@/assets/bg.jpg';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const { login, isAuthenticated, getDefaultRoute } = useAuth();
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
      const authenticatedUser = await login(username.trim(), password);
      if (authenticatedUser) {
        // Route based on role using context helper
        const defaultRoute = getDefaultRoute(authenticatedUser.User_Role);
        navigate(defaultRoute);
      } else {
        toast({ title: 'Authentication Failed', description: 'Invalid username or password.', variant: 'destructive' });
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err?.message || 'An unexpected error occurred. Please check if the backend server is running.';
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
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Image - High Quality */}
      <div 
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: `url(${loginBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          imageRendering: 'auto',
          transform: 'translateZ(0)',
        } as React.CSSProperties}
      />

      <div className="w-full max-w-sm animate-slide-up">

        <div className="rounded-3xl border bg-white/60 dark:bg-black/40 backdrop-blur-md p-6 shadow-md hover:shadow-xl hover:-translate-y-1 transition-transform duration-200 ring-1 ring-border">
          <div className="mb-4 text-center">
            {/* Rotating Coin Logo */}
            <div className="flex justify-center mb-3">
              <div className="relative" style={{ perspective: '1000px' }}>
                <style>{`
                  @keyframes coin-rotate {
                    0% {
                      transform: rotateY(0deg) rotateX(5deg);
                    }
                    25% {
                      transform: rotateY(90deg) rotateX(5deg);
                    }
                    50% {
                      transform: rotateY(180deg) rotateX(5deg);
                    }
                    75% {
                      transform: rotateY(270deg) rotateX(5deg);
                    }
                    100% {
                      transform: rotateY(360deg) rotateX(5deg);
                    }
                  }
                  .coin-3d {
                    animation: coin-rotate 4s linear infinite;
                    transform-style: preserve-3d;
                  }
                `}</style>
                <div className="coin-3d relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary via-accent to-primary shadow-[0_0_25px_rgba(0,0,0,0.4),0_15px_35px_rgba(0,0,0,0.3),inset_0_3px_15px_rgba(255,255,255,0.4),inset_0_-3px_15px_rgba(0,0,0,0.2)] dark:shadow-[0_0_25px_rgba(0,0,0,0.6),0_15px_35px_rgba(0,0,0,0.5),inset_0_3px_15px_rgba(255,255,255,0.3),inset_0_-3px_15px_rgba(0,0,0,0.4)] flex items-center justify-center border-2 border-white/20">
                    <FileText className="h-8 w-8 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" />
                  </div>
                </div>
              </div>
            </div>
            <h2 className="text-3xl font-extrabold text-foreground">Welcome to Document Flow System</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">Sign in to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-3 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-11 py-2.5 text-sm rounded-xl"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 py-2.5 text-sm rounded-xl"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(Boolean(v))} />
                <Label htmlFor="remember" className="text-sm text-black font-semibold">Remember me</Label>
              </div>
              <a className="text-sm font-bold text-primary-black hover:underline" href="#">Forgot password?</a>
            </div>

            <div className="flex justify-center">
              <Button
                type="submit"
                className={`group w-56 sm:w-64 rounded-xl py-2.5 px-8 bg-primary text-white text-sm font-semibold text-center transition-transform duration-200 ease-in-out transform hover:-translate-y-1 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg ${isLoading ? 'cursor-wait opacity-80' : ''}`}
                disabled={isLoading}
                aria-busy={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2S">
                    <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    <span className="inline-block transition-all duration-200 group-hover:tracking-wider">Logging In...</span>
                  </span>
                ) : (
                  <span className="inline-block transition-all duration-200 group-hover:tracking-wider">S U B M I T</span>
                )}
              </Button>
            </div>
          </form>


          <div className="mt-4 rounded-lg bg-muted p-3">
            <p className="text-sm font-medium text-muted-foreground-black">DocuFlow</p>
            <p className="mt-2 text-sm text-muted-foreground">
              <code className="text-black rounded bg-background px-1">A Document Flow System that helps you manage your documents efficiently.</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
