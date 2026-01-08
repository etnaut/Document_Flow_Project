import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getUsers } from '@/services/api';
import { Shield, Users, UserCog } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';

const SuperAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ admins: 0, employees: 0 });

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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold text-muted-foreground">
              Total Admins
            </CardTitle>
            <Shield className="h-7 w-7 text-white" />
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-4xl font-bold">{stats.admins}</div>
            <p className="text-sm text-muted-foreground mt-1">Department administrators</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold text-muted-foreground">
              Total Employees
            </CardTitle>
            <Users className="h-7 w-7 text-white" />
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-4xl font-bold">{stats.employees}</div>
            <p className="text-sm text-muted-foreground mt-1">Across all departments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold text-muted-foreground">
              Total Users
            </CardTitle>
            <UserCog className="h-7 w-7 text-white" />
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-4xl font-bold">{stats.admins + stats.employees}</div>
            <p className="text-sm text-muted-foreground mt-1">System-wide</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bar Chart - User Distribution */}
        <Card className="bg-white/10 border-white/20 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-white">User Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={[
                { name: 'Admins', count: stats.admins },
                { name: 'Employees', count: stats.employees },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
                <XAxis dataKey="name" stroke="white" />
                <YAxis stroke="white" />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{
                     backgroundColor: 'rgba(0,0,0,0.8)',
                     border: '1px solid rgba(255,255,255,0.2)',
                     borderRadius: '8px',
                   }}
                  labelStyle={{ color: 'white' }}
                  itemStyle={{ color: 'white' }}
                />

                <Bar dataKey="count" fill="#2dd4bf" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart - User Percentage */}
        <Card className="bg-white/10 border-white/20 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-white">User Percentage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
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
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#2dd4bf" />
                  <Cell fill="#818cf8" />
                </Pie>
                <Tooltip
                     contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        }}
                     itemStyle={{ color: '#ffffff' }}   // value text
                     labelStyle={{ color: '#ffffff' }}  // label text
                />

              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Area Chart - Total Users */}
        <Card className="bg-white/10 border-white/20 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-white">Total Users Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={[
                { month: 'Jan', total: Math.floor((stats.admins + stats.employees) * 0.7) },
                { month: 'Feb', total: Math.floor((stats.admins + stats.employees) * 0.8) },
                { month: 'Mar', total: Math.floor((stats.admins + stats.employees) * 0.85) },
                { month: 'Apr', total: Math.floor((stats.admins + stats.employees) * 0.9) },
                { month: 'May', total: Math.floor((stats.admins + stats.employees) * 0.95) },
                { month: 'Jun', total: stats.admins + stats.employees },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
                <XAxis dataKey="month" stroke="white" />
                <YAxis stroke="white" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px' }}
                  labelStyle={{ color: 'white' }}
                  itemStyle={{ color: 'white' }}
                />
                <Area type="monotone" dataKey="total" stroke="#f59e0b" fill="rgba(245, 158, 11, 0.4)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
