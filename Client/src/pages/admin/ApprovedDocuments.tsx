import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getApprovedDocuments, forwardDocument } from '@/services/api';
import { Document } from '@/types';
import DocumentViewToggle from '@/components/documents/DocumentViewToggle';
import ForwardDocumentDialog from '@/components/documents/ForwardDocumentDialog';
import { toast } from '@/hooks/use-toast';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ApprovedDocuments: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [forwardIncludeNotes, setForwardIncludeNotes] = useState(true);

  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getApprovedDocuments(user?.Department, undefined, user.User_Id);
      setDocuments(data);
    } catch (error: unknown) {
      console.error('Error fetching documents:', error);
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Failed to load documents', description: message || undefined, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  const handleForwardClick = (doc: Document, includeNotes: boolean = true) => {
    setSelectedDocument(doc);
    setForwardIncludeNotes(includeNotes);
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

      <DocumentViewToggle 
        documents={documents} 
        onForward={handleForwardClick}
        showStatusFilter={false}
        enablePagination
        pageSizeOptions={[10,20,50]}
        defaultView="accordion"
      />

      <ForwardDocumentDialog
        open={forwardDialogOpen}
        onOpenChange={setForwardDialogOpen}
        document={selectedDocument}
        currentDepartment={user?.Department || ''}
        onForward={handleForward}
        showNotes={forwardIncludeNotes}
      />
    </div>
  );
};

export default ApprovedDocuments;
