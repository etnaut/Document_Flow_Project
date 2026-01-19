import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRecordedDocuments } from '@/services/api';
import { Document } from '@/types';
import StatCard from '@/components/dashboard/StatCard';
import { FileText, Clock, CheckCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import DocumentTable from '@/components/documents/DocumentTable';

const ReleaserDashboard: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const isReleaser = user && (user.User_Role === 'Releaser' || String(user.pre_assigned_role ?? '').trim().toLowerCase() === 'releaser');

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const docs = await getRecordedDocuments(user.Department);
      setDocuments((docs || []).map((d: Document) => ({ ...d, description: d.approved_admin || d.approved_comments || d.description || '' })));
    } catch (err: unknown) {
      console.error('Releaser dashboard load error', err);
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: 'Error', description: message || 'Failed to load documents', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const total = documents.length;
    const recorded = documents.filter((d) => d.Status === 'Recorded').length;
    const notRecorded = documents.filter((d) => d.Status === 'Not Recorded').length;
    const awaitingRelease = documents.filter((d) => d.Status === 'Approved' || d.Status === 'Pending').length;
    return { total, recorded, notRecorded, awaitingRelease };
  }, [documents]);

  if (!user) return <Navigate to="/login" replace />;
  if (!isReleaser) return <Navigate to="/dashboard" replace />;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Releaser Dashboard</h1>
          <p className="text-muted-foreground">Monitor documents awaiting release for your department.</p>
        </div>
        <Button onClick={() => void load()} variant="outline">Refresh</Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total" value={stats.total} icon={FileText} variant="default" />
        <StatCard title="Recorded" value={stats.recorded} icon={CheckCircle} variant="success" />
        <StatCard title="Not Recorded" value={stats.notRecorded} icon={Clock} variant="warning" />
        <StatCard title="Awaiting Release" value={stats.awaitingRelease} icon={Send} variant="info" />
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
                    { name: 'Recorded', value: stats.recorded },
                    { name: 'Not Recorded', value: stats.notRecorded },
                    { name: 'Awaiting Release', value: stats.awaitingRelease },
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
                  <Cell fill="#3b82f6" />
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
                  { name: 'Recorded', count: stats.recorded, color: '#10b981' },
                  { name: 'Not Recorded', count: stats.notRecorded, color: '#f59e0b' },
                  { name: 'Awaiting Release', count: stats.awaitingRelease, color: '#3b82f6' },
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
                  shape={(props: { x?: number; y?: number; width?: number; height?: number; payload?: { name?: string } }) => {
                    const { x = 0, y = 0, width = 0, height = 0, payload } = props;
                    const colors: { [key: string]: string } = {
                      'Recorded': '#10b981',
                      'Not Recorded': '#f59e0b',
                      'Awaiting Release': '#3b82f6',
                    };
                    return (
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={colors[payload?.name || ''] || '#3b82f6'}
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

      <div>
        <h2 className="text-lg font-semibold">Latest Documents</h2>
        <DocumentTable
          documents={documents}
          renderActions={() => null}
          enablePagination
          pageSizeOptions={[8, 16, 24]}
          prioritySuffix={(d) => d.approved_comments ? d.approved_comments : undefined}
          showDescription
          descriptionLabel="Admin"
        />
      </div>
    </div>
  );
};

export default ReleaserDashboard;
