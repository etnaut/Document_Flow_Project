import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DocumentViewToggle from '@/components/documents/DocumentViewToggle';

import { getApprovedDocuments, updateDocumentStatus } from '@/services/api';
import { Document } from '@/types';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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
  const [saving, setSaving] = useState(false);

  const loadDocuments = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const approved = await getApprovedDocuments(user.Department, 'forwarded,recorded', user.User_Id);
      type ApiRecord = Document & { approved_by?: string; approved_admin?: string; admin?: string; forwarded_by_admin?: string; type?: string };
      const mapped = (approved || [])
        .map((d: ApiRecord | null) => {
          if (!d) return null;
          const statusRaw = (d.Status || '').toLowerCase();
          if (statusRaw !== 'forwarded' && statusRaw !== 'recorded') return null;
          return {
            ...d,
            Type: d.Type || d.type || '',
            sender_name: d.sender_name || '',
            description: d.approved_by || d.approved_admin || d.admin || d.forwarded_by_admin || '',
            Status: statusRaw === 'forwarded' ? 'Not Recorded' : 'Recorded',
            // Use record_date for recorded items when available, otherwise fall back to forwarded_date or created_at
            created_at: statusRaw === 'recorded' ? (d.record_date ?? d.forwarded_date ?? d.created_at ?? null) : (d.forwarded_date ?? d.created_at ?? null),
          } as Document;
        })
        .filter(Boolean) as Document[];

      setAllDocuments(mapped);
      
      const notRecorded = mapped.filter((d) => (d.Status || '').toLowerCase() === 'not recorded');
      const recorded = mapped.filter((d) => (d.Status || '').toLowerCase() === 'recorded');
      
      setNotRecordedDocuments(notRecorded);
      setRecordedDocuments(recorded);
    } catch (error: unknown) {
      console.error('AllRecorderDocuments load error', error);
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Failed to load recorded documents', description: message || 'Please try again', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void loadDocuments();
  }, [loadDocuments, user]);

  const handleRecord = (doc: Document) => {
    setRecordDialogDoc(doc);
    setRecordStatus('recorded');
  };

  const submitRecord = async () => {
    if (!recordDialogDoc || !user) return;
    try {
      setSaving(true);
      // Do not send comments to the record_document_tbl (column removed)
      await updateDocumentStatus(
        recordDialogDoc.Document_Id,
        'Recorded',
        undefined,
        user.Full_Name,
        recordStatus
      );
      toast({ title: 'Document recorded' });
      setRecordDialogDoc(null);
      await loadDocuments();
    } catch (error: unknown) {
      console.error('Record document error', error);
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Failed to record document', description: message || 'Please try again', variant: 'destructive' });
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
    <div className="space-y-6 min-h-screen p-6 bg-background">
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
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-muted rounded-md px-4 py-2 text-sm font-medium transition-all"
            >
              All ({counts.all})
            </TabsTrigger>
            <TabsTrigger 
              value="not_recorded"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-muted rounded-md px-4 py-2 text-sm font-medium transition-all"
            >
              Not Recorded ({counts.not_recorded})
            </TabsTrigger>
            <TabsTrigger 
              value="recorded"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-muted rounded-md px-4 py-2 text-sm font-medium transition-all"
            >
              Recorded ({counts.recorded})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Content */}
        <TabsContent value={activeTab} className="mt-4">
          <DocumentViewToggle
            documents={currentDocuments}
            showDescription
            descriptionLabel="Admin"
            showDate={true}
            onRecord={activeTab === 'not_recorded' ? handleRecord : undefined}
            enablePagination
            pageSizeOptions={[10,20,50]}
            showStatusFilter={false}
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
