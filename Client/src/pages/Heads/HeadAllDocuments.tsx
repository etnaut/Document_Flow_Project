import React, { useEffect, useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getApprovedDocuments, updateDocumentStatus } from '@/services/api';
import { Document } from '@/types';
import DocumentTable from '@/components/documents/DocumentTable';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

  useEffect(() => {
    if (!allowed) return;
    fetchAllDocuments();
  }, [allowed, user?.Department]);

  const fetchAllDocuments = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const approvedDocs = await getApprovedDocuments(user.Department, undefined, user.User_Id);
      const mapped = (approvedDocs || []).map((d: any) => ({
        ...d,
        // Prefer forwarded comment when present
        description: d.comments || d.forwarded_by_admin || d.admin || '',
      }));

      setAllDocuments(mapped);
      
      const notForwarded = mapped.filter((d) => (d.Status || '').toLowerCase() === 'not forwarded');
      const forwarded = mapped.filter((d) => (d.Status || '').toLowerCase() === 'forwarded');
      
      setNotForwardedDocuments(notForwarded);
      setForwardedDocuments(forwarded);
    } catch (error: any) {
      console.error('Head All Documents load error', error);
      toast({ title: 'Failed to load documents', description: error?.message || 'Please try again', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleForward = (doc: Document) => {
    setForwardDialogDoc(doc);
    setForwardCommentLocal('');
  };

  const submitForwardLocal = async () => {
    if (!forwardDialogDoc || !user) return;
    try {
      setSubmittingId(forwardDialogDoc.Document_Id);
      await updateDocumentStatus(forwardDialogDoc.Document_Id, 'Forwarded', forwardCommentLocal.trim() || undefined, user.Full_Name);
      toast({ title: 'Document forwarded' });
      setForwardDialogDoc(null);
      setForwardCommentLocal('');
      await fetchAllDocuments();
    } catch (error: any) {
      console.error('Forward failed', error);
      toast({ title: 'Failed to forward document', description: error?.message || 'Please try again', variant: 'destructive' });
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
          <DocumentTable
            documents={currentDocuments}
            onForward={activeTab === 'not_forwarded' ? handleForward : undefined}
            showDescription
            descriptionLabel="Admin"
            showDate={false}
            enablePagination
            pageSizeOptions={[10, 20, 50]}
            showStatusFilter={false}
          />
          <Dialog open={!!forwardDialogDoc} onOpenChange={(open) => { if (!open) { setForwardDialogDoc(null); setForwardCommentLocal(''); } }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Forward Document</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div>
                  <p className="text-sm font-medium">Document</p>
                  <p className="text-sm text-muted-foreground">ID #{forwardDialogDoc?.Document_Id} — {forwardDialogDoc?.Type}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="forwardCommentLocal">Comment</Label>
                  <Textarea
                    id="forwardCommentLocal"
                    rows={3}
                    value={forwardCommentLocal}
                    onChange={(e) => setForwardCommentLocal(e.target.value)}
                    placeholder="Add a note for this forwarding (optional)"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { setForwardDialogDoc(null); setForwardCommentLocal(''); }}>Cancel</Button>
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
