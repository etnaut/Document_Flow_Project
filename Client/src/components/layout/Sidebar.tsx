import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  FileText,
  Send,
  CheckCircle,
  RotateCcw,
  Archive,
  Clock,
  LogOut,
  User,
  Building2,
  Briefcase,
  Inbox,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Settings,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Logo from '@/assets/Logo.svg';

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isSuperAdmin = user?.User_Role === 'SuperAdmin';
  const isAdmin = user?.User_Role === 'Admin';

  const employeeLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/send-document', icon: Send, label: 'Send Document' },
    { to: '/my-documents', icon: FileText, label: 'My Documents' },
  ];

  const adminLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/all-documents', icon: FileText, label: 'All Documents' },
  ];

  const superAdminLinks = [
    { to: '/super-admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/manage-admins', icon: User, label: 'Manage Admins' },
  ];

  const manageEmployeesPath = user?.User_Role === 'DivisionHead' ? '/division-head' : '/head/manage-employees';
  const headLinks = [
    { to: '/head', icon: LayoutDashboard, label: 'Head Dashboard' },
    { to: manageEmployeesPath, icon: User, label: 'Manage Employees' },
    { to: '/head/all-documents', icon: FileText, label: 'All Documents' },
  ];

  const recorderLinks = [
    { to: '/records', icon: LayoutDashboard, label: 'Recorder Dashboard' },
    { to: '/records/all', icon: FileText, label: 'All Documents' },
  ];

  const releaserLinks = [
    { to: '/releaser', icon: LayoutDashboard, label: 'Releaser Dashboard' },
    { to: '/releaser/all', icon: FileText, label: 'All Documents' },
  ];

  const isHead = user && (user.User_Role === 'DepartmentHead' || user.User_Role === 'DivisionHead' || user.User_Role === 'OfficerInCharge');
  const isRecorder = user && String(user.pre_assigned_role ?? '').trim().toLowerCase() === 'recorder';
  const isReleaser = user && (user.User_Role === 'Releaser' || String(user.pre_assigned_role ?? '').trim().toLowerCase() === 'releaser');
  const displayRole = isRecorder ? 'Employee/Recorder' : isReleaser ? 'Employee/Releaser' : user?.User_Role;
  const links = isSuperAdmin
    ? superAdminLinks
    : isHead
    ? headLinks
    : isRecorder
    ? recorderLinks
    : isReleaser
    ? releaserLinks
    : isAdmin
    ? adminLinks
    : employeeLinks;

  const ToggleIcon = collapsed ? ChevronRight : ChevronLeft;

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 rounded-r-3xl h-screen',
        'bg-primary/80 backdrop-blur-xl',
        'border border-primary/30 shadow-2xl',
        'text-white transition-[width] duration-300 ease-in-out',
        'overflow-hidden',
        collapsed ? 'w-16' : 'w-64'
      )}
      style={{
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      }}
    >
      <div className="flex h-full flex-col">
        {/* Logo + Toggle */}
        <div
          className={cn(
            'flex h-16 items-center px-4',
            collapsed ? 'justify-center' : 'justify-between'
          )}
        >
          {!collapsed && (
            <div className="flex items-center gap-2">
              <img src={Logo} alt="DocuFlow Logo" className="h-8 w-8 object-contain" />
              <span className="text-lg font-bold text-white">DocuFlow</span>
            </div>
          )}
          {collapsed && (
            <button
              onClick={onToggle}
              className="cursor-pointer hover:opacity-80 transition-opacity duration-200"
              aria-label="Expand sidebar"
            >
              <img src={Logo} alt="DocuFlow Logo" className="h-12 w-12 object-contain transition-all duration-300" />
            </button>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'shrink-0 text-white/80 hover:text-white hover:bg-white/10',
                'rounded-full transition-all duration-200'
              )}
              onClick={onToggle}
              aria-label="Collapse sidebar"
            >
              <ToggleIcon className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* User Info */}
        {!collapsed && (
          <div className="px-4 pb-4">
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white">
                  <User className="h-5 w-5" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium text-white">{user?.Full_Name}</p>
                  <p className="text-xs text-white/70">{displayRole}</p>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-white/70">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="truncate">{user?.Division}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/70">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span className="truncate">{user?.Department}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className={cn('flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden px-3 pb-3 overscroll-contain', collapsed && 'px-2')}>
          {links.map((link) => {
            const isActiveRoute = location.pathname === link.to || 
              (link.to !== '/dashboard' && link.to !== '/super-admin' && link.to !== '/head' && 
               link.to !== '/records' && link.to !== '/releaser' && location.pathname.startsWith(link.to));
            
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium',
                    'transition-all duration-500 ease-out overflow-hidden',
                    collapsed && 'justify-center'
                  )
                }
              >
                {/* Glow effect behind the pill */}
                <span
                  className={cn(
                    'absolute inset-0 rounded-full bg-white/20 blur-md transition-all duration-500 ease-out',
                    'overflow-hidden',
                    location.pathname === link.to || isActiveRoute
                      ? 'opacity-100 scale-100'
                      : 'opacity-0 scale-100 group-hover:opacity-30 group-hover:scale-100'
                  )}
                />
                {/* White pill background for active state with enhanced shadow */}
                <span
                  className={cn(
                    'absolute inset-0 rounded-full bg-white transition-all duration-500 ease-out',
                    location.pathname === link.to || isActiveRoute
                      ? 'opacity-100 scale-100'
                      : 'opacity-0 scale-95 group-hover:opacity-10 group-hover:scale-100'
                  )}
                  style={{
                    boxShadow: location.pathname === link.to || isActiveRoute
                      ? '0 4px 16px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                      : 'none',
                  }}
                />
                {/* Icon */}
                <link.icon 
                  className={cn(
                    'relative z-10 h-5 w-5 transition-all duration-500 ease-out',
                    location.pathname === link.to || isActiveRoute
                      ? 'text-primary scale-105'
                      : 'text-white scale-100'
                  )} 
                />
                {/* Label */}
                {!collapsed && (
                  <span 
                    className={cn(
                      'relative z-10 transition-all duration-500 ease-out',
                      location.pathname === link.to || isActiveRoute
                        ? 'text-primary font-semibold scale-105'
                        : 'text-white scale-100'
                    )}
                  >
                    {link.label}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Settings */}
        <div className={cn('px-3 pb-3', collapsed && 'px-2')}>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium',
                'transition-all duration-500 ease-out overflow-hidden',
                collapsed && 'justify-center'
              )
            }
          >
            {/* Glow effect behind the pill */}
            <span
              className={cn(
                'absolute inset-0 rounded-full bg-white/20 blur-md transition-all duration-500 ease-out',
                'overflow-hidden',
                location.pathname === '/settings'
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-100 group-hover:opacity-30 group-hover:scale-100'
              )}
            />
            {/* White pill background for active state with enhanced shadow */}
            <span
              className={cn(
                'absolute inset-0 rounded-full bg-white transition-all duration-500 ease-out',
                location.pathname === '/settings'
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-95 group-hover:opacity-10 group-hover:scale-100'
              )}
              style={{
                boxShadow: location.pathname === '/settings'
                  ? '0 4px 16px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                  : 'none',
              }}
            />
            {/* Icon */}
            <Settings 
              className={cn(
                'relative z-10 h-5 w-5 transition-all duration-500 ease-out',
                location.pathname === '/settings'
                  ? 'text-primary scale-105'
                  : 'text-white scale-100'
              )} 
            />
            {/* Label */}
            {!collapsed && (
              <span 
                className={cn(
                  'relative z-10 transition-all duration-500 ease-out',
                  location.pathname === '/settings'
                    ? 'text-primary font-semibold scale-105'
                    : 'text-white scale-100'
                )}
              >
                Settings
              </span>
            )}
          </NavLink>
        </div>

        {/* Logout */}
        <div className={cn('px-3 pb-4', collapsed && 'px-2')}>
          <Button
            variant="ghost"
            className={cn(
              'w-full gap-3 rounded-full text-white/80 hover:bg-white/10 hover:text-white',
              'transition-all duration-200',
              collapsed ? 'justify-center px-2' : 'justify-start px-3'
            )}
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && 'Sign Out'}
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
