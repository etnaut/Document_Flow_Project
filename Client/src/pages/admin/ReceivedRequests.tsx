import React, { useEffect, useState, useCallback } from 'react';
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

  const fetchDocuments = useCallback(async () => {
    if (!user?.Department) return;
    setLoading(true);
    try {
      const data = await getReceivedRequests(user.Department, user?.Division, user.User_Id);
      type ReceivedRaw = {
        document_id?: number;
        record_doc_id?: number;
        type?: string;
        user_id?: number;
        status?: string;
        document?: string | null;
        full_name?: string;
        name?: string;
        department?: string;
        division?: string;
        mark?: string | number;
        sender_department_id?: number;
        sender_division_id?: number;
      };

      const mapped: Document[] = (data || []).map((r: ReceivedRaw, idx: number) => ({
        Document_Id: r.document_id ?? r.record_doc_id ?? idx,
        record_doc_id: r.record_doc_id,
        Type: r.type || 'Document',
        User_Id: r.user_id ?? 0,
        Status: (r.status ?? 'Released') as Document['Status'],
        Priority: 'Low',
        Document: r.document ?? null,
        sender_name: r.full_name || r.name || '',
        sender_department: r.department || '',
        target_department: r.department || '',
        comments: r.status || '',
        forwarded_from: r.division || '',
        mark: String(r.mark ?? '').toLowerCase(),
        sender_department_id: r.sender_department_id ?? undefined,
        sender_division_id: r.sender_division_id ?? undefined,
      }));
      setDocuments(mapped);
    } catch (error: unknown) {
      console.error('Error fetching received requests:', error);
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Unable to load received requests', description: message || undefined, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user?.Department, user?.Division, user?.User_Id]);

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  const handleRespondClick = (doc: Document) => {
    // Only allow responding when the mark is 'done'
    const mark = String(doc.mark || '').toLowerCase();
    if (mark !== 'done') {
      toast({ title: 'Cannot respond', description: 'This request has not been marked done yet.', variant: 'destructive' });
      return;
    }

    setSelectedDocument(doc);
    setRespondDialogOpen(true);
  };

  const handleRespond = async (releaseDocId: number, status: 'actioned' | 'not actioned', comment: string, documentBase64?: string, filename?: string, mimetype?: string) => {
    if (!user) return;
    try {
      console.log('Saving response:', { releaseDocId, userId: user.User_Id, status, comment, filename });
      await createRespondDocument(releaseDocId, user.User_Id, status, comment, documentBase64, filename, mimetype);
      toast({ title: 'Response saved successfully.' });
      fetchDocuments();
    } catch (error: unknown) {
      console.error('Error saving response:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
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
      if (doc.record_doc_id) {
        try {
          await markRelease(doc.record_doc_id, 'done');
        } catch (err) {
          // Non-fatal: log and continue to archive the document
          console.warn('Failed to mark release done:', err);
        }
      }

      await archiveDocument(doc.Document_Id);
      toast({ title: 'Request marked as done.' });
      fetchDocuments();
    } catch (error: unknown) {
      console.error('Failed to mark request done', error);
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Failed to mark request done', description: message || undefined, variant: 'destructive' });
    }
  };

  const handleMarkRelease = async (recordDocId: number, mark?: 'done' | 'not_done') => {
    if (!user) return;
    try {
      await markRelease(recordDocId, 'done');
      toast({ title: 'Request marked as done.' });
      fetchDocuments();
    } catch (error: unknown) {
      console.error('Failed to mark release', error);
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Failed to mark request', description: message || undefined, variant: 'destructive' });
      throw error;
    }
  };

  // render actions
  const renderActions = (doc: Document) => {
    const mark = String(doc.mark || '').toLowerCase();
    const disabled = mark !== 'done';

    return (
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleRespondClick(doc)}
          disabled={disabled}
          title={disabled ? 'Cannot respond until the request is marked done' : 'Respond'}
        >
          <Reply className="mr-2 h-4 w-4" /> Respond
        </Button>
      </div>
    );
  };

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
        showStatusFilter={false}
        enablePagination
        pageSizeOptions={[10,20,50]}
        showDate={false}
        onMarkRelease={handleMarkRelease}
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
