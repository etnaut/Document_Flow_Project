import React, { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DocumentTable from '@/components/documents/DocumentTable';
import { getApprovedDocuments, updateDocumentStatus } from '@/services/api';
import { Document } from '@/types';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const NotRecordedDocuments: React.FC = () => {
  const { user } = useAuth();
  const isRecorder = user && (user.User_Role === 'Releaser' || String(user.pre_assigned_role ?? '').toLowerCase() === 'recorder');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordDialogDoc, setRecordDialogDoc] = useState<Document | null>(null);
  const [recordStatus, setRecordStatus] = useState<'recorded' | 'not_recorded'>('recorded');
  const [saving, setSaving] = useState(false);

  const loadDocuments = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Include both forwarded and recorded approved rows so items that progressed to 'recorded' still show up as forwarded for the recorder
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
            Status: 'Not Recorded' as const,
          } as Document;
        })
        .filter(Boolean) as Document[];
      setDocuments(mapped);
    } catch (error: unknown) {
      console.error('NotRecordedDocuments load error', error);
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Failed to load not recorded documents', description: message || 'Please try again', variant: 'destructive' });
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

  if (!user) return <Navigate to="/login" replace />;
  if (!isRecorder) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Not Recorded Documents</h1>
          <p className="text-muted-foreground">Forwarded documents pending recording for your department.</p>
        </div>
        <Button onClick={() => void loadDocuments()} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </Button>
      </div>

      {loading ? (
        <div className="p-4 text-sm text-muted-foreground">Loading documents...</div>
      ) : (
        <DocumentTable
          documents={documents}
          showDescription
          descriptionLabel="Admin"
          showDate={false}
          onRecord={handleRecord}
          showStatusFilter={false}
          enablePagination
          pageSizeOptions={[10,20,50]}
        />
      )}

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

export default NotRecordedDocuments;
