import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRecordedDocuments } from '@/services/api';
import { Document } from '@/types';
import StatCard from '@/components/dashboard/StatCard';
import DocumentTable from '@/components/documents/DocumentTable';
import { FileText, Clock, CheckCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

const ReleaserDashboard: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const isReleaser = user && (user.User_Role === 'Releaser' || String(user.pre_assigned_role ?? '').trim().toLowerCase() === 'releaser');

  const load = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const docs = await getRecordedDocuments(user.Department);
      setDocuments(docs || []);
    } catch (err: any) {
      console.error('Releaser dashboard load error', err);
      toast({ title: 'Error', description: err?.message || 'Failed to load documents', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [user]);

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

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Latest Documents</h2>
            <p className="text-sm text-muted-foreground">Recent items for {user.Department}</p>
          </div>
            <span className="text-xs text-muted-foreground">Paginated view</span>
        </div>
          <DocumentTable
            documents={documents}
            renderActions={() => null}
            enablePagination
            pageSizeOptions={[8, 16, 24]}
          />
      </div>
    </div>
  );
};

export default ReleaserDashboard;
