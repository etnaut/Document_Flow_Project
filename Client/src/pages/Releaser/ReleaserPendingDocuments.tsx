import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getDocumentsByStatus, updateDocumentStatus } from '@/services/api';
import { Document } from '@/types';
import DocumentTable from '@/components/documents/DocumentTable';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Clock } from 'lucide-react';

const ReleaserPendingDocuments: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const isReleaser = user && (user.User_Role === 'Releaser' || String(user.pre_assigned_role ?? '').trim().toLowerCase() === 'releaser');

  const load = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Treat "Approved" as pending release for Releasers
      const data = await getDocumentsByStatus('Approved', user.Department, user.User_Role);
      setDocuments(data || []);
    } catch (err: any) {
      console.error('Releaser pending load error', err);
      toast({ title: 'Error', description: err?.message || 'Failed to load documents', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [user]);

  const handleRelease = async (id: number) => {
    try {
      await updateDocumentStatus(id, 'Released');
      toast({ title: 'Document released' });
      await load();
    } catch (err: any) {
      console.error('Release error', err);
      toast({ title: 'Error', description: err?.message || 'Failed to release document', variant: 'destructive' });
    }
  };

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Pending Release</h1>
            <p className="text-muted-foreground">Approved documents awaiting release for {user.Department}.</p>
          </div>
        </div>
        <Button onClick={() => void load()} variant="outline">Refresh</Button>
      </div>

      <DocumentTable documents={documents} onRelease={handleRelease} />
    </div>
  );
};

export default ReleaserPendingDocuments;
