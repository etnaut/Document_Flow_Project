import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardStats } from '@/services/api';
import StatCard from '@/components/dashboard/StatCard';
import { FileText, Clock, CheckCircle, RotateCcw } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    revision: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        // Pass user's department for filtering (Admin sees docs sent TO their dept)
        const statsData = await getDashboardStats(user.User_Id, user.User_Role, user.Department);
        
        // Keep only the fields we display (exclude released)
        setStats({
          total: statsData.total ?? 0,
          pending: statsData.pending ?? 0,
          approved: statsData.approved ?? 0,
          revision: statsData.revision ?? 0,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

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
      <div className="animate-slide-up">
        <h1 className="text-3xl font-bold text-foreground">
          Welcome, {user?.Full_Name}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {user?.User_Role === 'Admin'
            ? `Viewing documents sent to ${user?.Department} department.`
            : 'Here\'s an overview of your document activities.'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Documents" value={stats.total} icon={FileText} variant="default" />
        <StatCard title="Pending" value={stats.pending} icon={Clock} variant="warning" surface="plain" />
        <StatCard title="Approved" value={stats.approved} icon={CheckCircle} variant="success" surface="plain" />
        <StatCard title="For Revision" value={stats.revision} icon={RotateCcw} variant="info" surface="plain" />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status Breakdown Pie Chart */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">Document Status Breakdown</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Pending', value: stats.pending },
                    { name: 'Approved', value: stats.approved },
                    { name: 'For Revision', value: stats.revision },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#f59e0b" /> {/* Warning - keep amber */}
                  <Cell fill="#10b981" /> {/* Success - keep green */}
                  <Cell fill="#982B1C" /> {/* Revision - use muted red */}
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

        {/* Status Distribution Bar Chart */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">Status Distribution</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'Pending', count: stats.pending, color: '#f59e0b' },
                  { name: 'Approved', count: stats.approved, color: '#10b981' },
                  { name: 'Revision', count: stats.revision, color: '#982B1C' },
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
                      'Pending': '#f59e0b',
                      'Approved': '#10b981',
                      'Revision': '#982B1C',
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

export default Dashboard;
