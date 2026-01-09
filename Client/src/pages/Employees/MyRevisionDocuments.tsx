import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { deleteDocument, getDocumentsByStatus, getRevisions, updateDocument } from '@/services/api';
import { Document } from '@/types';
import DocumentTable from '@/components/documents/DocumentTable';
import { RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

const documentTypes = [
  'Leave Request',
  'Travel Authorization',
  'Budget Proposal',
  'Equipment Request',
  'Memo',
  'Report',
  'Other',
];

const priorities = ['Low', 'Medium', 'High'];

const MyRevisionDocuments: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogDoc, setDialogDoc] = useState<Document | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editForm, setEditForm] = useState({ type: '', priority: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const fetchDocuments = async () => {
    if (!user) return;
    try {
      const [docs, revisions] = await Promise.all([
        getDocumentsByStatus('Revision', undefined, user.User_Role),
        getRevisions(),
      ]);

      const revisionByDocId = new Map(revisions.map((r) => [r.document_id, r.comment]));

      const merged = docs
        .filter((d) => d.User_Id === user.User_Id)
        .map((d) =>
          d.Status === 'Revision'
            ? { ...d, description: revisionByDocId.get(d.Document_Id) ?? d.description }
            : d
        );

      setDocuments(merged);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleDelete = async () => {
    if (!dialogDoc) return;
    try {
      setSubmitting(true);
      await deleteDocument(dialogDoc.Document_Id);
      toast({ title: 'Document deleted.' });
      setDialogDoc(null);
      setSelectedFile(null);
      setEditForm({ type: '', priority: '', notes: '' });
      fetchDocuments();
    } catch (error) {
      console.error('Delete failed', error);
      toast({ title: 'Failed to delete document', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmit = async () => {
    if (!dialogDoc || !user) return;
    try {
      setSubmitting(true);
      let encoded: string | undefined;
      if (selectedFile) {
        encoded = await fileToBase64(selectedFile);
      }

      await updateDocument(dialogDoc.Document_Id, {
        Status: 'Pending',
        Document: encoded,
        description: editForm.notes || dialogDoc.description,
        Type: editForm.type || dialogDoc.Type,
        Priority: editForm.priority || dialogDoc.Priority,
      });

      toast({ title: 'Document resubmitted for review.' });
      setDialogDoc(null);
      setSelectedFile(null);
      setEditForm({ type: '', priority: '', notes: '' });
      fetchDocuments();
    } catch (error) {
      console.error('Resubmit failed', error);
      toast({ title: 'Failed to resubmit document', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-info/10">
            <RotateCcw className="h-6 w-6 text-info" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Need Revisions</h1>
            <p className="text-muted-foreground">Documents returned for your revision.</p>
          </div>
        </div>
      </div>

      <DocumentTable
        documents={documents}
        onEdit={(doc) => {
          setDialogDoc(doc);
          setSelectedFile(null);
          setEditForm({ type: doc.Type, priority: doc.Priority, notes: '' });
        }}
        showDescription
        showStatusFilter={false}
        enablePagination
        pageSizeOptions={[10,20,50]}
      />

      <Dialog
        open={!!dialogDoc}
        onOpenChange={(open) => {
          if (!open) {
            setDialogDoc(null);
            setSelectedFile(null);
            setEditForm({ type: '', priority: '', notes: '' });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className='text-primary'>Revision Options</DialogTitle>
            <DialogDescription>
              Choose to delete this document or resubmit with an updated file.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2 text-primary">
              <Label>Document Type</Label>
              <Select
                value={editForm.type}
                onValueChange={(value) => setEditForm((prev) => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 text-primary">
              <Label>Priority</Label>
              <Select
                value={editForm.priority}
                onValueChange={(value) => setEditForm((prev) => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 text-primary">
              <p className="text-sm font-medium">Upload new file (optional)</p>
              <Input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg" onChange={handleFileChange} />
            </div>

            <div className="space-y-2 text-primary">
              <p className="text-sm font-medium">Notes (optional)</p>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Add notes for the reviewer"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              Delete
            </Button>
            <div className="flex gap-2 sm:justify-end">
              <Button
                className='text-primary'
                variant="outline"
                onClick={() => {
                  setDialogDoc(null);
                  setSelectedFile(null);
                  setEditForm({ type: '', priority: '', notes: '' });
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleResubmit} disabled={submitting}>
                Resubmit
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyRevisionDocuments;
