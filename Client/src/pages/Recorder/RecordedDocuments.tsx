import React, { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DocumentTable from '@/components/documents/DocumentTable';
import { getApprovedDocuments } from '@/services/api';
import { Document } from '@/types';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

const RecordedDocuments: React.FC = () => {
  const { user } = useAuth();
  const isRecorder = user && (user.User_Role === 'Releaser' || String(user.pre_assigned_role ?? '').toLowerCase() === 'recorder');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDocuments = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Include both recorded and released so entries that were marked released in approved table are also shown as recorded
      const approved = await getApprovedDocuments(user.Department, 'recorded,released', user.User_Id);
      type ApiRecord = Document & { approved_by?: string; approved_admin?: string; admin?: string; forwarded_by_admin?: string; type?: string };
      const mapped = (approved || [])
        .map((d: ApiRecord | null) => {
          if (!d) return null;
          const statusRaw = (d.Status || '').toLowerCase();
          if (statusRaw !== 'recorded' && statusRaw !== 'released') return null;
          return {
            ...d,
            Type: d.Type || d.type || '',
            sender_name: d.sender_name || '',
            description: d.approved_by || d.approved_admin || d.admin || d.forwarded_by_admin || '',
            Status: 'Recorded' as const,
          } as Document;
        })
        .filter(Boolean) as Document[];
      setDocuments(mapped);
    } catch (error: unknown) {
      console.error('RecordedDocuments load error', error);
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Failed to load recorded documents', description: message || 'Please try again', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void loadDocuments();
  }, [loadDocuments, user]);

  if (!user) return <Navigate to="/login" replace />;
  if (!isRecorder) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recorded Documents</h1>
          <p className="text-muted-foreground">Documents already recorded for your department.</p>
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
          showStatusFilter={false}
          enablePagination
          pageSizeOptions={[10,20,50]}
        />
      )}
    </div>
  );
};

export default RecordedDocuments;
