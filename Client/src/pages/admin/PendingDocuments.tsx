import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDocumentsByStatus, updateDocumentStatus } from '@/services/api';
import { Document } from '@/types';
import DocumentTable from '@/components/documents/DocumentTable';
import { toast } from '@/hooks/use-toast';
import { Clock } from 'lucide-react';

const PendingDocuments: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const fetchDocuments = async () => {
    if (!user) return;
    try {
      // Filter by user's department - Admin sees pending docs sent TO their department
      const data = await getDocumentsByStatus('Pending', user.Department, user.User_Role);
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    if (!user) return;
    try {
      await updateDocumentStatus(id, 'Approved', undefined, user.Full_Name);
      toast({ title: 'Document approved successfully.' });
      fetchDocuments();
    } catch (error) {
      console.error('Approve failed', error);
      toast({ title: 'Failed to approve document', variant: 'destructive' });
    }
  };

  const handleReject = async (id: number) => {
    try {
      await updateDocumentStatus(id, 'Received');
      toast({ title: 'Document rejected.', variant: 'destructive' });
      fetchDocuments();
    } catch (error) {
      console.error('Reject failed', error);
      toast({ title: 'Failed to reject document', variant: 'destructive' });
    }
  };

  const handleRevision = async (id: number, comment?: string) => {
    try {
      await updateDocumentStatus(id, 'Revision', comment, user?.Full_Name);
      toast({ title: 'Document sent for revision.' });
      fetchDocuments();
    } catch (error) {
      console.error('Revision failed', error);
      toast({ title: 'Failed to update document', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
            <Clock className="h-6 w-6 text-warning" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Pending Documents</h1>
            <p className="text-muted-foreground">
              Documents awaiting your review ({user?.Department}).
            </p>
          </div>
        </div>
      </div>

      <DocumentTable
        documents={documents}
        onApprove={handleApprove}
        onReject={handleReject}
        onRevision={handleRevision}
      />
    </div>
  );
};

export default PendingDocuments;
