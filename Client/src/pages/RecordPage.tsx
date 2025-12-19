import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import DocumentTable from '@/components/documents/DocumentTable';
import { getDocuments, getDocumentsByStatus } from '@/services/api';
import { Document } from '@/types';
import { toast } from '@/hooks/use-toast';

const RecordPage: React.FC = () => {
  const { user } = useAuth();
  // allow access to authenticated users only
  if (!user) return <Navigate to="/login" replace />;

  const [allDocs, setAllDocs] = useState<Document[]>([]);
  const [pendingDocs, setPendingDocs] = useState<Document[]>([]);
  const [recordedDocs, setRecordedDocs] = useState<Document[]>([]);
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

      // Recorded: documents with Status 'Recorded' (or 'Archived' depending on your schema)
      const recorded = (all || []).filter((d) => d.Status === 'Recorded' || d.Status === 'Archived');
      setRecordedDocs(recorded);
    } catch (err: any) {
      console.error('RecordPage load error', err);
      toast({ title: 'Error', description: err?.message || 'Failed to load records', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Records</h1>
          <p className="text-muted-foreground">Document records and status view</p>
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
            <div className="text-sm text-muted-foreground">Recorded: {recordedDocs.length}</div>
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
        <h2 className="text-lg font-semibold">Recorded</h2>
        <DocumentTable documents={recordedDocs} />
      </div>
    </div>
  );
};

export default RecordPage;
