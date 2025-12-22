import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
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
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { getUsers, createUser, getDepartments, getDivisions } from '@/services/api';
import { createDepartment, createDivision } from '@/services/api';
import { updateUserStatus } from '@/services/api';
import { User } from '@/types';
import { Plus, UserCog, Shield } from 'lucide-react';

const ManageAdmins: React.FC = () => {
  const { user } = useAuth();
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
  // For status change confirmation
  const [statusTarget, setStatusTarget] = useState<{ userId: number; fullName: string; newStatus: boolean } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Debug: log when department changes to help diagnose select issues
  useEffect(() => {
    console.debug('ManageAdmins: formData.Department changed ->', formData.Department);
  }, [formData.Department]);

  const loadData = async () => {
    try {
      const [usersData, deptData] = await Promise.all([
        getUsers(),
        getDepartments(),
      ]);
      console.debug('ManageAdmins: fetched users', usersData);
      setAdmins(usersData);
      setDepartments(deptData);
      // Start with empty divisions until a department is selected
      setDivisions([]);
    } catch (err: any) {
      console.error('ManageAdmins: loadData error', err);
      toast({ title: 'Error', description: err.message || 'Failed to load data', variant: 'destructive' });
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
    } catch (err: any) {
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
        User_Role: (formData.Role as any) || 'Admin',
        User_Name: formData.User_Name,
        Password: formData.Password,
        Status: true,
      });

      toast({ title: 'Success', description: 'Admin account created successfully.' });
  setIsOpen(false);
  setFormData({ ID_Number: '', Full_Name: '', Gender: '', Email: '', Department: '', Division: '', User_Name: '', Password: '', Role: 'Admin' });
      await loadData();
    } catch (error: any) {
      // Detect common duplicate-key database error messages and display a friendlier toast
      const msg = error?.message || '';
      if (typeof msg === 'string' && /duplicate key value/i.test(msg)) {
        // Try to extract the key name and value from Postgres-style message
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

  const handleToggleStatus = (userId: number, fullName: string, currentStatus: boolean) => {
    // We ask the superadmin to confirm the inverse action (if active -> confirm deactivate)
    setStatusTarget({ userId, fullName, newStatus: !currentStatus });
    setIsStatusConfirmOpen(true);
  };

  const doToggleStatus = async () => {
    if (!statusTarget) return;
    setIsLoading(true);
    try {
      await updateUserStatus(statusTarget.userId, statusTarget.newStatus);
      toast({ title: 'Success', description: `Account ${statusTarget.newStatus ? 'activated' : 'deactivated'} successfully.` });
      setStatusTarget(null);
      // Close the status confirmation dialog
      setIsStatusConfirmOpen(false);
      await loadData();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to update user status', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const visibleAdmins = admins.filter((admin) => ['Admin', 'DepartmentHead', 'DivisionHead'].includes(admin.User_Role));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manage Admins</h1>
          <p className="text-muted-foreground">Create and manage department admin accounts</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
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
                    placeholder="1001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="Gender">Gender *</Label>
                  <Select
                    value={formData.Gender}
                    onValueChange={(value) => setFormData({ ...formData, Gender: value })}
                  >
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
                <Label htmlFor="Full_Name">Full Name *</Label>
                <Input
                  id="Full_Name"
                  value={formData.Full_Name}
                  onChange={(e) => setFormData({ ...formData, Full_Name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="Email">Email *</Label>
                <Input
                  id="Email"
                  type="email"
                  value={formData.Email}
                  onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                  placeholder="admin@company.com"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="Division">Division *</Label>
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
                        // empty list when no department selected
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
                  <Label htmlFor="Department">Department *</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={formData.Department}
                      onValueChange={(value) => {
                        // Use functional update to avoid stale state
                        setFormData((prev) => ({ ...prev, Department: value }));
                        console.debug('ManageAdmins: department selected ->', value);
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
                  <Label htmlFor="User_Name">Username *</Label>
                  <Input
                    id="User_Name"
                    value={formData.User_Name}
                    onChange={(e) => setFormData({ ...formData, User_Name: e.target.value })}
                    placeholder="adminuser"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="Password">Password *</Label>
                  <Input
                    id="Password"
                    type="password"
                    value={formData.Password}
                    onChange={(e) => setFormData({ ...formData, Password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
              </div>

                <div className="space-y-2">
                  <Label htmlFor="Role">Role *</Label>
                  <Select
                    value={formData.Role}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, Role: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="DepartmentHead">Department Head</SelectItem>
                      <SelectItem value="DivisionHead">Division Head</SelectItem>
                      <SelectItem value="OfficerInCharge">Officer In Charge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              {/* Role is implicit: only Admin accounts are created by this flow. UI hides the role input. */}
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Admin'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
          {/* Department creation dialog */}
          <Dialog open={isDeptDialogOpen} onOpenChange={setIsDeptDialogOpen}>
            <DialogContent className="max-w-md">
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
              <DialogContent className="max-w-md">
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
              <DialogContent className="max-w-md">
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
            <DialogContent className="max-w-md">
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
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Division</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleAdmins.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  <UserCog className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  No admin accounts found.
                </TableCell>
              </TableRow>
            ) : (
              visibleAdmins.map((admin) => (
                <TableRow key={admin.User_Id}>
                  <TableCell className="font-medium">{admin.Full_Name}</TableCell>
                  <TableCell>{admin.Email}</TableCell>
                  <TableCell>{admin.Department}</TableCell>
                  <TableCell>{admin.Division}</TableCell>
                  <TableCell>{admin.User_Role}</TableCell>
                  <TableCell>
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
                      className={`cursor-pointer inline-block rounded-full px-2 py-1 text-xs ${
                        admin.Status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {admin.Status ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ManageAdmins;
