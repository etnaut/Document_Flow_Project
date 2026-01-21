import React, { useState } from 'react';
import { Document } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageSquare } from 'lucide-react';

interface RespondDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document | null;
  onRespond: (releaseDocId: number, status: 'actioned' | 'not actioned', comment: string, documentBase64?: string, filename?: string, mimetype?: string) => Promise<void>;
}

const RespondDocumentDialog: React.FC<RespondDocumentDialogProps> = ({
  open,
  onOpenChange,
  document,
  onRespond,
}) => {
  const [status, setStatus] = useState<'actioned' | 'not actioned'>('not actioned');
  const [comment, setComment] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const parts = result.split(',');
      resolve(parts[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document || (!comment.trim() && !file)) return;

    const releaseDocId = (document as any).record_doc_id;
    if (!releaseDocId) {
      console.error('No release_doc_id found in document');
      return;
    }

    setIsSubmitting(true);
    try {
      let fileBase64: string | undefined;
      let filename: string | undefined;
      let mimetype: string | undefined;

      if (file) {
        fileBase64 = await toBase64(file);
        filename = file.name;
        mimetype = file.type || 'application/octet-stream';
      }

      await onRespond(releaseDocId, status, comment.trim(), fileBase64, filename, mimetype);
      setComment('');
      setFile(null);
      setStatus('not actioned');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error responding to document:', error);
      // Error is already shown in toast by handleRespond
      // Don't close dialog on error so user can retry
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Respond to Document
          </DialogTitle>
          <DialogDescription>
            Send a response back to {document?.forwarded_from || document?.sender_department} department.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2 rounded-lg bg-muted p-4 text-sm">
              <div className="flex items-start gap-2">
                <strong className="min-w-[100px]">Document:</strong>
                <span>{document?.Type || 'N/A'}</span>
              </div>
              <div className="flex items-start gap-2">
                <strong className="min-w-[100px]">Department:</strong>
                <span>{document?.sender_department || document?.target_department || 'N/A'}</span>
              </div>
              <div className="flex items-start gap-2">
                <strong className="min-w-[100px]">Division:</strong>
                <span>{document?.forwarded_from || 'N/A'}</span>
              </div>
              <div className="flex items-start gap-2">
                <strong className="min-w-[100px]">Sender:</strong>
                <span>{document?.sender_name || 'N/A'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value: 'actioned' | 'not actioned') => setStatus(value)}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="actioned">Actioned</SelectItem>
                  <SelectItem value="not actioned">Not Actioned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="comment">Comment</Label>
              <Textarea
                id="comment"
                placeholder="Enter your comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                required={!file}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responseFile">Attach file (optional)</Label>
              <input
                id="responseFile"
                type="file"
                onChange={(e) => setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                className="text-sm"
              />
              {file && <div className="text-sm text-muted-foreground">Selected: {file.name}</div>}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || (!comment.trim() && !file)}>
              {isSubmitting ? 'Saving...' : 'Save Response'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RespondDocumentDialog;
