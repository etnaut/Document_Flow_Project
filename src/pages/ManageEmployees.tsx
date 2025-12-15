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
import { getEmployeesByDepartment, createUser, getDepartments, getDivisions } from '@/services/api';
import { User } from '@/types';
import { Plus, Users } from 'lucide-react';

const ManageEmployees: React.FC = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<User[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    ID_Number: '',
    Full_Name: '',
    Gender: '',
    Email: '',
    Division: '',
    User_Name: '',
    Password: '',
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const [usersData, deptData, divData] = await Promise.all([
      getEmployeesByDepartment(user.Department),
      getDepartments(),
      getDivisions(),
    ]);
    setEmployees(usersData);
    setDepartments(deptData);
    setDivisions(divData);
  };

  if (user?.User_Role !== 'Admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.Full_Name || !formData.Email || !formData.User_Name || !formData.Password || !formData.Division) {
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
        Department: user!.Department, // Employee belongs to admin's department
        Division: formData.Division,
        User_Role: 'Employee',
        User_Name: formData.User_Name,
        Password: formData.Password,
        Status: true,
      });
      
      toast({
        title: 'Success',
        description: 'Employee account created successfully.',
      });
      
      setIsOpen(false);
      setFormData({
        ID_Number: '',
        Full_Name: '',
        Gender: '',
        Email: '',
        Division: '',
        User_Name: '',
        Password: '',
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create employee account.',
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
          <h1 className="text-2xl font-bold text-foreground">Manage Employees</h1>
          <p className="text-muted-foreground">
            Create and manage employee accounts in {user?.Department}
          </p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Create Employee Account
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
                  placeholder="Jane Doe"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="Email">Email *</Label>
                <Input
                  id="Email"
                  type="email"
                  value={formData.Email}
                  onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                  placeholder="employee@company.com"
                />
              </div>
              
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
                    {divisions.map((div) => (
                      <SelectItem key={div} value={div}>{div}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm text-muted-foreground">
                  <strong>Department:</strong> {user?.Department}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Employees are automatically assigned to your department.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="User_Name">Username *</Label>
                  <Input
                    id="User_Name"
                    value={formData.User_Name}
                    onChange={(e) => setFormData({ ...formData, User_Name: e.target.value })}
                    placeholder="employeeuser"
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
                  {isLoading ? 'Creating...' : 'Create Employee'}
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
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Division</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  No employees found in your department.
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => (
                <TableRow key={employee.User_Id}>
                  <TableCell>{employee.ID_Number}</TableCell>
                  <TableCell className="font-medium">{employee.Full_Name}</TableCell>
                  <TableCell>{employee.Email}</TableCell>
                  <TableCell>{employee.Division}</TableCell>
                  <TableCell>{employee.User_Name}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-1 text-xs ${
                      employee.Status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {employee.Status ? 'Active' : 'Inactive'}
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

export default ManageEmployees;
