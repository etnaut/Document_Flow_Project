import { User } from '@/types';

// Return the default route for a user or role string.
export const getDefaultRoute = (userOrRole: User | string) => {
  const user = userOrRole && typeof userOrRole === 'object' ? userOrRole : null;
  const role = user ? user.User_Role : (userOrRole || '');

  if (user && user.pre_assigned_role && String(user.pre_assigned_role).trim().toLowerCase() === 'recorder') {
    return '/records';
  }

  const roleString = typeof role === 'string' ? role : '';
  const normalizedRole = (roleString || '').toLowerCase();
  if (normalizedRole === 'superadmin') return '/super-admin';
  if (['departmenthead', 'divisionhead', 'officerincharge'].includes(normalizedRole)) return '/head';
  return '/dashboard';
};

export default getDefaultRoute;
