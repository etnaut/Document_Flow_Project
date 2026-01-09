import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDocumentsByStatus, updateDocumentStatus, forwardDocument } from '@/services/api';
import { Document } from '@/types';
import DocumentTable from '@/components/documents/DocumentTable';
import ForwardDocumentDialog from '@/components/documents/ForwardDocumentDialog';
import { toast } from '@/hooks/use-toast';
import { CheckCircle } from 'lucide-react';

const ApprovedDocuments: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const fetchDocuments = async () => {
    if (!user) return;
    try {
      const data = await getDocumentsByStatus('Approved', user.Department, user.User_Role);
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async (id: number) => {
    await updateDocumentStatus(id, 'Released');
    toast({ title: 'Document released successfully.' });
    fetchDocuments();
  };

  const handleForwardClick = (doc: Document) => {
    setSelectedDocument(doc);
    setForwardDialogOpen(true);
  };

  const handleForward = async (documentId: number, targetDepartment: string, notes: string) => {
    await forwardDocument(documentId, targetDepartment, notes, user?.Department, user?.Full_Name);
    toast({ 
      title: 'Document forwarded successfully.',
      description: `Sent to ${targetDepartment} department.`
    });
    fetchDocuments();
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
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
            <CheckCircle className="h-6 w-6 text-success" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Approved Documents</h1>
            <p className="text-muted-foreground">
              Approved documents for {user?.Department} - release or forward to another department.
            </p>
          </div>
        </div>
      </div>

      <DocumentTable 
        documents={documents} 
        onRelease={handleRelease} 
        onForward={handleForwardClick}
        showStatusFilter={false}
        enablePagination
        pageSizeOptions={[10,20,50]}
      />

      <ForwardDocumentDialog
        open={forwardDialogOpen}
        onOpenChange={setForwardDialogOpen}
        document={selectedDocument}
        currentDepartment={user?.Department || ''}
        onForward={handleForward}
      />
    </div>
  );
};

export default ApprovedDocuments;
