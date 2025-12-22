import React, { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';

const ReleaseLayout: React.FC = () => {
  const { isAuthenticated, user, getDefaultRoute } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (!user || !user.pre_assigned_role || String(user.pre_assigned_role).trim().toLowerCase() !== 'releaser') {
    const route = getDefaultRoute(user || (user?.User_Role ?? ''));
    return <Navigate to={route} replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((prev) => !prev)} />
      <main className={`min-h-screen p-6 transition-[margin-left] duration-200 ${collapsed ? 'ml-16' : 'ml-64'}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default ReleaseLayout;
