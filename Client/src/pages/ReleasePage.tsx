import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import DocumentTable from '@/components/documents/DocumentTable';
import { getDocuments, getDocumentsByStatus } from '@/services/api';
import { Document } from '@/types';
import { toast } from '@/hooks/use-toast';

const ReleasePage: React.FC = () => {
  const { user } = useAuth();
  // allow access to authenticated users only
  if (!user) return <Navigate to="/login" replace />;

  const [allDocs, setAllDocs] = useState<Document[]>([]);
  const [pendingDocs, setPendingDocs] = useState<Document[]>([]);
  const [releasedDocs, setReleasedDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [all, pending] = await Promise.all([
        getDocuments(undefined, user?.User_Role, user?.Department),
        getDocumentsByStatus('Pending', user?.Department, user?.User_Role),
      ]);
      setAllDocs(all || []);
      setPendingDocs(pending || []);

      // Released: derive from documents that have Status === 'Released'
      const released = (all || []).filter((d) => d.Status === 'Released');
      setReleasedDocs(released);
    } catch (err: any) {
      console.error('ReleasePage load error', err);
      toast({ title: 'Error', description: err?.message || 'Failed to load releases', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Releases</h1>
          <p className="text-muted-foreground">Document releases and status view</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => void loadData()}>Refresh</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <h2 className="text-lg font-semibold">Dashboard</h2>
          <div className="p-4 border rounded">{/* Placeholder for quick stats */}
            <div className="text-sm text-muted-foreground">Total documents: {allDocs.length}</div>
            <div className="text-sm text-muted-foreground">Pending: {pendingDocs.length}</div>
            <div className="text-sm text-muted-foreground">Released: {releasedDocs.length}</div>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold">All Documents</h2>
          <DocumentTable documents={allDocs} />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Pending</h2>
          <DocumentTable documents={pendingDocs} />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold">Released</h2>
        <DocumentTable documents={releasedDocs} />
      </div>
    </div>
  );
};

export default ReleasePage;
