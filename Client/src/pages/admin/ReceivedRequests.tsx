import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getReceivedRequests,
  createRespondDocument,
  archiveDocument,
  markRelease,
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
  }, [user?.Department, user?.Division]);

  const fetchDocuments = async () => {
    if (!user?.Department) return;
    setLoading(true);
    try {
      const data = await getReceivedRequests(user.Department, user?.Division, user.User_Id);
      const mapped: Document[] = (data || []).map((r: any, idx: number) => ({
        Document_Id: r.document_id ?? r.record_doc_id ?? idx,
        record_doc_id: r.record_doc_id,
        Type: r.type || 'Document',
        User_Id: r.user_id ?? 0,
        Status: (r.status ?? 'Released') as any,
        Priority: 'Normal',
        Document: r.document ?? null,
        sender_name: r.full_name || r.name || '',
        sender_department: r.department || '',
        target_department: r.department || '',
        comments: r.status || '',
        forwarded_from: r.division || '',
        mark: String(r.mark ?? '').toLowerCase(),
        // optional sender dept/div ids
        // @ts-ignore
        sender_department_id: r.sender_department_id ?? undefined,
        // @ts-ignore
        sender_division_id: r.sender_division_id ?? undefined,
      }));
      setDocuments(mapped);
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

  const handleRespond = async (releaseDocId: number, status: 'actioned' | 'not actioned', comment: string) => {
    if (!user) return;
    try {
      console.log('Saving response:', { releaseDocId, userId: user.User_Id, status, comment });
      await createRespondDocument(releaseDocId, user.User_Id, status, comment);
      toast({ title: 'Response saved successfully.' });
      fetchDocuments();
    } catch (error: any) {
      console.error('Error saving response:', error);
      const errorMessage = error?.message || error?.error || 'Failed to save response';
      toast({ 
        title: 'Failed to save response', 
        description: errorMessage,
        variant: 'destructive' 
      });
      throw error; // Re-throw so the dialog can handle it
    }
  };

  const handleArchive = async (doc: Document) => {
    try {
      // If we have a release record ID, mark the release as done
      if ((doc as any).record_doc_id) {
        try {
          await markRelease((doc as any).record_doc_id, 'done');
        } catch (err) {
          // Non-fatal: log and continue to archive the document
          console.warn('Failed to mark release done:', err);
        }
      }

      await archiveDocument(doc.Document_Id);
      toast({ title: 'Request marked as done.' });
      fetchDocuments();
    } catch (error) {
      console.error('Failed to mark request done', error);
      toast({ title: 'Failed to mark request done', variant: 'destructive' });
    }
  };

  const renderActions = (doc: Document) => (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => handleRespondClick(doc)}>
        <Reply className="mr-2 h-4 w-4" /> Respond
      </Button>
      <Button
        variant={
          (String((doc as any).mark || '').toLowerCase() === 'not_done')
            ? 'destructive'
            : (String((doc as any).mark || '').toLowerCase() === 'done')
            ? 'success'
            : 'ghost'
        }
        size="sm"
        onClick={() => handleArchive(doc)}
      >
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
        enablePagination
        pageSizeOptions={[10,20,50]}
        showDate={false}
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
