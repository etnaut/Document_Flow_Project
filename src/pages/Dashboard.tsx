import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardStats, getDocuments, getUsers } from '@/services/api';
import { Document } from '@/types';
import StatCard from '@/components/dashboard/StatCard';
import DocumentTable from '@/components/documents/DocumentTable';
import { ChartContainer, ChartTooltip, ChartLegend, ChartLegendContent, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart, Pie, Cell, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, Tooltip
} from 'recharts';
import { FileText, Clock, CheckCircle, RotateCcw, Archive, Shield, Users, UserCog } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    revision: 0,
    released: 0,
  });
  const [userCounts, setUserCounts] = useState({ admins: 0, employees: 0, total: 0 });
  const [documents, setDocuments] = useState<Document[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        // Pass user's department for filtering (Admin sees docs sent TO their dept)
        const [statsData, docsData] = await Promise.all([
          getDashboardStats(user.User_Id, user.User_Role, user.Department),
          getDocuments(user.User_Id, user.User_Role, user.Department),
        ]);
        
        setStats(statsData);
        setDocuments(docsData);
        setRecentDocuments(docsData.slice(0, 5));

        // If SuperAdmin, fetch user counts and show in dashboard
        if (user.User_Role === 'SuperAdmin') {
          const [admins, employees] = await Promise.all([
            getUsers('Admin'),
            getUsers('Employee'),
          ]);
          setUserCounts({
            admins: admins.length,
            employees: employees.length,
            total: admins.length + employees.length,
          });
        }
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
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Total Documents" value={stats.total} icon={FileText} variant="default" />
        <StatCard title="Pending" value={stats.pending} icon={Clock} variant="warning" />
        <StatCard title="Approved" value={stats.approved} icon={CheckCircle} variant="success" />
        <StatCard title="For Revision" value={stats.revision} icon={RotateCcw} variant="info" />
        <StatCard title="Released" value={stats.released} icon={Archive} variant="primary" />
      </div>

      {user?.User_Role === 'SuperAdmin' && (
        <div className="animate-slide-up">
          <h2 className="mb-4 text-xl font-semibold text-foreground">System Overview</h2>
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            <StatCard title="Total Admins" value={userCounts.admins} icon={Shield} variant="default" />
            <StatCard title="Total Employees" value={userCounts.employees} icon={Users} variant="default" />
            <StatCard title="Total Users" value={userCounts.total} icon={UserCog} variant="default" />
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="animate-slide-up">
        <h2 className="mb-4 text-xl font-semibold text-foreground">Analytics</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Pie - Status distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  Pending: { color: '#f59e0b', label: 'Pending' },
                  Approved: { color: '#10b981', label: 'Approved' },
                  Revision: { color: '#3b82f6', label: 'For Revision' },
                  Released: { color: '#7c3aed', label: 'Released' },
                }}
              >
                {(() => {
                  const statusMap: Record<string, number> = {};
                  documents.forEach((d) => (statusMap[d.Status] = (statusMap[d.Status] || 0) + 1));
                  const pieData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

                  return (
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={30}
                        outerRadius={60}
                        label
                        isAnimationActive={true}
                        animationDuration={800}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={`var(--color-${entry.name})`} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltipContent />} />
                      <Legend content={<ChartLegendContent />} />
                    </PieChart>
                  );
                })()}
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Line - Documents over last 7 days */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Last 7 Days</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ count: { color: '#3b82f6', label: 'Documents' } }}>
                {(() => {
                  const dates: string[] = [];
                  for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    dates.push(d.toISOString().split('T')[0]);
                  }
                  const lineData = dates.map((date) => ({ date, count: documents.filter((d) => d.created_at === date).length }));

                  return (
                    <LineChart data={lineData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Legend content={<ChartLegendContent />} />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        isAnimationActive={true}
                        animationDuration={1000}
                      />
                    </LineChart>
                  );
                })()}
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Bar - By Department */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">By Department</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}}>
                {(() => {
                  const map: Record<string, number> = {};
                  documents.forEach((d) => {
                    const dept = d.target_department || 'Unknown';
                    map[dept] = (map[dept] || 0) + 1;
                  });
                  const deptData = Object.entries(map).map(([department, count]) => ({ department, count }));
                  const palette = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#7c3aed'];

                  return (
                    <BarChart data={deptData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="department" />
                      <YAxis />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" isAnimationActive={true} animationDuration={900}>
                        {deptData.map((entry, idx) => (
                          <Cell key={entry.department} fill={palette[idx % palette.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  );
                })()}
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Documents */}
      <div className="animate-slide-up">
        <h2 className="mb-4 text-xl font-semibold text-foreground">Recent Documents</h2>
        <DocumentTable documents={recentDocuments} showActions={false} />
      </div>
    </div>
  );
};

export default Dashboard;
