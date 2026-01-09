import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DocumentTable from '@/components/documents/DocumentTable';
import { getApprovedDocuments, updateDocumentStatus } from '@/services/api';
import { Document } from '@/types';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const AllRecorderDocuments: React.FC = () => {
  const { user } = useAuth();
  const isRecorder = user && (user.User_Role === 'Releaser' || String(user.pre_assigned_role ?? '').toLowerCase() === 'recorder');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordDialogDoc, setRecordDialogDoc] = useState<Document | null>(null);
  const [recordStatus, setRecordStatus] = useState<'recorded' | 'not_recorded'>('recorded');
  const [recordComment, setRecordComment] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    void loadDocuments();
  }, [user]);

  const loadDocuments = async () => {
    if (!user) return;
    try {
      setLoading(true);
  const approved = await getApprovedDocuments(user.Department, 'forwarded,recorded');
      const mapped = (approved || [])
        .map((d: any) => {
          const statusRaw = (d.Status || '').toLowerCase();
          if (statusRaw !== 'forwarded' && statusRaw !== 'recorded') return null; // exclude not forwarded/other
          return {
            ...d,
            Type: d.Type || d.type || '',
            sender_name: d.sender_name || '',
            description: d.admin || d.forwarded_by_admin || '',
            Status: statusRaw === 'forwarded' ? 'Not Recorded' : 'Recorded',
          } as Document;
        })
        .filter(Boolean) as Document[];
      setDocuments(mapped);
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

  if (!user) return <Navigate to="/login" replace />;
  if (!isRecorder) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recorder - All Documents</h1>
          <p className="text-muted-foreground">Forwarded (Not Recorded) and Recorded documents for your department.</p>
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
