import React, { useEffect, useState } from 'react';
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

const HeadNotForwarded: React.FC = () => {
  const { user } = useAuth();
  const allowed = user && (user.User_Role === 'DepartmentHead' || user.User_Role === 'DivisionHead' || user.User_Role === 'OfficerInCharge');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [forwardDialogDoc, setForwardDialogDoc] = useState<Document | null>(null);
  const [forwardComment, setForwardComment] = useState('');

  useEffect(() => {
    if (!allowed) return;
    void loadDocuments();
  }, [allowed, user?.Department]);

  const loadDocuments = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const approvedDocs = await getApprovedDocuments(user.Department, undefined, user.User_Id);
      const mapped = (approvedDocs || [])
        .map((d: any) => ({
          ...d,
          // prefer comments (forward note) when available
          description: d.comments || d.forwarded_by_admin || d.admin || '',
        }))
        .filter((d) => (d.Status || '').toLowerCase() === 'not forwarded');
      setDocuments(mapped);
    } catch (error: any) {
      console.error('Head Not Forwarded load error', error);
      toast({ title: 'Failed to load documents', description: error?.message || 'Please try again', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!allowed) return <Navigate to="/dashboard" replace />;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Not Forwarded</h1>
          <p className="text-muted-foreground">Documents approved but not yet forwarded from your department.</p>
        </div>
      </div>

      <DocumentTable
        documents={documents}
        onForward={(doc) => setForwardDialogDoc(doc)}
        showDescription
        descriptionLabel="Admin"
        showDate={false}
        showStatusFilter={false}
        enablePagination
        pageSizeOptions={[10,20,50]}
      />

      <Dialog open={!!forwardDialogDoc} onOpenChange={(open) => { if (!open) { setForwardDialogDoc(null); setForwardComment(''); } }}>
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
              <Label htmlFor="forwardComment">Comment</Label>
              <Textarea
                id="forwardComment"
                rows={3}
                value={forwardComment}
                onChange={(e) => setForwardComment(e.target.value)}
                placeholder="Add a note for this forwarding (optional)"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setForwardDialogDoc(null); setForwardComment(''); }} disabled={submittingId !== null}>Cancel</Button>
            <Button onClick={async () => {
              if (!forwardDialogDoc || !user) return;
              try {
                setSubmittingId(forwardDialogDoc.Document_Id);
                await updateDocumentStatus(forwardDialogDoc.Document_Id, 'Forwarded', forwardComment.trim() || undefined, user.Full_Name);
                toast({ title: 'Document forwarded' });
                setForwardDialogDoc(null);
                setForwardComment('');
                await loadDocuments();
              } catch (error: any) {
                console.error('Forward failed', error);
                toast({ title: 'Failed to forward document', description: error?.message || 'Please try again', variant: 'destructive' });
              } finally {
                setSubmittingId(null);
              }
            }} disabled={submittingId !== null}>{submittingId ? 'Forwarding…' : 'Forward'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HeadNotForwarded;
