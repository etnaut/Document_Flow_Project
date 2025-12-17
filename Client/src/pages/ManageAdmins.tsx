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
  });

  useEffect(() => {
    loadData();
  }, []);

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
      setFormData({ ...formData, Division: '' });
      return;
    }

    try {
      const divs = await getDivisions(department);
      setDivisions(divs);
      // If current selected division is not in the new list, clear it
      if (!divs.includes(formData.Division)) {
        setFormData({ ...formData, Division: '' });
      }
    } catch (err: any) {
      console.error('Failed to load divisions for department', err);
      setDivisions([]);
    }
  };

  if (user?.User_Role !== 'SuperAdmin') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.Full_Name || !formData.Email || !formData.User_Name || !formData.Password || !formData.Department || !formData.Division) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await createUser({
        ID_Number: parseInt(formData.ID_Number) || Date.now(),
        Full_Name: formData.Full_Name,
        Gender: formData.Gender,
        Email: formData.Email,
        Department: formData.Department,
        Division: formData.Division,
        User_Role: 'Admin',
        User_Name: formData.User_Name,
        Password: formData.Password,
        Status: true,
      });
      
      toast({
        title: 'Success',
        description: 'Admin account created successfully.',
      });
      
      setIsOpen(false);
      setFormData({
        ID_Number: '',
        Full_Name: '',
        Gender: '',
        Email: '',
        Department: '',
        Division: '',
        User_Name: '',
        Password: '',
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create admin account.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="Department">Department *</Label>
                  <Select
                    value={formData.Department}
                    onValueChange={(value) => {
                      setFormData({ ...formData, Department: value });
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
            {admins.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  <UserCog className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  No admin accounts found.
                </TableCell>
              </TableRow>
            ) : (
              admins.map((admin) => (
                <TableRow key={admin.User_Id}>
                  <TableCell className="font-medium">{admin.Full_Name}</TableCell>
                  <TableCell>{admin.Email}</TableCell>
                  <TableCell>{admin.Department}</TableCell>
                  <TableCell>{admin.Division}</TableCell>
                  <TableCell>{admin.User_Role}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-1 text-xs ${
                      admin.Status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
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
