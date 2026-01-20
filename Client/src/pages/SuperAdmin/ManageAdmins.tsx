import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { getUsers, createUser, getDepartments, getDivisions, createDepartment, createDivision, updateUserStatus, updateUserAssignment } from '@/services/api';
import { User } from '@/types';
import { Plus, UserCog, Shield } from 'lucide-react';

const ManageAdmins: React.FC = () => {
  const { user, impersonateById, getDefaultRoute } = useAuth();
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<User[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    ID_Number: '',
    Full_Name: '',
    Gender: '',
    Email: '',
    Department: '',
    Division: '',
    User_Name: '',
    Password: '',
    Role: 'Admin',
  });
  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
  const [isDivDialogOpen, setIsDivDialogOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDivName, setNewDivName] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [isImpersonateConfirmOpen, setIsImpersonateConfirmOpen] = useState(false);
  // For status change confirmation
  const [statusTarget, setStatusTarget] = useState<{ userId: number; fullName: string; newStatus: boolean } | null>(null);
  // Override dialog
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState<{ userId: number; fullName: string; preAssignedRole: string; status: boolean } | null>(null);
  const [impersonateTarget, setImpersonateTarget] = useState<{ userId: number; fullName: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Filters and pagination (moved up so hooks are declared before any early returns)
  const visibleAdmins = admins.filter((admin) => ['Admin', 'DepartmentHead', 'DivisionHead'].includes(admin.User_Role));
  const [query, setQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const filteredAdmins = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return visibleAdmins.filter((a) => {
      const matchesDept = deptFilter === 'all' || a.Department === deptFilter;
      if (!q) return matchesDept;
      const hay = [a.Full_Name || '', a.Email || '', a.Department || '', a.Division || '', a.User_Role || '', a.Status ? 'active' : 'inactive']
        .join(' ').toLowerCase();
      return matchesDept && hay.includes(q);
    });
  }, [visibleAdmins, query, deptFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredAdmins.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageSlice = filteredAdmins.slice((currentPage - 1) * pageSize, (currentPage) * pageSize);
  React.useEffect(() => { setPage(1); }, [query, deptFilter, pageSize, admins]);

  const loadData = async () => {
    try {
      const [usersData, deptData] = await Promise.all([
        getUsers(),
        getDepartments(),
      ]);
      setAdmins(usersData);
      setDepartments(deptData);
      // Start with empty divisions until a department is selected
      setDivisions([]);
    } catch (err: unknown) {
      console.error('ManageAdmins: loadData error', err);
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: 'Error', description: message || 'Failed to load data', variant: 'destructive' });
    }
  };

  // Fetch divisions for a given department when creating a new admin
  const loadDivisionsForDepartment = async (department: string) => {
    if (!department) {
      setDivisions([]);
      setFormData((prev) => ({ ...prev, Division: '' }));
      return;
    }

    try {
      const divs = await getDivisions(department);
      setDivisions(divs);
      // If current selected division is not in the new list, clear it
      setFormData((prev) => {
        if (!divs.includes(prev.Division)) {
          return { ...prev, Division: '' };
        }
        return prev;
      });
    } catch (err: unknown) {
      console.error('Failed to load divisions for department', err);
      setDivisions([]);
    }
  };

  if (user?.User_Role !== 'SuperAdmin') {
    return <Navigate to="/dashboard" replace />;
  }

  // on submit: validate then show confirmation dialog
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.Full_Name || !formData.Email || !formData.User_Name || !formData.Password || !formData.Department || !formData.Division || !formData.Role) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    // Local duplicate checks to reduce chance of DB unique constraint errors
    const idNum = parseInt(formData.ID_Number, 10);
    if (!isNaN(idNum) && admins.some((a) => Number(a.ID_Number) === idNum)) {
      toast({ title: 'Duplicate ID', description: 'ID Number already exists. Please use a different ID.', variant: 'destructive' });
      return;
    }

    if (admins.some((a) => a.User_Name && a.User_Name.toLowerCase() === formData.User_Name.trim().toLowerCase())) {
      toast({ title: 'Duplicate Username', description: 'Username already exists. Please choose another username.', variant: 'destructive' });
      return;
    }

    if (admins.some((a) => a.Email && a.Email.toLowerCase() === formData.Email.trim().toLowerCase())) {
      toast({ title: 'Duplicate Email', description: 'Email already exists. Please use a different email.', variant: 'destructive' });
      return;
    }

    setIsConfirmOpen(true);
  };

  const doCreateAdmin = async () => {
    setIsConfirmOpen(false);
    setIsLoading(true);
    try {
      await createUser({
        ID_Number: parseInt(formData.ID_Number) || Date.now(),
        Full_Name: formData.Full_Name,
        Gender: formData.Gender,
        Email: formData.Email,
        Department: formData.Department,
        Division: formData.Division,
        User_Role: (formData.Role as User['User_Role']) || 'Admin',
        User_Name: formData.User_Name,
        Password: formData.Password,
        Status: true,
      });

      toast({ title: 'Success', description: 'Admin account created successfully.' });
      setIsOpen(false);
      setFormData({ ID_Number: '', Full_Name: '', Gender: '', Email: '', Department: '', Division: '', User_Name: '', Password: '', Role: 'Admin' });
      await loadData();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (typeof msg === 'string' && /duplicate key value/i.test(msg)) {
        const m = msg.match(/Key \(([^)]+)\)=\(([^)]+)\)/i);
        if (m) {
          const key = m[1];
          const val = m[2];
          toast({ title: 'Duplicate value', description: `${key} '${val}' already exists. Please use a different ${key}.`, variant: 'destructive' });
        } else {
          toast({ title: 'Duplicate value', description: 'An account with that information already exists.', variant: 'destructive' });
        }
      } else {
        toast({ title: 'Error', description: msg || 'Failed to create admin account.', variant: 'destructive' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = (userId: number, fullName: string, currentStatus: boolean, force?: boolean) => {
    const next = typeof force === 'boolean' ? force : !currentStatus;
    setStatusTarget({ userId, fullName, newStatus: next });
    setIsStatusConfirmOpen(true);
  };

  const openOverrideDialog = (a: User) => {
    setOverrideTarget({
      userId: a.User_Id,
      fullName: a.Full_Name,
      preAssignedRole: a.pre_assigned_role ? String(a.pre_assigned_role) : '__none', // sentinel for "none"
      status: !!a.Status,
    });
    setIsOverrideOpen(true);
  };

  const openImpersonateDialog = (a: User) => {
    setImpersonateTarget({ userId: a.User_Id, fullName: a.Full_Name });
    setIsImpersonateConfirmOpen(true);
  };

  const doImpersonate = async () => {
    if (!impersonateTarget) return;
    setIsLoading(true);
    try {
      const target = await impersonateById(impersonateTarget.userId);
      if (target) {
        // navigate to the impersonated user's default route
        navigate(getDefaultRoute(target));
      }
      setIsImpersonateConfirmOpen(false);
      setImpersonateTarget(null);
    } finally {
      setIsLoading(false);
    }
  };

  const doOverride = async () => {
    if (!overrideTarget) return;
    setIsLoading(true);
    try {
      const role = overrideTarget.preAssignedRole === '__none' ? '' : overrideTarget.preAssignedRole;
      await updateUserAssignment(overrideTarget.userId, role);
      // Update account status if changed
      const current = admins.find((x) => x.User_Id === overrideTarget.userId);
      if (!current || current.Status !== overrideTarget.status) {
        await updateUserStatus(overrideTarget.userId, overrideTarget.status);
      }
      toast({ title: 'Success', description: 'Override applied successfully.' });
      setIsOverrideOpen(false);
      setOverrideTarget(null);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: 'Error', description: message || 'Failed to apply override', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const doToggleStatus = async () => {
    if (!statusTarget) return;
    setIsLoading(true);
    try {
      await updateUserStatus(statusTarget.userId, statusTarget.newStatus);
      toast({ title: 'Success', description: `Account ${statusTarget.newStatus ? 'activated' : 'deactivated'} successfully.` });
      setStatusTarget(null);
      setIsStatusConfirmOpen(false);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: 'Error', description: message || 'Failed to update user status', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-wide text-primary">Manage Admins</h1>
          <p className="text-muted-foreground">Create and manage department admin accounts</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="text-white">
              <Plus className="mr-2 h-4 w-4 text-white" />
              Add Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg backdrop-blur-md shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Create Admin Account
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">Note: Choose the role for the account (Admin, Department Head, Division Head, or Officer In Charge).</p>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ID_Number">ID Number</Label>
                  <Input
                    id="ID_Number"
                    type="number"
                    value={formData.ID_Number}
                    onChange={(e) => setFormData({ ...formData, ID_Number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="Gender">Gender</Label>
<<<<<<< HEAD
                  <Select value={formData.Gender} onValueChange={(value) => setFormData({ ...formData, Gender: value })}>
                    <SelectTrigger className="text-black">
>>>>>>> update-backend
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
                <Label htmlFor="Full_Name">Full Name</Label>
                <Input
                  id="Full_Name"
                  value={formData.Full_Name}
                  onChange={(e) => setFormData({ ...formData, Full_Name: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="Email">Email</Label>
                <Input
                  id="Email"
                  type="email"
                  value={formData.Email}
                  onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="Division">Division</Label>
                  <div className="flex items-center gap-2">
                    <Select
                    value={formData.Division}
                    onValueChange={(value) => setFormData({ ...formData, Division: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select division" />
                    </SelectTrigger>
                    <SelectContent>
                      {divisions.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">No divisions available</div>
                      ) : (
                        divisions.map((div) => (
                          <SelectItem key={div} value={div}>{div}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="ghost"
                      type="button"
                      disabled={!formData.Department}
                      title={!formData.Department ? 'Select a department first' : 'Add division'}
                      onClick={() => setIsDivDialogOpen(true)}
                    >
                      +
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="Department">Department</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={formData.Department}
                      onValueChange={(value) => {
                        setFormData((prev) => ({ ...prev, Department: value }));
                        loadDivisionsForDepartment(value);
                      }}
                    >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="ghost"
                      type="button"
                      onClick={() => setIsDeptDialogOpen(true)}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="User_Name">Username</Label>
                  <Input
                    id="User_Name"
                    value={formData.User_Name}
                    onChange={(e) => setFormData({ ...formData, User_Name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="Password">Password</Label>
                  <Input
                    id="Password"
                    type="password"
                    value={formData.Password}
                    onChange={(e) => setFormData({ ...formData, Password: e.target.value })}
                  />
                </div>
              </div>

                <div className="space-y-2">
                  <Label htmlFor="Role">Role</Label>
<<<<<<< HEAD
                  <Select
                    value={formData.Role}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, Role: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
=======
                  <Select value={formData.Role} onValueChange={(v) => setFormData((p) => ({ ...p, Role: v }))}>
                    <SelectTrigger className="text-black"><SelectValue /></SelectTrigger>
                    <SelectContent className="text-black">
>>>>>>> update-backend
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="DepartmentHead">Department Head</SelectItem>
                      <SelectItem value="DivisionHead">Division Head</SelectItem>
                      <SelectItem value="OfficerInCharge">Officer In Charge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="button" onClick={() => doCreateAdmin()} disabled={isLoading}>{isLoading ? 'Creating…' : 'Create'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
<<<<<<< HEAD
          {/* Department creation dialog */}
          <Dialog open={isDeptDialogOpen} onOpenChange={setIsDeptDialogOpen}>
            <DialogContent className="max-w-md backdrop-blur-md shadow-2xl">
              <DialogHeader>
                <DialogTitle>Create Department</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <Label>Department Name</Label>
                <Input value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setIsDeptDialogOpen(false); setNewDeptName(''); }}>Cancel</Button>
                  <Button onClick={async () => {
                    if (!newDeptName.trim()) {
                      toast({ title: 'Validation', description: 'Please fill out the department name to proceed', variant: 'destructive' });
                      return;
                    }
                    try {
                      await createDepartment(newDeptName.trim());
                      const depts = await getDepartments();
                      setDepartments(depts);
                      toast({ title: 'Success', description: 'Department created' });
                      setIsDeptDialogOpen(false);
                      setNewDeptName('');
                    } catch (err: any) {
                      toast({ title: 'Error', description: err.message || 'Failed to create department', variant: 'destructive' });
                    }
                  }}>
                    Create
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

            {/* Confirmation Dialog for creating admin */}
            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
              <DialogContent className="max-w-md backdrop-blur-md shadow-2xl">
                <DialogHeader>
                  <DialogTitle>Confirm Create Admin</DialogTitle>
                </DialogHeader>
                <div className="mt-2 space-y-2">
                  <div><strong>Full Name:</strong> {formData.Full_Name}</div>
                  <div><strong>Email:</strong> {formData.Email}</div>
                  <div><strong>Department:</strong> {formData.Department}</div>
                  <div><strong>Division:</strong> {formData.Division}</div>
                  <div><strong>Role:</strong> {formData.Role}</div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>Cancel</Button>
                  <Button onClick={doCreateAdmin}>Confirm</Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Confirmation Dialog for status change (activate/deactivate) */}
            <Dialog open={isStatusConfirmOpen} onOpenChange={setIsStatusConfirmOpen}>
              <DialogContent className="max-w-md backdrop-blur-md shadow-2xl">
                <DialogHeader>
                  <DialogTitle>Confirm Status Change</DialogTitle>
                </DialogHeader>
                <div className="mt-2">
                  {statusTarget ? (
                    <div>
                      <p className="text-sm">You want to {statusTarget.newStatus ? 'activate' : 'deactivate'} this account:</p>
                      <p className="font-medium">{statusTarget.fullName}</p>
                    </div>
                  ) : (
                    <p className="text-sm">No user selected.</p>
                  )}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => { setIsStatusConfirmOpen(false); setStatusTarget(null); }}>Cancel</Button>
                  <Button onClick={() => { setIsStatusConfirmOpen(false); void doToggleStatus(); }} disabled={isLoading}>{isLoading ? 'Processing...' : 'Confirm'}</Button>
                </div>
              </DialogContent>
            </Dialog>

          {/* Division creation dialog */}
          <Dialog open={isDivDialogOpen} onOpenChange={setIsDivDialogOpen}>
            <DialogContent className="max-w-md backdrop-blur-md shadow-2xl">
              <DialogHeader>
                <DialogTitle>Create Division</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <Label>Division Name</Label>
                <Input value={newDivName} onChange={(e) => setNewDivName(e.target.value)} />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setIsDivDialogOpen(false); setNewDivName(''); }}>Cancel</Button>
                  <Button onClick={async () => {
                    if (!formData.Department) {
                      toast({ title: 'Validation', description: 'Please select a department first', variant: 'destructive' });
                      return;
                    }
                    if (!newDivName.trim()) {
                      toast({ title: 'Validation', description: 'Please fill out the division name to proceed', variant: 'destructive' });
                      return;
                    }
                    try {
                      await createDivision(newDivName.trim(), formData.Department);
                      await loadDivisionsForDepartment(formData.Department);
                      toast({ title: 'Success', description: 'Division created' });
                      setIsDivDialogOpen(false);
                      setNewDivName('');
                    } catch (err: any) {
                      toast({ title: 'Error', description: err.message || 'Failed to create division', variant: 'destructive' });
                    }
                  }}>
                    Create
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
=======

>>>>>>> update-backend
      </div>

      <div className="rounded-xl border bg-card shadow-card overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Admins</h2>
            <div className="flex items-center gap-3">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search admins..." className="w-[220px] border-primary" />
              <Select value={deptFilter} onValueChange={(v) => setDeptFilter(v)}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filter by department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {departments.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Rows per page</span>
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(parseInt(v))}>
                  <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[5,10,20,50].map((n) => (<SelectItem key={n} value={String(n)}>{n}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
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
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
<<<<<<< HEAD
            {visibleAdmins.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  <UserCog className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  No admin accounts found.
                </TableCell>
              </TableRow>
=======
            {pageSlice.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-16 text-center text-black/80">No admins found</TableCell></TableRow>
>>>>>>> update-backend
            ) : (
              pageSlice.map((a) => (
                <TableRow key={a.User_Id}>
                  <TableCell className="font-medium">{a.Full_Name}</TableCell>
                  <TableCell>{a.Email}</TableCell>
                  <TableCell>{a.Department}</TableCell>
                  <TableCell>{a.Division || '—'}</TableCell>
                  <TableCell>{a.User_Role}</TableCell>
                  <TableCell>{a.Status ? 'Active' : 'Inactive'}</TableCell>
                  <TableCell>
<<<<<<< HEAD
                    <span
                      role="button"
                      tabIndex={0}
                      title={admin.Status ? 'Click to deactivate this account' : 'Click to activate this account'}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleToggleStatus(admin.User_Id, admin.Full_Name, admin.Status);
                        }
                      }}
                      onClick={() => handleToggleStatus(admin.User_Id, admin.Full_Name, admin.Status)}
                      className={`cursor-pointer inline-block rounded-full px-2 py-1 text-xs border ${
                        admin.Status ? 'bg-green-500/20 text-foreground border-green-500/30' : 'bg-red-500/20 text-foreground border-red-500/30'
                      }`}
                    >
                      {admin.Status ? 'Active' : 'Inactive'}
                    </span>
=======
                    <div className="flex gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">Actions</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onSelect={() => handleToggleStatus(a.User_Id, a.Full_Name, a.Status, true)}>Activate</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleToggleStatus(a.User_Id, a.Full_Name, a.Status, false)}>Deactivate</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openImpersonateDialog(a)}>Sign in as</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
>>>>>>> update-backend
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="p-3 border-t grid grid-cols-3 items-center text-sm">
          <div className="justify-self-start">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
          <div className="justify-self-center text-xs text-muted-foreground">Page {currentPage} of {totalPages}</div>
          <div className="justify-self-end">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </div>

      {/* Status change confirmation dialog */}
      <Dialog open={isStatusConfirmOpen} onOpenChange={setIsStatusConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{statusTarget?.newStatus ? 'Confirm Activation' : 'Confirm Deactivation'}</DialogTitle>
            <DialogDescription>Are you sure you want to {statusTarget?.newStatus ? 'activate' : 'deactivate'} the account for <strong>{statusTarget?.fullName}</strong>?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsStatusConfirmOpen(false)}>Cancel</Button>
            <Button onClick={() => void doToggleStatus()} disabled={isLoading}>{isLoading ? 'Processing…' : 'Confirm'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override dialog */}
      <Dialog open={isOverrideOpen} onOpenChange={(open) => { if (!open) { setOverrideTarget(null); } setIsOverrideOpen(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Override: {overrideTarget?.fullName ?? ''}</DialogTitle>
            <DialogDescription>Set a pre-assigned role and activation status for this account.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pre-assigned Role</Label>
              <Select value={overrideTarget?.preAssignedRole ?? '__none'} onValueChange={(v) => setOverrideTarget((p) => p ? { ...p, preAssignedRole: v } : p)}>
                <SelectTrigger className="text-black"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  <SelectItem value="Recorder">Recorder</SelectItem>
                  <SelectItem value="Releaser">Releaser</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={overrideTarget?.status ? 'active' : 'inactive'} onValueChange={(v) => setOverrideTarget((p) => p ? { ...p, status: v === 'active' } : p)}>
                <SelectTrigger className="text-black"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setIsOverrideOpen(false); setOverrideTarget(null); }}>Cancel</Button>
            <Button onClick={() => void doOverride()} disabled={isLoading}>{isLoading ? 'Saving…' : 'Apply'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Impersonate confirmation dialog */}
      <Dialog open={isImpersonateConfirmOpen} onOpenChange={setIsImpersonateConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign in as {impersonateTarget?.fullName ?? ''}</DialogTitle>
            <DialogDescription>Confirm that you want to sign in as this user. This will end your current session. You can revert back using the Revert action in the notification.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsImpersonateConfirmOpen(false)}>Cancel</Button>
            <Button onClick={() => void doImpersonate()} disabled={isLoading}>{isLoading ? 'Signing in…' : 'Sign in as user'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default ManageAdmins;
