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

  it('routes SuperAdmin to /dashboard (SuperAdmin tools removed)', () => {
    expect(getDefaultRoute('SuperAdmin')).toBe('/dashboard');
  });

  it('routes others to /dashboard', () => {
    expect(getDefaultRoute('Admin')).toBe('/dashboard');
    expect(getDefaultRoute({ User_Role: 'Employee' } as any)).toBe('/dashboard');
  });
});
