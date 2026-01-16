import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { createUser, getDepartments, getDivisions } from '@/services/api';
import { Plus } from 'lucide-react';

interface Props {
  onAdded?: () => void | Promise<void>;
}

const AddEmployeeDialog: React.FC<Props> = ({ onAdded }) => {
  const [open, setOpen] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
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
    if (!open) return;
    // Reset form to ensure Department/Division are blank on each open
    setForm({ ID_Number: '', Full_Name: '', Gender: '', Email: '', Department: '', Division: '', User_Name: '', Password: '' });
    void (async () => {
      try {
        const depts = await getDepartments();
        setDepartments(depts);
        // Do not preload divisions — wait for user to pick a department so dropdown starts blank
        setDivisions([]);
      } catch (error) {
        console.warn('Failed to load departments/divisions', error);
      }
    })();
  }, [open]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.Full_Name || !form.Email || !form.User_Name || !form.Password) {
      toast({ title: 'Validation', description: 'Please fill required fields', variant: 'destructive' });
      return;
    }
    try {
      setLoading(true);
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
      setOpen(false);
      setForm({ ID_Number: '', Full_Name: '', Gender: '', Email: '', Department: '', Division: '', User_Name: '', Password: '' });
      if (onAdded) await onAdded();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to add employee', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
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
        <form onSubmit={handleCreate} className="space-y-4">
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
              <Select value={form.Department} onValueChange={async (v) => {
                setForm((p) => ({ ...p, Department: v, Division: '' }));
                try {
                  const divs = await getDivisions(v);
                  setDivisions(divs);
                } catch { setDivisions([]); }
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
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Adding…' : 'Add'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddEmployeeDialog;
