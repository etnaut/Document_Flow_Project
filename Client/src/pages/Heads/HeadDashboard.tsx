import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import DocumentTable from '@/components/documents/DocumentTable';
import { getDocuments, getDocumentsByStatus, createUser, getDepartments, getDivisions, getApprovedDocuments } from '@/services/api';
import { Document, User } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

const HeadDashboard: React.FC = () => {
  const { user } = useAuth();
  // Only head roles allowed
  const allowed = user && (user.User_Role === 'DepartmentHead' || user.User_Role === 'DivisionHead' || user.User_Role === 'OfficerInCharge');
  const [allDocs, setAllDocs] = useState<Document[]>([]);
  const [pendingDocs, setPendingDocs] = useState<Document[]>([]);
  const [forwardedDocs, setForwardedDocs] = useState<Document[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    approved: 0,
    forwarded: 0,
  });
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (!allowed) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [approvedDocs, pending] = await Promise.all([
        getApprovedDocuments(user?.Department),
        getDocumentsByStatus('Pending', user?.Department, user?.User_Role),
      ]);

      // Map admin/status into description to surface in Comment column
      const mappedApproved = (approvedDocs || []).map((d: any) => ({
        ...d,
        description: d.forwarded_by_admin || d.admin || '',
      }));

      setAllDocs(mappedApproved);
      setPendingDocs(pending || []);

      // forwarded: derive by status from approved feed
      const forwarded = (mappedApproved || []).filter((d) => (d.Status || '').toLowerCase() === 'forwarded');
      setForwardedDocs(forwarded);

      setCounts({
        total: mappedApproved.length,
        approved: mappedApproved.length,
        forwarded: forwarded.length,
      });

      const depts = await getDepartments();
      setDepartments(depts);
    } catch (err: any) {
      console.error('HeadDashboard load error', err);
      toast({ title: 'Error', description: err?.message || 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
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
        // Force created accounts from this dialog to have the Employee role
        User_Role: 'Employee',
        User_Name: form.User_Name,
        Password: form.Password,
        Status: true,
      });
      toast({ title: 'Success', description: 'Employee added' });
      setIsAddOpen(false);
      setForm({ ID_Number: '', Full_Name: '', Gender: '', Email: '', Department: user?.Department || '', Division: user?.Division || '', User_Name: '', Password: '', Role: 'Employee' });
      await loadData();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to add employee', variant: 'destructive' });
    }
  };

  if (!allowed) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Head Dashboard</h1>
          <p className="text-muted-foreground">Overview for department/division heads and OICs</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>Add Employee</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Employee</DialogTitle>
              </DialogHeader>
              {/* Note: Only Employee accounts may be created from this dialog. */}
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
                      // load divisions
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Total Documents</p>
          <p className="text-2xl font-bold text-foreground">{counts.total}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Approved Documents</p>
          <p className="text-2xl font-bold text-foreground">{counts.approved}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Forwarded Documents</p>
          <p className="text-2xl font-bold text-foreground">{counts.forwarded}</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold">All Documents</h2>
        <DocumentTable documents={allDocs} showDescription descriptionLabel="Admin" showDate={false} />
      </div>
    </div>
  );
};

export default HeadDashboard;
