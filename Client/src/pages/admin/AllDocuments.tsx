import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getDocuments, 
  getDocumentsByStatus, 
  getApprovedDocuments,
  getReceivedRequests,
  updateDocumentStatus,
  forwardDocument,
  createRespondDocument,
  archiveDocument,
  markRelease,
} from '@/services/api';
import { Document } from '@/types';
import DocumentViewToggle from '@/components/documents/DocumentViewToggle';
<<<<<<< HEAD
=======
import ForwardDocumentDialog from '@/components/documents/ForwardDocumentDialog';
import RespondDocumentDialog from '@/components/documents/RespondDocumentDialog';
>>>>>>> 14358356059b01645918b43587691d6bc6cf2e43
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Reply } from 'lucide-react';

type TabValue = 'all' | 'pending' | 'approved' | 'revision' | 'received' | 'not_forwarded' | 'forwarded';

const AllDocuments: React.FC = () => {
  const { user, impersonator } = useAuth();
  // Check if user is a Department Head (not Admin)
  const isDepartmentHead = user && (user.User_Role === 'DepartmentHead' || user.User_Role === 'DivisionHead' || user.User_Role === 'OfficerInCharge');
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [pendingDocuments, setPendingDocuments] = useState<Document[]>([]);
  const [approvedDocuments, setApprovedDocuments] = useState<Document[]>([]);
  const [revisionDocuments, setRevisionDocuments] = useState<Document[]>([]);
  const [receivedDocuments, setReceivedDocuments] = useState<Document[]>([]);
  const [notForwardedDocuments, setNotForwardedDocuments] = useState<Document[]>([]);
  const [forwardedDocuments, setForwardedDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  const [selectedRespondDocument, setSelectedRespondDocument] = useState<Document | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'accordion'>('table');
  const [forwardIncludeNotes, setForwardIncludeNotes] = useState(true);


  const fetchAllDocuments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch all documents in parallel
      const [
        allDocs,
        pending,
        approved,
        revision,
        received,
        approvedForForward
      ] = await Promise.all([
        getDocuments(user.User_Id, user.User_Role),
        getDocumentsByStatus('Pending', user.Department, user.User_Role, user.User_Id),
        getDocumentsByStatus('Approved', undefined, user.User_Role, user.User_Id),
        getDocumentsByStatus('Revision', undefined, user.User_Role, user.User_Id),
        user.Department ? getReceivedRequests(user.Department, user?.Division, user.User_Id).catch(() => []) : Promise.resolve([]),
        // Only fetch approved documents for forward status if user is a Department Head
        (user.User_Role === 'DepartmentHead' || user.User_Role === 'DivisionHead' || user.User_Role === 'OfficerInCharge') 
          ? getApprovedDocuments(user.Department, undefined, user.User_Id).catch(() => [])
          : Promise.resolve([]),
      ]);

      // Map all documents
      const mappedAll = (allDocs || []).map((d: Document) => ({
        ...d,
        description: d.forwarded_by_admin || d.comments || d.sender_name || '',
      }));
      setAllDocuments(mappedAll);

      // Set pending
      setPendingDocuments(pending || []);

      // Set approved
      setApprovedDocuments(approved || []);

      // Set revision
      setRevisionDocuments(revision || []);

      // Map received requests
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

      const mappedReceived: Document[] = (received || []).map((r: ReceivedRaw, idx: number) => ({
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
        comments: r.status || '',
        final_status: r.final_status || null,
        forwarded_from: r.division || '',
        mark: String(r.mark ?? '').toLowerCase(),
        sender_department_id: r.sender_department_id ?? undefined,
        sender_division_id: r.sender_division_id ?? undefined,
        created_at: (r as any).created_at ?? (r as any).date ?? null,
      }));
      setReceivedDocuments(mappedReceived);

      // Map approved documents for forward status (only for Department Heads)
      if (isDepartmentHead) {
        const mappedApproved = (approvedForForward || []).map((d: Document) => ({
          ...d,
          description: d.forwarded_by_admin || d.approved_admin || '',
        }));
        
        const notForwarded = mappedApproved.filter((d: Document) => 
          (d.Status || '').toLowerCase() === 'not forwarded'
        );
        const forwarded = mappedApproved.filter((d: Document) => 
          (d.Status || '').toLowerCase() === 'forwarded'
        );
        
        setNotForwardedDocuments(notForwarded);
        setForwardedDocuments(forwarded);
      } else {
        setNotForwardedDocuments([]);
        setForwardedDocuments([]);
      }
    } catch (error: unknown) {
      console.error('Error fetching documents:', error);
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Failed to load documents', description: message || undefined, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, isDepartmentHead]);

  useEffect(() => {
    fetchAllDocuments();
  }, [fetchAllDocuments]);

  // Reset active tab if admin user is on a restricted tab
  useEffect(() => {
    if (!isDepartmentHead && (activeTab === 'not_forwarded' || activeTab === 'forwarded')) {
      setActiveTab('all');
    }
  }, [isDepartmentHead, activeTab]);

  const handleApprove = async (id: number) => {
    if (!user) return;
    try {
      await updateDocumentStatus(id, 'Approved', undefined, user.Full_Name, undefined, impersonator ? true : false);
      toast({ title: 'Document approved successfully.' });
      fetchAllDocuments();
    } catch (error) {
      console.error('Approve failed', error);
      toast({ title: 'Failed to approve document', variant: 'destructive' });
    }
  };

  const handleReject = async (id: number) => {
    try {
      await updateDocumentStatus(id, 'Received');
      toast({ title: 'Document rejected.', variant: 'destructive' });
      fetchAllDocuments();
    } catch (error) {
      console.error('Reject failed', error);
      toast({ title: 'Failed to reject document', variant: 'destructive' });
    }
  };

  const handleRevision = async (id: number, comment?: string) => {
    if (!user) return;
    try {
      await updateDocumentStatus(id, 'Revision', comment, user.Full_Name, undefined, impersonator ? true : false);
      toast({ title: 'Document sent for revision.' });
      fetchAllDocuments();
    } catch (error) {
      console.error('Revision failed', error);
      toast({ title: 'Failed to update document', variant: 'destructive' });
    }
  };

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
    fetchAllDocuments();
  };

  const handleRespondClick = (doc: Document) => {
    const mark = String(doc.mark || '').toLowerCase();
    if (mark !== 'done') {
      toast({ title: 'Cannot respond', description: 'This request has not been marked done yet.', variant: 'destructive' });
      return;
    }

    setSelectedRespondDocument(doc);
    setRespondDialogOpen(true);
  };

  const handleRespond = async (releaseDocId: number, status: 'actioned' | 'not actioned', comment: string, documentBase64?: string, filename?: string, mimetype?: string) => {
    if (!user) return;
    try {
      await createRespondDocument(releaseDocId, user.User_Id, status, comment, documentBase64, filename, mimetype, impersonator ? true : false);
      toast({ title: 'Response saved successfully.' });
      fetchAllDocuments();
    } catch (error: unknown) {
      console.error('Error saving response:', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      toast({ 
        title: 'Failed to save response', 
        description: errMsg,
        variant: 'destructive' 
      });
      throw error;
    }
  };

  const handleArchive = async (doc: Document) => {
    try {
      if (doc.record_doc_id) {
        try {
          await markRelease(doc.record_doc_id, 'done');
        } catch (err) {
          console.warn('Failed to mark release done:', err);
        }
      }
      await archiveDocument(doc.Document_Id);
      toast({ title: 'Request marked as done.' });
      fetchAllDocuments();
    } catch (error: unknown) {
      console.error('Failed to mark request done', error);
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Failed to mark request done', description: message || undefined, variant: 'destructive' });
    }
  };

  const handleMarkRelease = async (recordDocId: number, mark?: 'done' | 'not_done') => {
    try {
      await markRelease(recordDocId, 'done');
      toast({ title: 'Request marked as done.' });
      fetchAllDocuments();
    } catch (error: unknown) {
      console.error('Failed to mark release', error);
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Failed to mark request', description: message || undefined, variant: 'destructive' });
      throw error;
    }
  };

  const renderReceivedActions = (doc: Document) => {
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

  // Get counts for tabs
  const counts = useMemo(() => ({
    all: allDocuments.length,
    pending: pendingDocuments.length,
    approved: approvedDocuments.length,
    revision: revisionDocuments.length,
    received: receivedDocuments.length,
    not_forwarded: notForwardedDocuments.length,
    forwarded: forwardedDocuments.length,
  }), [allDocuments, pendingDocuments, approvedDocuments, revisionDocuments, receivedDocuments, notForwardedDocuments, forwardedDocuments]);

  // Get current documents based on active tab
  const currentDocuments = useMemo(() => {
    switch (activeTab) {
      case 'pending':
        return pendingDocuments;
      case 'approved':
        return approvedDocuments;
      case 'revision':
        return revisionDocuments;
      case 'received':
        return receivedDocuments;
      case 'not_forwarded':
        return notForwardedDocuments;
      case 'forwarded':
        return forwardedDocuments;
      default:
        return allDocuments;
    }
  }, [activeTab, allDocuments, pendingDocuments, approvedDocuments, revisionDocuments, receivedDocuments, notForwardedDocuments, forwardedDocuments]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-screen p-6">
      {/* Header */}
      <div className="bg-transparent">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Application Review</h1>
          <p className="mt-1 text-muted-foreground">
            Review and manage business permit applications.
          </p>
        </div>
      </div>

<<<<<<< HEAD
      <DocumentViewToggle
        documents={documents}
        onApprove={handleApprove}
        onRevision={handleRevision}
        showPriority
        showDescription
        descriptionLabel="Admin"
        showDate={false}
        enablePagination
        pageSizeOptions={[10,20,50]}
        defaultView="accordion"
=======
      {/* Tabs with Toggle */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="w-full">
        <div className="flex items-center justify-between gap-4">
          <TabsList className="bg-card border border-border rounded-lg p-1.5 h-auto gap-1 inline-flex">
          <TabsTrigger 
            value="all" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-muted rounded-md px-4 py-2 text-sm font-medium transition-all"
          >
            All ({counts.all})
          </TabsTrigger>
          <TabsTrigger 
            value="pending"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-muted rounded-md px-4 py-2 text-sm font-medium transition-all"
          >
            Pending ({counts.pending})
          </TabsTrigger>
          <TabsTrigger 
            value="approved"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-muted rounded-md px-4 py-2 text-sm font-medium transition-all"
          >
            Approved ({counts.approved})
          </TabsTrigger>
          <TabsTrigger 
            value="revision"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-muted rounded-md px-4 py-2 text-sm font-medium transition-all"
          >
            For Revision ({counts.revision})
          </TabsTrigger>
          <TabsTrigger 
            value="received"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-muted rounded-md px-4 py-2 text-sm font-medium transition-all"
          >
            Received Requests ({counts.received})
          </TabsTrigger>
          {isDepartmentHead && (
            <>
              <TabsTrigger 
                value="not_forwarded"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-muted rounded-md px-4 py-2 text-sm font-medium transition-all"
              >
                Not Forwarded ({counts.not_forwarded})
              </TabsTrigger>
              <TabsTrigger 
                value="forwarded"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-muted rounded-md px-4 py-2 text-sm font-medium transition-all"
              >
                Forwarded Documents ({counts.forwarded})
              </TabsTrigger>
            </>
          )}
          </TabsList>
          
        </div>

        {/* Content */}
        <TabsContent value={activeTab} className="mt-4">
          <DocumentViewToggle
            documents={currentDocuments}
            onApprove={activeTab === 'pending' ? handleApprove : undefined}
            onReject={activeTab === 'pending' ? handleReject : undefined}
            onRevision={activeTab === 'pending' ? handleRevision : undefined}
            onForward={activeTab === 'approved' ? handleForwardClick : undefined}
            renderActions={activeTab === 'received' ? renderReceivedActions : undefined}
            onMarkRelease={activeTab === 'received' ? handleMarkRelease : undefined}
            showPriority
            showDescription
            descriptionLabel="Admin"
            showDate={true}
            enablePagination
            pageSizeOptions={[10, 20, 50]}
            showStatusFilter={false}
            renderToggleInHeader={false}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ForwardDocumentDialog
        open={forwardDialogOpen}
        onOpenChange={setForwardDialogOpen}
        document={selectedDocument}
        currentDepartment={user?.Department || ''}
        onForward={handleForward}
        showNotes={forwardIncludeNotes}
      />

      <RespondDocumentDialog
        open={respondDialogOpen}
        onOpenChange={setRespondDialogOpen}
        document={selectedRespondDocument}
        onRespond={handleRespond}
>>>>>>> 14358356059b01645918b43587691d6bc6cf2e43
      />
    </div>
  );
};

export default AllDocuments;
