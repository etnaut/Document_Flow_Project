import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getApprovedDocuments, updateDocumentStatus } from '@/services/api';
import { Document } from '@/types';
import DocumentTable from '@/components/documents/DocumentTable';
import { toast } from '@/hooks/use-toast';

const HeadNotForwarded: React.FC = () => {
  const { user } = useAuth();
  const allowed = user && (user.User_Role === 'DepartmentHead' || user.User_Role === 'DivisionHead' || user.User_Role === 'OfficerInCharge');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  useEffect(() => {
    if (!allowed) return;
    void loadDocuments();
  }, [allowed, user?.Department]);

  const loadDocuments = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const approvedDocs = await getApprovedDocuments(user.Department);
      const mapped = (approvedDocs || [])
        .map((d: any) => ({
          ...d,
          description: d.forwarded_by_admin || d.admin || '',
        }))
        .filter((d) => (d.Status || '').toLowerCase() === 'not forwarded');
      setDocuments(mapped);
    } catch (error: any) {
      console.error('Head Not Forwarded load error', error);
      toast({ title: 'Failed to load documents', description: error?.message || 'Please try again', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!allowed) return <Navigate to="/dashboard" replace />;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Not Forwarded</h1>
          <p className="text-muted-foreground">Documents approved but not yet forwarded from your department.</p>
        </div>
      </div>

      <DocumentTable
        documents={documents}
        onForward={async (doc) => {
          if (!user) return;
          try {
            setSubmittingId(doc.Document_Id);
            await updateDocumentStatus(doc.Document_Id, 'Forwarded', undefined, user.Full_Name);
            toast({ title: 'Document forwarded' });
            void loadDocuments();
          } catch (error: any) {
            console.error('Forward failed', error);
            toast({ title: 'Failed to forward document', description: error?.message || 'Please try again', variant: 'destructive' });
          } finally {
            setSubmittingId(null);
          }
        }}
        showDescription
        descriptionLabel="Admin"
        showDate={false}
        showStatusFilter={false}
        enablePagination
        pageSizeOptions={[10,20,50]}
      />
    </div>
  );
};

export default HeadNotForwarded;
