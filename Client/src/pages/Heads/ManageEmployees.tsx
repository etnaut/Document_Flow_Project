import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getEmployeesByDepartment, getUsers, normalizeUser, updateUserStatus } from '@/services/api';
import { User } from '@/types';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type StatusFilter = 'all' | 'active' | 'inactive';

const ManageEmployees: React.FC = () => {
  const { user } = useAuth();
  const allowed = user && (user.User_Role === 'DepartmentHead' || user.User_Role === 'DivisionHead' || user.User_Role === 'OfficerInCharge');

  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const coerceArray = (value: unknown): unknown[] | null => {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
      const dataProp = (value as { data?: unknown[] }).data;
      const usersProp = (value as { users?: unknown[] }).users;
      if (Array.isArray(dataProp)) return dataProp;
      if (Array.isArray(usersProp)) return usersProp;
    }
    return null;
  };

  const loadEmployees = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const dept = user.Department || '';
      const div = user.Division || '';

      let list: User[] = [];
      try {
        const raw = (await getEmployeesByDepartment(dept)) as unknown;
        const coerced = coerceArray(raw);
        if (coerced) {
          list = coerced.map((item) => normalizeUser(item));
        }
      } catch (error) {
        console.warn('getEmployeesByDepartment failed, falling back to getUsers', error);
      }

      if (list.length === 0) {
        const allEmployees = await getUsers('Employee');
        list = allEmployees.filter((u) => u.Department === dept);
      }

      const scoped = user.User_Role === 'DivisionHead' ? list.filter((e) => e.Division === div) : list;
      setEmployees(scoped);
    } catch (error) {
      console.error('Load employees error', error);
      const message = error instanceof Error ? error.message : 'Failed to load employees';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!allowed) return;
    void loadEmployees();
  }, [allowed, loadEmployees]);

  const handleStatusChange = async (empId: number, nextStatus: boolean) => {
    const previous = employees.find((e) => e.User_Id === empId)?.Status;
    setEmployees((prev) => prev.map((e) => e.User_Id === empId ? { ...e, Status: nextStatus } : e));
    try {
      await updateUserStatus(empId, nextStatus);
      toast({ title: 'Saved', description: `Employee marked as ${nextStatus ? 'Active' : 'Inactive'}` });
    } catch (error) {
      // Revert on error
      if (previous !== undefined) {
        setEmployees((prev) => prev.map((e) => e.User_Id === empId ? { ...e, Status: previous } : e));
      }
      const message = error instanceof Error ? error.message : 'Failed to update status';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const filteredEmployees = useMemo(() => {
    if (statusFilter === 'all') return employees;
    if (statusFilter === 'active') return employees.filter((e) => e.Status === true);
    return employees.filter((e) => e.Status === false);
  }, [employees, statusFilter]);

  if (!allowed) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manage Employees</h1>
          <p className="text-muted-foreground">Set employees as Active or Inactive using the dropdown.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => void loadEmployees()} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
        </div>
      </div>

      <div className="overflow-auto bg-card p-4 rounded border">
        <table className="w-full table-auto text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="px-2 py-2 font-medium">Name</th>
              <th className="px-2 py-2 font-medium">Email</th>
              <th className="px-2 py-2 font-medium">Department</th>
              <th className="px-2 py-2 font-medium">Division</th>
              <th className="px-2 py-2 font-medium">Status</th>
              <th className="px-2 py-2 font-medium">Set Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-4 text-muted-foreground">Loading employees…</td></tr>
            ) : filteredEmployees.length === 0 ? (
              <tr><td colSpan={6} className="p-4 text-muted-foreground">No employees found</td></tr>
            ) : (
              filteredEmployees.map((emp) => (
                <tr key={emp.User_Id} className="border-t">
                  <td className="px-2 py-3 font-medium">{emp.Full_Name}</td>
                  <td className="px-2 py-3">{emp.Email}</td>
                  <td className="px-2 py-3">{emp.Department}</td>
                  <td className="px-2 py-3">{emp.Division || '—'}</td>
                  <td className="px-2 py-3">
                    <Badge variant={emp.Status ? 'default' : 'secondary'} className={emp.Status ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : ''}>
                      {emp.Status ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-2 py-3">
                    <Select
                      value={emp.Status ? 'active' : 'inactive'}
                      onValueChange={(v) => void handleStatusChange(emp.User_Id, v === 'active')}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageEmployees;
