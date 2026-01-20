import { User } from '@/types';

// Return the default route for a user or role string.
export const getDefaultRoute = (userOrRole: User | string) => {
  const user = userOrRole && typeof userOrRole === 'object' ? userOrRole : null;
  const role = user ? user.User_Role : (userOrRole || '');

  if (user && user.pre_assigned_role) {
    const assigned = String(user.pre_assigned_role).trim().toLowerCase();
    if (assigned === 'recorder') return '/records';
    if (assigned === 'releaser') return '/releaser';
  }

  const roleString = typeof role === 'string' ? role : '';
  const normalizedRole = (roleString || '').toLowerCase();
  if (normalizedRole === 'superadmin') return '/dashboard';
  if (normalizedRole === 'releaser') return '/releaser';
  if (['departmenthead', 'divisionhead', 'officerincharge'].includes(normalizedRole)) return '/head';
  return '/dashboard';
};

export default getDefaultRoute;
