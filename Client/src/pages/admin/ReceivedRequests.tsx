import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getReceivedRequests,
  respondToDocument,
  archiveDocument,
} from '@/services/api';
import { Document } from '@/types';
import DocumentTable from '@/components/documents/DocumentTable';
import RespondDocumentDialog from '@/components/documents/RespondDocumentDialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Inbox, Reply, CheckCircle2 } from 'lucide-react';

const ReceivedRequests: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  useEffect(() => {
    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.Department]);

  const fetchDocuments = async () => {
    if (!user?.Department) return;
    setLoading(true);
    try {
      const data = await getReceivedRequests(user.Department);
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching received requests:', error);
      toast({ title: 'Unable to load received requests', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRespondClick = (doc: Document) => {
    setSelectedDocument(doc);
    setRespondDialogOpen(true);
  };

  const handleRespond = async (documentId: number, message: string) => {
    if (!user) return;
    await respondToDocument(documentId, user.Department, user.Full_Name, message);
    toast({ title: 'Response sent back to sender.' });
    fetchDocuments();
  };

  const handleArchive = async (id: number) => {
    await archiveDocument(id);
    toast({ title: 'Request marked as done.' });
    fetchDocuments();
  };

  const renderActions = (doc: Document) => (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => handleRespondClick(doc)}>
        <Reply className="mr-2 h-4 w-4" /> Respond
      </Button>
      <Button variant="ghost" size="sm" onClick={() => handleArchive(doc.Document_Id)}>
        <CheckCircle2 className="mr-2 h-4 w-4" /> Done
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading received requests...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Inbox className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Received Requests</h1>
            <p className="text-muted-foreground">
              Forwarded documents sent to {user?.Department}. Respond or mark them as done.
            </p>
          </div>
        </div>
      </div>

      <DocumentTable
        documents={documents}
        renderActions={renderActions}
      />

      <RespondDocumentDialog
        open={respondDialogOpen}
        onOpenChange={setRespondDialogOpen}
        document={selectedDocument}
        onRespond={handleRespond}
      />
    </div>
  );
};

export default ReceivedRequests;
