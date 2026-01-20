import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getApprovedDocuments } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FileText, Clock, CheckCircle } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';

const RecorderDashboard: React.FC = () => {
  const { user } = useAuth();
  const isRecorder = user && (user.User_Role === 'Releaser' || String(user.pre_assigned_role ?? '').toLowerCase() === 'recorder');
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    total: 0,
    recorded: 0,
    notRecorded: 0,
  });

  useEffect(() => {
    if (!user) return;
    void loadCounts();
  }, [user]);

  const loadCounts = async () => {
    if (!user) return;
    try {
      setLoading(true);
  const approved = await getApprovedDocuments(user.Department, 'forwarded,recorded', user.User_Id);
  const forwarded = (approved || []).filter((d: any) => (d.Status || '').toLowerCase() === 'forwarded').length;
  const recorded = (approved || []).filter((d: any) => (d.Status || '').toLowerCase() === 'recorded').length;
  const total = forwarded + recorded;
  const notRecorded = forwarded;

      setCounts({
        total,
        recorded,
        notRecorded,
      });
    } catch (error: any) {
      console.error('RecorderDashboard load error', error);
      toast({ title: 'Failed to load counts', description: error?.message || 'Please try again', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <Navigate to="/login" replace />;
  if (!isRecorder) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Quick counts for your department's documents.</p>
        </div>
        <button
          className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          onClick={() => void loadCounts()}
          disabled={loading}
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Documents" value={counts.total} icon={FileText} loading={loading} variant="default" />
        <StatCard title="Not Recorded" value={counts.notRecorded} icon={Clock} loading={loading} variant="warning" />
        <StatCard title="Recorded" value={counts.recorded} icon={CheckCircle} loading={loading} variant="success" />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recording Status Pie Chart */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">Recording Status Overview</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Recorded', value: counts.recorded },
                    { name: 'Not Recorded', value: counts.notRecorded },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
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

        {/* Status Comparison Bar Chart */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">Status Comparison</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'Recorded', count: counts.recorded, color: '#10b981' },
                  { name: 'Not Recorded', count: counts.notRecorded, color: '#f59e0b' },
                ]}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
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
                <Bar
                  dataKey="count"
                  radius={[8, 8, 0, 0]}
                  shape={(props: any) => {
                    const { x, y, width, height, payload } = props;
                    const colors: { [key: string]: string } = {
                      'Recorded': '#10b981',
                      'Not Recorded': '#f59e0b',
                    };
                    return (
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={colors[payload.name] || '#982B1C'}
                        rx={8}
                        ry={8}
                      />
                    );
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecorderDashboard;
