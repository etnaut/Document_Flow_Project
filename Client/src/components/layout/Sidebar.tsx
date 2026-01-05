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
    { to: '/my-documents/pending', icon: Clock, label: 'Pending Documents' },
    { to: '/my-documents/approved', icon: CheckCircle, label: 'Approved Documents' },
  ];

  const adminLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/all-documents', icon: FileText, label: 'All Documents' },
    { to: '/pending', icon: FileText, label: 'Pending' },
    { to: '/approved', icon: CheckCircle, label: 'Approved' },
    { to: '/revision', icon: RotateCcw, label: 'For Revision' },
    { to: '/received', icon: Inbox, label: 'Received Requests' },
  ];

  const superAdminLinks = [
    { to: '/super-admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/manage-admins', icon: User, label: 'Manage Admins' },
  ];

  const headLinks = [
    { to: '/head', icon: LayoutDashboard, label: 'Head Dashboard' },
    { to: '/division-head', icon: User, label: 'Manage Employees' },
    { to: '/all-documents', icon: FileText, label: 'All Documents' },
    { to: '/pending', icon: FileText, label: 'Pending' },
    { to: '/received', icon: Inbox, label: 'Forwarded Documents' },
  ];

  const recorderLinks = [
    { to: '/records', icon: LayoutDashboard, label: 'Recorder Dashboard' },
    { to: '/records/all', icon: FileText, label: 'All Documents' },
    { to: '/records', icon: Archive, label: 'Recorded' },
  ];

  const releaserLinks = [
    { to: '/releaser', icon: LayoutDashboard, label: 'Releaser Dashboard' },
    { to: '/releaser/all', icon: FileText, label: 'All Documents' },
    { to: '/releaser/pending', icon: Clock, label: 'Pending Release' },
    { to: '/releaser/released', icon: CheckCircle, label: 'Released' },
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
            <FileText className="h-6 w-6 text-sidebar-primary" />
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
<<<<<<< HEAD
                {(() => {
                  const isEmp = user?.User_Role === 'Employee';
                  const assigned = String(user?.pre_assigned_role ?? '').trim().toLowerCase();
                  if (isEmp && assigned === 'recorder') return <p className="text-xs text-sidebar-foreground/70">Employee / Recorder</p>;
                  if (isEmp && assigned === 'releaser') return <p className="text-xs text-sidebar-foreground/70">Employee / Releaser</p>;
                  const displayRole = user?.User_Role ?? '';
                  return <p className="text-xs text-sidebar-foreground/70">{displayRole}</p>;
                })()}
=======
                <p className="text-xs text-sidebar-foreground/70">{displayRole}</p>
>>>>>>> 781b62bb2b5993984baa04d709947b843eaaf808
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
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  collapsed && 'justify-center',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
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
              'w-full gap-3 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
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
