import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { deleteDocument, getDocuments, getRevisions, updateDocument } from '@/services/api';
import { Document } from '@/types';
import DocumentViewToggle from '@/components/documents/DocumentViewToggle';
import { Button } from '@/components/ui/button';
import TrackDocumentDialog from '@/components/documents/TrackDocumentDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

const MyDocuments: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [editForm, setEditForm] = useState({ type: '', priority: '', notes: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [trackDialogOpen, setTrackDialogOpen] = useState(false);
  const [selectedTrackDocument, setSelectedTrackDocument] = useState<Document | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const fetchDocuments = async () => {
    if (!user) return;
    
    try {
      const [docs, revisions] = await Promise.all([
        getDocuments(user.User_Id, user.User_Role),
        getRevisions(),
      ]);

      const revisionByDocId = new Map(revisions.map((r) => [r.document_id, r.comment]));

      const merged = docs.map((d) =>
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

  const handleEdit = (doc: Document) => {
    setEditingDoc(doc);
    setEditForm({
      type: doc.Type,
      priority: doc.Priority,
      notes: '',
    });
    setSelectedFile(null);
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

  const handleDelete = async (id: number) => {
    try {
      setSubmitting(true);
      await deleteDocument(id);
      toast({ title: 'Document deleted.' });
      fetchDocuments();
    } catch (error) {
      toast({ title: 'Failed to delete document', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmit = async () => {
    if (!editingDoc) return;
    try {
      setSubmitting(true);
      let encoded: string | undefined;
      if (selectedFile) {
        encoded = await fileToBase64(selectedFile);
      }

      await updateDocument(editingDoc.Document_Id, {
        Status: 'Pending',
        Document: encoded,
        description: editForm.notes || editingDoc.description,
        Type: editForm.type,
        Priority: editForm.priority,
      });

      toast({ title: 'Document resubmitted for review.' });
      setEditingDoc(null);
      setSelectedFile(null);
      setEditForm({ type: '', priority: '', notes: '' });
      fetchDocuments();
    } catch (error) {
      toast({ title: 'Failed to resubmit document', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrack = (doc: Document) => {
    setSelectedTrackDocument(doc);
    setTrackDialogOpen(true);
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
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Documents</h1>
          <p className="mt-1 text-muted-foreground">
            View and manage your submitted documents.
          </p>
        </div>
        <Button onClick={() => navigate('/send-document')} className="gap-2">
          <Plus className="h-4 w-4" />
          New Document
        </Button>
      </div>

      {/* Documents View */}
      <DocumentViewToggle 
        documents={documents} 
        onEdit={handleEdit} 
        onDelete={handleDelete}
        onTrack={handleTrack} 
        showDescription 
        enablePagination 
        pageSizeOptions={[10,20,50]}
        defaultView="accordion"
      />

      {/* Edit Dialog */}
      <Dialog
        open={!!editingDoc}
        onOpenChange={(open) => {
          if (!open) {
            setEditingDoc(null);
            setSelectedFile(null);
            setEditForm({ type: '', priority: '', notes: '' });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revision Options</DialogTitle>
            <DialogDescription>
              Update your document, change its details, delete, or resubmit for review.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select
                value={editForm.type}
                onValueChange={(value) => setEditForm({ ...editForm, type: value })}
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

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={editForm.priority}
                onValueChange={(value) => setEditForm({ ...editForm, priority: value })}
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

            <div className="space-y-2">
              <Label>Upload new file (optional)</Label>
              <Input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg" onChange={handleFileChange} />
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Add notes for the reviewer"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button variant="destructive" onClick={() => editingDoc && handleDelete(editingDoc.Document_Id)} disabled={submitting}>
              Delete
            </Button>
            <div className="flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setEditingDoc(null)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleResubmit} disabled={submitting}>
                Resubmit
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TrackDocumentDialog open={trackDialogOpen} onOpenChange={setTrackDialogOpen} document={selectedTrackDocument} />
    </div>
  );
};

export default MyDocuments;
