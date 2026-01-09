import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getApprovedDocuments } from '@/services/api';
import { toast } from '@/hooks/use-toast';

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
  const approved = await getApprovedDocuments(user.Department, 'forwarded,recorded');
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
          <h1 className="text-2xl font-bold text-foreground">Recorder Dashboard</h1>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Documents" value={counts.total} loading={loading} />
        <StatCard title="Not Recorded" value={counts.notRecorded} loading={loading} />
        <StatCard title="Recorded" value={counts.recorded} loading={loading} />
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: number; loading?: boolean }> = ({ title, value, loading }) => (
  <div className="rounded-lg border bg-card p-4 shadow-sm">
    <p className="text-sm text-muted-foreground">{title}</p>
    <p className="text-2xl font-bold text-foreground">{loading ? '…' : value}</p>
  </div>
);

export default RecorderDashboard;
