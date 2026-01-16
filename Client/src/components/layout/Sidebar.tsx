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
        'fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground shadow-elevated transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo + Toggle */}
        <div
          className={cn(
            'flex h-16 items-center border-b border-sidebar-border px-3',
            collapsed ? 'justify-center' : 'justify-between'
          )}
        >
          <div className="flex items-center gap-2">
            <img src={Logo} alt="DocuFlow Logo" className={cn('object-contain', collapsed ? 'h-6 w-6' : 'h-8 w-8')} />
            {!collapsed && <span className="text-lg font-bold">DocuFlow</span>}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={cn('shrink-0 text-sidebar-foreground/80 hover:text-sidebar-foreground', collapsed && 'ml-auto')}
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ToggleIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* User Info */}
        {!collapsed && (
          <div className="border-b border-sidebar-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
                <User className="h-5 w-5" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">{user?.Full_Name}</p>
                <p className="text-xs text-sidebar-foreground/70">{displayRole}</p>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-sidebar-foreground/70">
                <Building2 className="h-3.5 w-3.5" />
                <span className="truncate">{user?.Division}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-sidebar-foreground/70">
                <Briefcase className="h-3.5 w-3.5" />
                <span className="truncate">{user?.Department}</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className={cn('flex-1 space-y-1 overflow-y-auto', collapsed ? 'p-2' : 'p-3')}>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  collapsed && 'justify-center',
                  isActive
                    ? 'bg-white text-primary'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white'
                )
              }
            >
              <link.icon className="h-4 w-4" />
              {!collapsed && link.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className={cn('border-t border-sidebar-border', collapsed ? 'p-2' : 'p-3')}>
          <Button
            variant="ghost"
            className={cn(
              'w-full gap-3 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white',
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
