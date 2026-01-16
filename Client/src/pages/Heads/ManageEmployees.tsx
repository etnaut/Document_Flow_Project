import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getEmployeesByDepartment, getUsers, normalizeUser, updateUserStatus, createUser, getDepartments, getDivisions } from '@/services/api';
import { User } from '@/types';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

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
  });

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
    void loadDepartments();
  }, [allowed, loadEmployees]);

  const loadDepartments = async () => {
    try {
      const depts = await getDepartments();
      setDepartments(depts);
      if (user?.Department) {
        const divs = await getDivisions(user.Department);
        setDivisions(divs);
      }
    } catch (error) {
      console.error('Failed to load departments/divisions', error);
    }
  };

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

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.Full_Name || !form.Email || !form.User_Name || !form.Password) {
      toast({ title: 'Validation', description: 'Please fill required fields', variant: 'destructive' });
      return;
    }
    try {
      await createUser({
        ID_Number: parseInt(form.ID_Number) || Date.now(),
        Full_Name: form.Full_Name,
        Gender: form.Gender,
        Email: form.Email,
        Department: form.Department,
        Division: form.Division,
        User_Role: 'Employee',
        User_Name: form.User_Name,
        Password: form.Password,
        Status: true,
      });
      toast({ title: 'Success', description: 'Employee added' });
      setIsAddOpen(false);
      setForm({ ID_Number: '', Full_Name: '', Gender: '', Email: '', Department: user?.Department || '', Division: user?.Division || '', User_Name: '', Password: '' });
      await loadEmployees();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to add employee', variant: 'destructive' });
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
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-lg font-semibold">Employee List</h2>
            <div className="flex items-center gap-3">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search employees..." className="w-[220px] border-primary" />
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button type="button" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Employee
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Employee</DialogTitle>
                </DialogHeader>
                <div className="px-4 -mt-2">
                  <p className="text-sm text-muted-foreground">Only Employee accounts can be created here.</p>
                </div>
                <form onSubmit={handleCreateEmployee} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>ID Number</Label>
                      <Input value={form.ID_Number} onChange={(e) => setForm((p) => ({ ...p, ID_Number: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={form.Gender} onValueChange={(v) => setForm((p) => ({ ...p, Gender: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={form.Full_Name} onChange={(e) => setForm((p) => ({ ...p, Full_Name: e.target.value }))} />
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={form.Email} onChange={(e) => setForm((p) => ({ ...p, Email: e.target.value }))} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Select value={form.Department} onValueChange={(v) => {
                        setForm((p) => ({ ...p, Department: v, Division: '' }));
                        void (async () => {
                          try {
                            const divs = await getDivisions(v);
                            setDivisions(divs);
                          } catch { setDivisions([]); }
                        })();
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Division</Label>
                      <Select value={form.Division} onValueChange={(v) => setForm((p) => ({ ...p, Division: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select division" />
                        </SelectTrigger>
                        <SelectContent>
                          {divisions.length === 0 ? <div className="p-2 text-sm text-muted-foreground">No divisions</div> : divisions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Username</Label>
                      <Input value={form.User_Name} onChange={(e) => setForm((p) => ({ ...p, User_Name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input type="password" value={form.Password} onChange={(e) => setForm((p) => ({ ...p, Password: e.target.value }))} />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                    <Button type="submit">Add</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
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
