import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { getUsers } from '@/services/api';
import { Shield, Users, UserCog } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, BarChart, Bar } from 'recharts';
import { getMonthlyStats } from '@/services/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatCard from '@/components/dashboard/StatCard';

const SuperAdminDashboard: React.FC = () => {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState({ admins: 0, employees: 0 });
  const yearOptions = [2023, 2024, 2025, 2026];
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const [lineData, setLineData] = useState<{ month: string; total: number | null }[]>([]);
  const [zoomScale, setZoomScale] = useState<number>(1); // horizontal zoom scale (1x to 3x)
  const [yMax, setYMax] = useState<number>(100); // vertical zoom upper bound (50 to 200)
  useEffect(() => {
    const fetchMonthly = async () => {
      try {
        const data = await getMonthlyStats(year);
        setLineData(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load monthly stats', err);
        setLineData(months.map((m) => ({ month: m, total: 0 })));
      }
    };
    fetchMonthly();
  }, [year]);

  const displayLineData = React.useMemo(() => {
    if (!Array.isArray(lineData)) return [];
    return lineData; // always include all months; horizontal zoom handled via scale/scroll
  }, [lineData]);

  // Fixed Y-axis ticks up to 50
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

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const [admins, employees] = await Promise.all([
      getUsers('Admin'),
      getUsers('Employee'),
    ]);
    setStats({
      admins: admins.length,
      employees: employees.length,
    });
  };

  if (loading) return <div className="p-4">Checking authentication…</div>;

  if (user?.User_Role !== 'SuperAdmin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Super Admin Dashboard</h1>
        <p className="text-base text-muted-foreground">System overview and user management</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <StatCard title="Total Admins" value={stats.admins} icon={Shield} variant="primary" />
        <StatCard title="Total Employees" value={stats.employees} icon={Users} variant="info" />
        <StatCard title="Total Users" value={stats.admins + stats.employees} icon={UserCog} variant="default" />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pie Chart - User Percentage */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground">User Percentage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={255}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Admins', value: stats.admins },
                    { name: 'Employees', value: stats.employees },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#800000" /> {/* Admins - dark maroon */}
                  <Cell fill="#982B1C" /> {/* Employees - muted red */}
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
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Line Chart - Total Users */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-foreground">Total Users Trend</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Year</span>
              <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
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
                    <YAxis stroke={"hsl(var(--muted-foreground))"} ticks={yTicks} domain={[0, Math.min(200, Math.max(50, yMax))]} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                  itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                />
                <Line type="monotone" dataKey="total" stroke="#982B1C" strokeWidth={3} dot={{ r: 4, fill: '#982B1C' }} activeDot={{ r: 6, fill: '#800000' }} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
