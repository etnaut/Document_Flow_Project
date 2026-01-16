import React, { useEffect, useState, useMemo } from 'react';
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
import ForwardDocumentDialog from '@/components/documents/ForwardDocumentDialog';
import RespondDocumentDialog from '@/components/documents/RespondDocumentDialog';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Reply } from 'lucide-react';

type TabValue = 'all' | 'pending' | 'approved' | 'revision' | 'received' | 'not_forwarded' | 'forwarded';

const AllDocuments: React.FC = () => {
  const { user } = useAuth();
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

  useEffect(() => {
    fetchAllDocuments();
  }, [user]);

  const fetchAllDocuments = async () => {
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
        getApprovedDocuments(user.Department, undefined, user.User_Id).catch(() => []),
      ]);

      // Map all documents
      const mappedAll = (allDocs || []).map((d: any) => ({
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
      const mappedReceived: Document[] = (received || []).map((r: any, idx: number) => ({
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
        // @ts-ignore
        sender_department_id: r.sender_department_id ?? undefined,
        // @ts-ignore
        sender_division_id: r.sender_division_id ?? undefined,
      }));
      setReceivedDocuments(mappedReceived);

      // Map approved documents for forward status
      const mappedApproved = (approvedForForward || []).map((d: any) => ({
        ...d,
        description: d.forwarded_by_admin || d.admin || '',
      }));
      
      const notForwarded = mappedApproved.filter((d: any) => 
        (d.Status || '').toLowerCase() === 'not forwarded'
      );
      const forwarded = mappedApproved.filter((d: any) => 
        (d.Status || '').toLowerCase() === 'forwarded'
      );
      
      setNotForwardedDocuments(notForwarded);
      setForwardedDocuments(forwarded);
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
      await updateDocumentStatus(id, 'Revision', comment, user.Full_Name);
      toast({ title: 'Document sent for revision.' });
      fetchAllDocuments();
    } catch (error) {
      console.error('Revision failed', error);
      toast({ title: 'Failed to update document', variant: 'destructive' });
    }
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
    fetchAllDocuments();
  };

  const handleRespondClick = (doc: Document) => {
    setSelectedRespondDocument(doc);
    setRespondDialogOpen(true);
  };

  const handleRespond = async (releaseDocId: number, status: 'actioned' | 'not actioned', comment: string) => {
    if (!user) return;
    try {
      await createRespondDocument(releaseDocId, user.User_Id, status, comment);
      toast({ title: 'Response saved successfully.' });
      fetchAllDocuments();
    } catch (error: any) {
      console.error('Error saving response:', error);
      const errorMessage = error?.message || error?.error || 'Failed to save response';
      toast({ 
        title: 'Failed to save response', 
        description: errorMessage,
        variant: 'destructive' 
      });
      throw error;
    }
  };

  const handleArchive = async (doc: Document) => {
    try {
      if ((doc as any).record_doc_id) {
        try {
          await markRelease((doc as any).record_doc_id, 'done');
        } catch (err) {
          console.warn('Failed to mark release done:', err);
        }
      }
      await archiveDocument(doc.Document_Id);
      toast({ title: 'Request marked as done.' });
      fetchAllDocuments();
    } catch (error) {
      console.error('Failed to mark request done', error);
      toast({ title: 'Failed to mark request done', variant: 'destructive' });
    }
  };

  const renderReceivedActions = (doc: Document) => (
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
    <div className="space-y-6 min-h-screen p-6" style={{ backgroundColor: '#f6f2ee' }}>
      {/* Header */}
      <div className="bg-transparent">
        <h1 className="text-3xl font-bold text-gray-900">Application Review</h1>
        <p className="mt-1 text-gray-600">
          Review and manage business permit applications.
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="w-full">
        <TabsList className="bg-white border border-gray-200 rounded-lg p-1.5 h-auto gap-1 inline-flex">
          <TabsTrigger 
            value="all" 
            className="data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-700 data-[state=inactive]:hover:bg-gray-100 rounded-md px-4 py-2 text-sm font-medium transition-all"
          >
            All ({counts.all})
          </TabsTrigger>
          <TabsTrigger 
            value="pending"
            className="data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-700 data-[state=inactive]:hover:bg-gray-100 rounded-md px-4 py-2 text-sm font-medium transition-all"
          >
            Pending ({counts.pending})
          </TabsTrigger>
          <TabsTrigger 
            value="approved"
            className="data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-700 data-[state=inactive]:hover:bg-gray-100 rounded-md px-4 py-2 text-sm font-medium transition-all"
          >
            Approved ({counts.approved})
          </TabsTrigger>
          <TabsTrigger 
            value="revision"
            className="data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-700 data-[state=inactive]:hover:bg-gray-100 rounded-md px-4 py-2 text-sm font-medium transition-all"
          >
            For Revision ({counts.revision})
          </TabsTrigger>
          <TabsTrigger 
            value="received"
            className="data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-700 data-[state=inactive]:hover:bg-gray-100 rounded-md px-4 py-2 text-sm font-medium transition-all"
          >
            Received Requests ({counts.received})
          </TabsTrigger>
          <TabsTrigger 
            value="not_forwarded"
            className="data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-700 data-[state=inactive]:hover:bg-gray-100 rounded-md px-4 py-2 text-sm font-medium transition-all"
          >
            Not Forwarded ({counts.not_forwarded})
          </TabsTrigger>
          <TabsTrigger 
            value="forwarded"
            className="data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-700 data-[state=inactive]:hover:bg-gray-100 rounded-md px-4 py-2 text-sm font-medium transition-all"
          >
            Forwarded Documents ({counts.forwarded})
          </TabsTrigger>
        </TabsList>

        {/* Content */}
        <TabsContent value={activeTab} className="mt-4">
          <DocumentViewToggle
            documents={currentDocuments}
            onApprove={activeTab === 'pending' ? handleApprove : undefined}
            onReject={activeTab === 'pending' ? handleReject : undefined}
            onRevision={activeTab === 'pending' ? handleRevision : undefined}
            onForward={activeTab === 'approved' ? handleForwardClick : undefined}
            renderActions={activeTab === 'received' ? renderReceivedActions : undefined}
            showPriority
            showDescription
            descriptionLabel="Admin"
            showDate={false}
            enablePagination
            pageSizeOptions={[10, 20, 50]}
            defaultView="table"
            showStatusFilter={false}
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
      />

      <RespondDocumentDialog
        open={respondDialogOpen}
        onOpenChange={setRespondDialogOpen}
        document={selectedRespondDocument}
        onRespond={handleRespond}
      />
    </div>
  );
};

export default AllDocuments;
