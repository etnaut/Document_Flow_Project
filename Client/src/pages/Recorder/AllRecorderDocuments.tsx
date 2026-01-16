import React, { useEffect, useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DocumentViewToggle from '@/components/documents/DocumentViewToggle';
import ViewToggle from '@/components/documents/ViewToggle';
import { getApprovedDocuments, updateDocumentStatus } from '@/services/api';
import { Document } from '@/types';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type TabValue = 'all' | 'not_recorded' | 'recorded';

const AllRecorderDocuments: React.FC = () => {
  const { user } = useAuth();
  const isRecorder = user && (user.User_Role === 'Releaser' || String(user.pre_assigned_role ?? '').toLowerCase() === 'recorder');
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [notRecordedDocuments, setNotRecordedDocuments] = useState<Document[]>([]);
  const [recordedDocuments, setRecordedDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordDialogDoc, setRecordDialogDoc] = useState<Document | null>(null);
  const [recordStatus, setRecordStatus] = useState<'recorded' | 'not_recorded'>('recorded');
  const [recordComment, setRecordComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'accordion'>('table');

  useEffect(() => {
    if (!user) return;
    void loadDocuments();
  }, [user]);

  const loadDocuments = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const approved = await getApprovedDocuments(user.Department, 'forwarded,recorded', user.User_Id);
      const mapped = (approved || [])
        .map((d: any) => {
          const statusRaw = (d.Status || '').toLowerCase();
          if (statusRaw !== 'forwarded' && statusRaw !== 'recorded') return null;
          return {
            ...d,
            Type: d.Type || d.type || '',
            sender_name: d.sender_name || '',
            description: d.admin || d.forwarded_by_admin || '',
            Status: statusRaw === 'forwarded' ? 'Not Recorded' : 'Recorded',
          } as Document;
        })
        .filter(Boolean) as Document[];

      setAllDocuments(mapped);
      
      const notRecorded = mapped.filter((d) => (d.Status || '').toLowerCase() === 'not recorded');
      const recorded = mapped.filter((d) => (d.Status || '').toLowerCase() === 'recorded');
      
      setNotRecordedDocuments(notRecorded);
      setRecordedDocuments(recorded);
    } catch (error: any) {
      console.error('AllRecorderDocuments load error', error);
      toast({ title: 'Failed to load recorded documents', description: error?.message || 'Please try again', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRecord = (doc: Document) => {
    setRecordDialogDoc(doc);
    setRecordStatus('recorded');
    setRecordComment('');
  };

  const submitRecord = async () => {
    if (!recordDialogDoc || !user) return;
    try {
      setSaving(true);
      const commentVal = recordComment.trim() || undefined;
      await updateDocumentStatus(
        recordDialogDoc.Document_Id,
        'Recorded',
        commentVal,
        user.Full_Name,
        recordStatus,
        commentVal
      );
      toast({ title: 'Document recorded' });
      setRecordDialogDoc(null);
      await loadDocuments();
    } catch (error: any) {
      console.error('Record document error', error);
      toast({ title: 'Failed to record document', description: error?.message || 'Please try again', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const counts = useMemo(() => ({
    all: allDocuments.length,
    not_recorded: notRecordedDocuments.length,
    recorded: recordedDocuments.length,
  }), [allDocuments, notRecordedDocuments, recordedDocuments]);

  const currentDocuments = useMemo(() => {
    switch (activeTab) {
      case 'not_recorded':
        return notRecordedDocuments;
      case 'recorded':
        return recordedDocuments;
      default:
        return allDocuments;
    }
  }, [activeTab, allDocuments, notRecordedDocuments, recordedDocuments]);

  if (!user) return <Navigate to="/login" replace />;
  if (!isRecorder) return <Navigate to="/dashboard" replace />;

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
        <div className="flex items-center justify-between gap-4">
          <TabsList className="bg-white border border-gray-200 rounded-lg p-1.5 h-auto gap-1 inline-flex">
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-700 data-[state=inactive]:hover:bg-gray-100 rounded-md px-4 py-2 text-sm font-medium transition-all"
            >
              All ({counts.all})
            </TabsTrigger>
            <TabsTrigger 
              value="not_recorded"
              className="data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-700 data-[state=inactive]:hover:bg-gray-100 rounded-md px-4 py-2 text-sm font-medium transition-all"
            >
              Not Recorded ({counts.not_recorded})
            </TabsTrigger>
            <TabsTrigger 
              value="recorded"
              className="data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-700 data-[state=inactive]:hover:bg-gray-100 rounded-md px-4 py-2 text-sm font-medium transition-all"
            >
              Recorded ({counts.recorded})
            </TabsTrigger>
          </TabsList>
          <ViewToggle view={viewMode} onViewChange={setViewMode} />
        </div>

        {/* Content */}
        <TabsContent value={activeTab} className="mt-4">
          <DocumentViewToggle
            documents={currentDocuments}
            view={viewMode}
            onViewChange={setViewMode}
            showDescription
            descriptionLabel="Admin"
            showDate={false}
            onRecord={activeTab === 'not_recorded' ? handleRecord : undefined}
            enablePagination
            pageSizeOptions={[10,20,50]}
            showStatusFilter={false}
            renderToggleInHeader={true}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={!!recordDialogDoc} onOpenChange={(open) => { if (!open) setRecordDialogDoc(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record document</DialogTitle>
            <DialogDescription>Save this forwarded document to records and update status.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm font-medium">Document</p>
              <p className="text-sm text-muted-foreground">ID #{recordDialogDoc?.Document_Id} — {recordDialogDoc?.Type}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recordStatus">Record Status</Label>
              <select
                id="recordStatus"
                className="w-full rounded-md border bg-background p-2 text-sm"
                value={recordStatus}
                onChange={(e) => setRecordStatus(e.target.value as 'recorded' | 'not_recorded')}
              >
                <option value="recorded">Recorded</option>
                <option value="not_recorded">Not Recorded</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recordComment">Comment</Label>
              <Textarea
                id="recordComment"
                rows={3}
                value={recordComment}
                onChange={(e) => setRecordComment(e.target.value)}
                placeholder="Add a note for this recording (optional)"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRecordDialogDoc(null)} disabled={saving}>Cancel</Button>
            <Button onClick={() => void submitRecord()} disabled={saving}>
              {saving ? 'Recording…' : 'Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AllRecorderDocuments;
