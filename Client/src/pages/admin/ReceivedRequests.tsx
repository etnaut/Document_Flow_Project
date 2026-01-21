import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getReceivedRequests,
  createRespondDocument,
  archiveDocument,
  markRelease,
  getDepartments,
  getDivisions,
} from '@/services/api';
import { Document } from '@/types';
import DocumentViewToggle from '@/components/documents/DocumentViewToggle';
import RespondDocumentDialog from '@/components/documents/RespondDocumentDialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Inbox, Reply, CheckCircle2 } from 'lucide-react';

const ReceivedRequests: React.FC = () => {
  const { user, impersonator } = useAuth();
  const isSuperAdmin = user?.User_Role === 'SuperAdmin';
  const [departments, setDepartments] = useState<string[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedDiv, setSelectedDiv] = useState<string>('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  const fetchDocuments = useCallback(async () => {
    const effectiveDept = isSuperAdmin ? selectedDept : user?.Department;
    const effectiveDiv = isSuperAdmin ? selectedDiv : user?.Division;
    if (!effectiveDept) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getReceivedRequests(effectiveDept, effectiveDiv, user?.User_Id);
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
        priority?: string;
        admin?: string;
        forwarded_by_admin?: string;
        final_status?: string | null;
      };

      const mapped: Document[] = (data || []).map((r: ReceivedRaw, idx: number) => ({
        Document_Id: r.document_id ?? r.record_doc_id ?? idx,
        record_doc_id: r.record_doc_id,
        Type: r.type || 'Document',
        User_Id: r.user_id ?? 0,
        Status: (r.status ?? 'Released') as Document['Status'],
        Priority: r.priority || 'Low',
        Document: r.document ?? null,
        sender_name: r.full_name || r.name || '',
        sender_department: r.department || '',
        target_department: r.department || '',
        description: r.admin || r.forwarded_by_admin || '',
        comments: r.admin || r.forwarded_by_admin || '',
        final_status: r.final_status || null,
        forwarded_from: r.division || '',
        mark: String(r.mark ?? '').toLowerCase(),
        sender_department_id: r.sender_department_id ?? undefined,
        sender_division_id: r.sender_division_id ?? undefined,
        created_at: (r as any).created_at ?? (r as any).date ?? null,
      }));
      setDocuments(mapped);
    } catch (error: unknown) {
      console.error('Error fetching received requests:', error);
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Unable to load received requests', description: message || undefined, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user?.Department, user?.Division, user?.User_Id, isSuperAdmin, selectedDept, selectedDiv]);

  useEffect(() => {
    const init = async () => {
      if (isSuperAdmin) {
        try {
          const depts = await getDepartments();
          setDepartments(depts || []);
          const firstDept = depts?.[0] ?? '';
          setSelectedDept((prev) => prev || firstDept);
          if (firstDept) {
            const divs = await getDivisions(firstDept);
            setDivisions(divs || []);
            setSelectedDiv((prev) => prev || divs?.[0] || '');
          }
        } catch {
          setDepartments([]);
          setDivisions([]);
        }
      }
      await fetchDocuments();
    };
    void init();
  }, [isSuperAdmin, fetchDocuments]);

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
      await createRespondDocument(releaseDocId, user.User_Id, status, comment, documentBase64, filename, mimetype, impersonator ? true : false);
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
        {isSuperAdmin && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Department</span>
              <select
                className="rounded-md border bg-background p-2 text-sm"
                value={selectedDept}
                onChange={async (e) => {
                  const next = e.target.value;
                  setSelectedDept(next);
                  try {
                    const divs = await getDivisions(next);
                    setDivisions(divs || []);
                    setSelectedDiv(divs?.[0] || '');
                  } catch {
                    setDivisions([]);
                    setSelectedDiv('');
                  }
                }}
              >
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Division</span>
              <select
                className="rounded-md border bg-background p-2 text-sm"
                value={selectedDiv}
                onChange={(e) => setSelectedDiv(e.target.value)}
                disabled={divisions.length === 0}
              >
                {divisions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <DocumentViewToggle
        documents={documents}
        renderActions={renderActions}
        showStatusFilter={false}
        enablePagination
        pageSizeOptions={[10,20,50]}
<<<<<<< HEAD
        showDate={false}
        defaultView="accordion"
=======
        showDate={true}
        showDescription={true}
        descriptionLabel="Admin"
        onMarkRelease={handleMarkRelease}
>>>>>>> 14358356059b01645918b43587691d6bc6cf2e43
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
