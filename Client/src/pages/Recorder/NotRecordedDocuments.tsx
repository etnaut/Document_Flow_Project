import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DocumentTable from '@/components/documents/DocumentTable';
import { getApprovedDocuments } from '@/services/api';
import { Document } from '@/types';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

const NotRecordedDocuments: React.FC = () => {
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
          if (statusRaw !== 'forwarded') return null;
          return {
            ...d,
            Type: d.Type || d.type || '',
            sender_name: d.sender_name || '',
            description: d.admin || d.forwarded_by_admin || '',
            Status: 'Not Recorded' as const,
          } as Document;
        })
        .filter(Boolean) as Document[];
      setDocuments(mapped);
    } catch (error: any) {
      console.error('NotRecordedDocuments load error', error);
      toast({ title: 'Failed to load not recorded documents', description: error?.message || 'Please try again', variant: 'destructive' });
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
          <h1 className="text-2xl font-bold text-foreground">Not Recorded Documents</h1>
          <p className="text-muted-foreground">Forwarded documents pending recording for your department.</p>
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
        />
      )}
    </div>
  );
};

export default NotRecordedDocuments;
