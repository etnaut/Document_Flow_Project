import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments, updateDocumentStatus } from '@/services/api';
import { Document } from '@/types';
import DocumentTable from '@/components/documents/DocumentTable';
import { toast } from '@/hooks/use-toast';

const AllDocuments: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const fetchDocuments = async () => {
    if (!user) return;
    try {
      // Show all documents from sender_document_tbl scoped to department (matches original source)
      const docs = await getDocuments(undefined, user.User_Role, user.Department);
      const mapped = (docs || []).map((d: any) => ({
        ...d,
        description: d.forwarded_by_admin || d.comments || d.sender_name || '',
      }));
      setDocuments(mapped);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({ title: 'Failed to load documents', variant: 'destructive' });
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

  const handleRevision = async (id: number, comment?: string) => {
    if (!user) return;
    try {
      await updateDocumentStatus(id, 'Revision', comment, user.Full_Name);
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
        <h1 className="text-3xl font-bold text-foreground">All Documents</h1>
        <p className="mt-1 text-muted-foreground">
          Documents sent to {user?.Department} department.
        </p>
      </div>

      <DocumentTable
        documents={documents}
        onApprove={handleApprove}
        onRevision={handleRevision}
        showPriority
        showDescription
        descriptionLabel="Admin"
        showDate={false}
      />
    </div>
  );
};

export default AllDocuments;
