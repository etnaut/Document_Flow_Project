import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import DocumentViewToggle from '@/components/documents/DocumentViewToggle';
import { getDocuments, getDocumentsByStatus, getDepartments, getDivisions, getApprovedDocuments } from '@/services/api';
import { Document } from '@/types';
import { FileText, CheckCircle, Inbox, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
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
  const [departments, setDepartments] = useState<string[]>([]);

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
        getApprovedDocuments(user?.Department, undefined, user?.User_Id),
        getDocumentsByStatus('Pending', user?.Department, user?.User_Role, user?.User_Id),
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

  if (!allowed) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Head Dashboard</h1>
          <p className="text-muted-foreground">Overview for department/division heads and OICs</p>
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
        <DocumentViewToggle documents={allDocs} showDescription descriptionLabel="Admin" showDate={false} enablePagination pageSizeOptions={[10,20,50]} defaultView="accordion" />
      </div>
    </div>
  );
};

export default HeadDashboard;
