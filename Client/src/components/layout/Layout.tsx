import React, { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';

const Layout: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f6f2ee' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((prev) => !prev)} />
      <main
        className={`min-h-screen p-6 transition-[margin-left] duration-200 ${collapsed ? 'ml-16' : 'ml-64'}`}
        style={{ backgroundColor: '#f6f2ee' }}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
