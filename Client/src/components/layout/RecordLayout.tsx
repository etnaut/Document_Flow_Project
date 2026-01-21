import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import { useState } from 'react';

const RecordLayout: React.FC = () => {
  const { isAuthenticated, user, getDefaultRoute } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // If the authenticated user is not actually a Recorder, send them to their default route
  if (!user || !user.pre_assigned_role || String(user.pre_assigned_role).trim().toLowerCase() !== 'recorder') {
    const route = getDefaultRoute(user || (user?.User_Role ?? ''));
    return <Navigate to={route} replace />;
  }

  // Render the same layout as the app but scoped for recorders
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((prev) => !prev)} />
      <main className={`min-h-screen h-screen p-6 transition-[margin-left] duration-200 bg-background ${collapsed ? 'ml-16' : 'ml-64'} overflow-y-auto`}>
        <Outlet />
      </main>
    </div>
  );
};

export default RecordLayout;
