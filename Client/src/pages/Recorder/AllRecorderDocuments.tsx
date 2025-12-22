import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { getDocuments } from '@/services/api';
import { Document } from '@/types';
import DocumentTable from '@/components/documents/DocumentTable';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

const AllRecorderDocuments: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  if (!user) return <Navigate to="/login" replace />;

  const load = async () => {
    try {
      setLoading(true);
      // Limit to the recorder's department for safety
      const data = await getDocuments(user.User_Id, user.User_Role, user.Department);
      setDocuments(data || []);
    } catch (err: any) {
      console.error('Recorder all documents load error', err);
      toast({ title: 'Error', description: err?.message || 'Failed to load documents', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">All Documents (Recorder)</h1>
          <p className="text-muted-foreground">View documents for your department.</p>
        </div>
        <Button onClick={() => void load()} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {loading ? (
        <div className="p-4 text-sm text-muted-foreground">Loading documents...</div>
      ) : (
        <DocumentTable documents={documents} showActions={false} />
      )}
    </div>
  );
};

export default AllRecorderDocuments;
