import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import DocumentViewToggle from '@/components/documents/DocumentViewToggle';
import { getDocuments, getDocumentsByStatus, getDepartments, getDivisions, getApprovedDocuments } from '@/services/api';
import { Document } from '@/types';
import { FileText, CheckCircle, Inbox, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import StatCard from '@/components/dashboard/StatCard';

const MONTHS_ARR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

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

  const [monthlyData, setMonthlyData] = useState<{ month: string; total: number }[]>([]);
  const [chartYear, setChartYear] = useState<number>(new Date().getFullYear());
  const [departments, setDepartments] = useState<string[]>([]);
  const [zoomScale, setZoomScale] = useState<number>(1); // horizontal zoom scale (1x to 3x)
  const [yMax, setYMax] = useState<number>(100); // vertical zoom upper bound (50 to 200)

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [approvedDocs, pending] = await Promise.all([
        getApprovedDocuments(user?.Department, undefined, user?.User_Id),
        getDocumentsByStatus('Pending', user?.Department, user?.User_Role, user?.User_Id),
      ]);

      // Map admin/status into description to surface in Comment column
      type Approved = Document & { approved_admin?: string; admin?: string; forwarded_by_admin?: string };
      const mappedApproved = (approvedDocs || []).map((d: Approved) => ({
        ...d,
        description: d.forwarded_by_admin || d.approved_admin || '',
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

      const depts = await getDepartments();
      setDepartments(depts);
    } catch (err: unknown) {
      console.error('HeadDashboard load error', err);
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: 'Error', description: message || 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!allowed) return;
    void loadData();
  }, [allowed, loadData]);

  // Recompute monthly data when documents or selected year change
  useEffect(() => {
    const months = MONTHS_ARR.map((m) => ({ month: m, total: 0 }));
    (allDocs || []).forEach((d) => {
      const raw = d as unknown as Record<string, unknown>;
      const dateStr = (raw.forwarded_date ?? raw.created_at ?? raw.createdAt ?? raw.created ?? raw.Approved_Date ?? raw.approved_date) as string | undefined;
      if (!dateStr) return;
      const dt = new Date(dateStr);
      if (isNaN(dt.getTime())) return;
      if (dt.getFullYear() !== chartYear) return;
      const idx = dt.getMonth();
      months[idx].total += 1;
    });
    setMonthlyData(months);
  }, [allDocs, chartYear]);

  const displayLineData = React.useMemo(() => {
    if (!Array.isArray(monthlyData)) return [];
    return monthlyData; // always include all months; horizontal zoom handled via scale/scroll
  }, [monthlyData]);

  // Fixed Y-axis ticks
  const yTicks = React.useMemo(() => {
    const ticks: number[] = [];
    const upper = Math.min(200, Math.max(50, Math.round(yMax / 10) * 10));
    for (let t = 0; t <= upper; t += 10) ticks.push(t);
    return ticks;
  }, [yMax]);

  const handleWheelZoom: React.WheelEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const zoomIn = e.deltaY < 0;
    if (e.ctrlKey) {
      setYMax((prev) => {
        const next = prev + (zoomIn ? -10 : 10);
        return Math.min(200, Math.max(50, next));
      });
    } else {
      setZoomScale((prev) => {
        const next = prev + (zoomIn ? 0.1 : -0.1);
        return Math.min(3, Math.max(1, Number(next.toFixed(2))));
      });
    }
  };

  const xTicks = React.useMemo(() => displayLineData.map((d) => d.month), [displayLineData]);

  if (!allowed) return <Navigate to="/dashboard" replace />;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Head Dashboard</h1>
          <p className="text-muted-foreground">Overview for department/division heads and OICs</p>
        </div>
        <Button onClick={() => loadData()} variant="outline">Refresh</Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Documents" value={counts.total} icon={FileText} variant="default" />
        <StatCard title="Approved Documents" value={counts.approved} icon={CheckCircle} variant="success" surface="plain" />
        <StatCard title="Forwarded Documents" value={counts.forwarded} icon={Inbox} variant="info" surface="plain" />
        <StatCard title="Pending Documents" value={counts.pending} icon={Clock} variant="warning" surface="plain" />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status Breakdown Pie Chart */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">Status Breakdown</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Approved', value: counts.approved },
                    { name: 'Forwarded', value: counts.forwarded },
                    { name: 'Pending', value: pendingDocs.length },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#10b981" /> {/* Success - keep green */}
                  <Cell fill="#982B1C" /> {/* Info/Other - use muted red */}
                  <Cell fill="#f59e0b" /> {/* Warning - keep amber */}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                  labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => value}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Approved Line Chart */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Monthly Approved</h3>
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
          <div
            onWheel={handleWheelZoom}
            className="select-none overflow-x-auto"
            style={{
              overflowX: zoomScale > 1 ? 'auto' as const : 'hidden' as const,
              overflowY: yMax > 100 ? 'auto' as const : 'hidden' as const,
              height: 280,
              maxHeight: 280,
              paddingBottom: 8,
              scrollbarGutter: 'stable',
            }}
          >
            <div style={{ minWidth: `${Math.max(100, zoomScale * 100)}%`, height: yMax > 100 ? `${yMax * 2.8}px` : '100%' }}>
              <ResponsiveContainer width="100%" height={yMax > 100 ? yMax * 2.8 : '100%'}>
                <LineChart data={displayLineData} margin={{ top: 8, right: 16, left: 16, bottom: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={"hsl(var(--border))"} />
                  <XAxis
                    dataKey="month"
                    stroke={"hsl(var(--muted-foreground))"}
                    ticks={xTicks}
                    interval={0}
                    padding={{ left: 24, right: 24 }}
                  />
                  <YAxis
                    stroke={"hsl(var(--muted-foreground))"}
                    ticks={yTicks}
                    domain={[0, Math.min(200, Math.max(50, yMax))]}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                    labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                  />
                  <Line type="monotone" dataKey="total" stroke="#982B1C" strokeWidth={3} dot={{ r: 4, fill: '#982B1C' }} activeDot={{ r: 6, fill: '#800000' }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
<<<<<<< HEAD

      <div>
        <h2 className="text-lg font-semibold">All Documents</h2>
        <DocumentViewToggle documents={allDocs} showDescription descriptionLabel="Admin" showDate={false} enablePagination pageSizeOptions={[10,20,50]} defaultView="accordion" />
      </div>
=======
>>>>>>> 14358356059b01645918b43587691d6bc6cf2e43
    </div>
  );
};

export default HeadDashboard;
