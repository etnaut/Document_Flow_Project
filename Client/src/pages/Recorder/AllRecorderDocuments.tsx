import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DocumentTable from '@/components/documents/DocumentTable';
import { getApprovedDocuments, updateDocumentStatus } from '@/services/api';
import { Document } from '@/types';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

const AllRecorderDocuments: React.FC = () => {
  const { user } = useAuth();
  const isRecorder = user && (user.User_Role === 'Releaser' || String(user.pre_assigned_role ?? '').toLowerCase() === 'recorder');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void loadDocuments();
  }, [user]);

  const loadDocuments = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const approved = await getApprovedDocuments(user.Department);
      const mapped = (approved || [])
        .map((d: any) => {
          const statusRaw = (d.Status || '').toLowerCase();
          if (statusRaw !== 'forwarded' && statusRaw !== 'recorded') return null; // exclude not forwarded/other
          return {
            ...d,
            Type: d.Type || d.type || '',
            sender_name: d.sender_name || '',
            description: d.admin || d.forwarded_by_admin || '',
            Status: statusRaw === 'forwarded' ? 'Not Recorded' : 'Recorded',
          } as Document;
        })
        .filter(Boolean) as Document[];
      setDocuments(mapped);
    } catch (error: any) {
      console.error('AllRecorderDocuments load error', error);
      toast({ title: 'Failed to load recorded documents', description: error?.message || 'Please try again', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRecord = async (doc: Document) => {
    if (!user) return;
    try {
      await updateDocumentStatus(doc.Document_Id, 'Recorded', undefined, user.Full_Name);
      toast({ title: 'Document recorded' });
      await loadDocuments();
    } catch (error: any) {
      console.error('Record document error', error);
      toast({ title: 'Failed to record document', description: error?.message || 'Please try again', variant: 'destructive' });
    }
  };

  if (!user) return <Navigate to="/login" replace />;
  if (!isRecorder) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recorder - All Documents</h1>
          <p className="text-muted-foreground">Forwarded (Not Recorded) and Recorded documents for your department.</p>
        </div>
        <Button onClick={() => void loadDocuments()} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </Button>
      </div>

      {loading ? (
        <div className="p-4 text-sm text-muted-foreground">Loading documents...</div>
      ) : (
        <DocumentTable
          documents={documents}
          showDescription
          descriptionLabel="Admin"
          showDate={false}
          onRecord={handleRecord}
          enablePagination
          pageSizeOptions={[10,20,50]}
        />
      )}
    </div>
  );
};

export default AllRecorderDocuments;
