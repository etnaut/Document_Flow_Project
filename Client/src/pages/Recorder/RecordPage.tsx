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

  const [recordedDocs, setRecordedDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load only recorded/archived documents
      const recorded = await getDocumentsByStatus('Archived', user?.Department, user?.User_Role);
      setRecordedDocs(recorded || []);
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

      <div>
        <h2 className="text-lg font-semibold">Recorded</h2>
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading...</div>
        ) : (
          <DocumentTable documents={recordedDocs} />
        )}
      </div>
    </div>
  );
};

export default RecordPage;
