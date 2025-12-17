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
import { MessageSquare } from 'lucide-react';

interface RespondDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document | null;
  onRespond: (documentId: number, message: string) => Promise<void>;
}

const RespondDocumentDialog: React.FC<RespondDocumentDialogProps> = ({
  open,
  onOpenChange,
  document,
  onRespond,
}) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document || !message.trim()) return;

    setIsSubmitting(true);
    try {
      await onRespond(document.Document_Id, message);
      setMessage('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error responding to document:', error);
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
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p><strong>Document:</strong> {document?.Type}</p>
              <p><strong>From:</strong> {document?.forwarded_from || document?.sender_department}</p>
              {document?.comments && (
                <p><strong>Notes:</strong> {document.comments}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Response Message</Label>
              <Textarea
                id="message"
                placeholder="Enter your response message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                required
              />
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
            <Button type="submit" disabled={isSubmitting || !message.trim()}>
              {isSubmitting ? 'Sending...' : 'Send Response'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RespondDocumentDialog;
