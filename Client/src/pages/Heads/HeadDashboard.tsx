import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import DocumentTable from '@/components/documents/DocumentTable';
import { getDocuments, getDocumentsByStatus, createUser, getDepartments, getDivisions, getApprovedDocuments } from '@/services/api';
import { Document, User } from '@/types';
import { FileText, CheckCircle, Inbox, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
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
    pending: 0,
  });
  const [loading, setLoading] = useState(true);
  const monthsArr = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [monthlyData, setMonthlyData] = useState<{ month: string; total: number }[]>([]);
  const [chartYear, setChartYear] = useState<number>(new Date().getFullYear());

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

  // Recompute monthly data when documents or selected year change
  useEffect(() => {
    const months = monthsArr.map((m) => ({ month: m, total: 0 }));
    (allDocs || []).forEach((d: any) => {
      const dateStr = d.created_at || d.createdAt || d.created || d.Approved_Date || d.approved_date;
      if (!dateStr) return;
      const dt = new Date(dateStr);
      if (isNaN(dt.getTime())) return;
      if (dt.getFullYear() !== chartYear) return;
      const idx = dt.getMonth();
      months[idx].total += 1;
    });
    setMonthlyData(months);
  }, [allDocs, chartYear]);

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
        pending: pending?.length || 0,
      });

      // We'll compute monthly data in an effect so it can react to year changes
      setMonthlyData((prev) => prev);
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
              <Button className="text-white">Add Employee</Button>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 justify-items-center">
        <div className="relative rounded-lg border bg-card p-4 shadow-sm max-w-xs w-full">
          <div className="absolute top-3 right-3 rounded-full bg-muted/20 p-2">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col items-center text-center">
            <p className="text-sm text-muted-foreground">Total Documents</p>
            <p className="text-2xl font-bold text-foreground mt-2">{counts.total}</p>
          </div>
        </div>

        <div className="relative rounded-lg border bg-card p-4 shadow-sm max-w-xs w-full">
          <div className="absolute top-3 right-3 rounded-full bg-muted/20 p-2">
            <CheckCircle className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col items-center text-center">
            <p className="text-sm text-muted-foreground">Approved Documents</p>
            <p className="text-2xl font-bold text-foreground mt-2">{counts.approved}</p>
          </div>
        </div>

        <div className="relative rounded-lg border bg-card p-4 shadow-sm max-w-xs w-full">
          <div className="absolute top-3 right-3 rounded-full bg-muted/20 p-2">
            <Inbox className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col items-center text-center">
            <p className="text-sm text-muted-foreground">Forwarded Documents</p>
            <p className="text-2xl font-bold text-foreground mt-2">{counts.forwarded}</p>
          </div>
        </div>

        <div className="relative rounded-lg border bg-card p-4 shadow-sm max-w-xs w-full">
          <div className="absolute top-3 right-3 rounded-full bg-muted/20 p-2">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col items-center text-center">
            <p className="text-sm text-muted-foreground">Pending Documents</p>
            <p className="text-2xl font-bold text-foreground mt-2">{counts.pending}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Status Breakdown</h3>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie dataKey="value" data={[{ name: 'Approved', value: counts.approved }, { name: 'Forwarded', value: counts.forwarded }, { name: 'Pending', value: pendingDocs.length }]} cx="50%" cy="50%" outerRadius={70} innerRadius={40} label>
                  <Cell fill="hsl(var(--primary))" />
                  <Cell fill="hsl(var(--secondary))" />
                  <Cell fill="hsl(var(--muted-foreground))" />
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Monthly Approved</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Year</span>
              <Select value={String(chartYear)} onValueChange={(v) => setChartYear(parseInt(v))}>
                <SelectTrigger className="w-[90px] h-7"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2023,2024,2025,2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={"hsl(var(--border))"} />
                <XAxis dataKey="month" stroke={"hsl(var(--muted-foreground))"} />
                <YAxis stroke={"hsl(var(--muted-foreground))"} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke={"hsl(var(--primary))"} strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold">All Documents</h2>
        <DocumentTable documents={allDocs} showDescription descriptionLabel="Admin" showDate={false} enablePagination pageSizeOptions={[10,20,50]} />
      </div>
    </div>
  );
};

export default HeadDashboard;
