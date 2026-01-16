import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getEmployeesByDepartment, getUsers, normalizeUser, updateUserStatus } from '@/services/api';
import { User } from '@/types';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
<<<<<<< HEAD
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
=======
import AddEmployeeDialog from '@/components/heads/AddEmployeeDialog';
>>>>>>> origin/feature/updates

type StatusFilter = 'all' | 'active' | 'inactive';

const ManageEmployees: React.FC = () => {
  const { user } = useAuth();
  const allowed = user && (user.User_Role === 'DepartmentHead' || user.User_Role === 'DivisionHead' || user.User_Role === 'OfficerInCharge');

  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
<<<<<<< HEAD

  // Add employee dialog state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [form, setForm] = useState({
    ID_Number: '',
    Full_Name: '',
    Gender: '',
    Email: '',
    Department: user?.Department || '',
    Division: user?.Division || '',
    User_Name: '',
    Password: '',
    Role: 'Employee',
  });

=======
>>>>>>> origin/feature/updates
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
    const q = query.trim().toLowerCase();
    const byStatus = statusFilter === 'all'
      ? employees
      : statusFilter === 'active'
      ? employees.filter((e) => e.Status === true)
      : employees.filter((e) => e.Status === false);
    if (!q) return byStatus;
    return byStatus.filter((e) => [e.Full_Name, e.Email, e.Department, e.Division || '']
      .join(' ').toLowerCase().includes(q));
  }, [employees, statusFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageSlice = filteredEmployees.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setPage(1); }, [statusFilter, query, pageSize, employees]);

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
          <Button
            variant="outline"
            className={`!border-primary !text-primary !bg-background ${loading ? 'pointer-events-none' : ''}`}
            aria-disabled={loading}
            onClick={() => void loadEmployees()}
          >
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rows per page</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(parseInt(v))}>
              <SelectTrigger className="w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5,10,20,50].map((n) => (<SelectItem key={n} value={String(n)}>{n}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-card overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Employee List</h2>
            <div className="flex items-center gap-3">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search employees..." className="w-[220px] border-primary" />
            </div>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Division</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Set Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="h-16 text-center text-black/80">Loading employees…</TableCell></TableRow>
            ) : filteredEmployees.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-16 text-center text-black/80">No employees found</TableCell></TableRow>
            ) : (
              pageSlice.map((emp) => (
                <TableRow key={emp.User_Id} className="animate-fade-in">
                  <TableCell className="font-medium">{emp.Full_Name}</TableCell>
                  <TableCell>{emp.Email}</TableCell>
                  <TableCell>{emp.Department}</TableCell>
                  <TableCell>{emp.Division || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={emp.Status ? 'default' : 'secondary'} className={emp.Status ? 'bg-emerald-500/10 text-emerald-700 border-emerald-200' : 'bg-red-500/10 text-red-600 border-red-200'}>
                      {emp.Status ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={emp.Status ? 'active' : 'inactive'}
                      onValueChange={(v) => void handleStatusChange(emp.User_Id, v === 'active')}
                    >
                      <SelectTrigger className={`w-[140px] font-medium ${emp.Status ? 'text-emerald-600' : 'text-red-500'}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active" className="text-emerald-600">Active</SelectItem>
                        <SelectItem value="inactive" className="text-red-500">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="p-3 border-t flex items-center justify-between text-sm">
          <span className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</span>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }} />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  );
};

export default ManageEmployees;
