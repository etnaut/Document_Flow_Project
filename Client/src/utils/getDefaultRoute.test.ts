import { describe, it, expect } from 'vitest';
import getDefaultRoute from './getDefaultRoute';

describe('getDefaultRoute', () => {
  it('routes Recorder pre_assigned_role to /records', () => {
    const user = { User_Role: 'Employee', pre_assigned_role: 'Recorder' } as any;
    expect(getDefaultRoute(user)).toBe('/records');
  });

  it('routes Head roles to /head', () => {
    expect(getDefaultRoute('DepartmentHead')).toBe('/head');
    expect(getDefaultRoute('DivisionHead')).toBe('/head');
    expect(getDefaultRoute('OfficerInCharge')).toBe('/head');
  });

  it('routes SuperAdmin to /super-admin', () => {
    expect(getDefaultRoute('SuperAdmin')).toBe('/super-admin');
  });

  it('routes Releaser pre_assigned_role to /releases', () => {
    const user = { User_Role: 'Employee', pre_assigned_role: 'Releaser' } as any;
    expect(getDefaultRoute(user)).toBe('/releases');
  });

  it('routes others to /dashboard', () => {
    expect(getDefaultRoute('Admin')).toBe('/dashboard');
    expect(getDefaultRoute({ User_Role: 'Employee' } as any)).toBe('/dashboard');
  });
});
