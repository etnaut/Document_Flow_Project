import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getApprovedDocuments, updateDocumentStatus } from '@/services/api';
import { Document } from '@/types';
import DocumentViewToggle from '@/components/documents/DocumentViewToggle';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type TabValue = 'all' | 'not_forwarded' | 'forwarded';

const HeadAllDocuments: React.FC = () => {
  const { user } = useAuth();
  const allowed = user && (user.User_Role === 'DepartmentHead' || user.User_Role === 'DivisionHead' || user.User_Role === 'OfficerInCharge');
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [notForwardedDocuments, setNotForwardedDocuments] = useState<Document[]>([]);
  const [forwardedDocuments, setForwardedDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [forwardDialogDoc, setForwardDialogDoc] = useState<Document | null>(null);
  const [forwardCommentLocal, setForwardCommentLocal] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'accordion'>('table');

  const fetchAllDocuments = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const approvedDocs = await getApprovedDocuments(user.Department, undefined, user.User_Id);
      const mapped = (approvedDocs || []).map((d: Document) => ({
        ...d,
        // Prefer forwarded comment when present
        description: d.comments || d.forwarded_by_admin || d.approved_admin || '',
      }));

      setAllDocuments(mapped);
      
      const notForwarded = mapped.filter((d) => (d.Status || '').toLowerCase() === 'not forwarded');
      const forwarded = mapped.filter((d) => (d.Status || '').toLowerCase() === 'forwarded');
      
      setNotForwardedDocuments(notForwarded);
      setForwardedDocuments(forwarded);
    } catch (error: unknown) {
      console.error('Head All Documents load error', error);
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Failed to load documents', description: message || 'Please try again', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!allowed) return;
    void fetchAllDocuments();
  }, [allowed, fetchAllDocuments]);

  const handleForward = (doc: Document, _includeNotes?: boolean) => {
    setForwardDialogDoc(doc);
  };

  const submitForwardLocal = async () => {
    if (!forwardDialogDoc || !user) return;
    try {
      setSubmittingId(forwardDialogDoc.Document_Id);
      // Do not send a comment when forwarding
      await updateDocumentStatus(forwardDialogDoc.Document_Id, 'Forwarded', undefined, user.Full_Name);
      toast({ title: 'Document forwarded' });
      setForwardDialogDoc(null);
      await fetchAllDocuments();
    } catch (error: unknown) {
      console.error('Forward failed', error);
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Failed to forward document', description: message || 'Please try again', variant: 'destructive' });
    } finally {
      setSubmittingId(null);
    }
  };

  const counts = useMemo(() => ({
    all: allDocuments.length,
    not_forwarded: notForwardedDocuments.length,
    forwarded: forwardedDocuments.length,
  }), [allDocuments, notForwardedDocuments, forwardedDocuments]);

  const currentDocuments = useMemo(() => {
    switch (activeTab) {
      case 'not_forwarded':
        return notForwardedDocuments;
      case 'forwarded':
        return forwardedDocuments;
      default:
        return allDocuments;
    }
  }, [activeTab, allDocuments, notForwardedDocuments, forwardedDocuments]);

  if (!allowed) return <Navigate to="/dashboard" replace />;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-screen p-6">
      {/* Header */}
      <div className="bg-transparent">
        <h1 className="text-3xl font-bold text-gray-900">Application Review</h1>
        <p className="mt-1 text-gray-600">
          Review and manage business permit applications.
        </p>
      </div>

      {/* Tabs */}
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
          </TabsList>
        </div>

        {/* Content */}
        <TabsContent value={activeTab} className="mt-4">
          <DocumentViewToggle
            documents={currentDocuments}
            onForward={activeTab === 'not_forwarded' ? handleForward : undefined}
            showDescription
            descriptionLabel="Admin"
            showDate={false}
            enablePagination
            pageSizeOptions={[10, 20, 50]}
            showStatusFilter={false}
          />
          <Dialog open={!!forwardDialogDoc} onOpenChange={(open) => { if (!open) { setForwardDialogDoc(null); } }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Forward Document</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div>
                  <p className="text-sm font-medium">Document</p>
                  <p className="text-sm text-muted-foreground">ID #{forwardDialogDoc?.Document_Id} — {forwardDialogDoc?.Type}</p>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { setForwardDialogDoc(null); }}>Cancel</Button>
                <Button onClick={() => void submitForwardLocal()} disabled={submittingId !== null}>{submittingId ? 'Forwarding…' : 'Forward'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HeadAllDocuments;
