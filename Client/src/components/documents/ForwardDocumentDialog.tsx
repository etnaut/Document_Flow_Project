import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getDepartments } from '@/services/api';
import { Document } from '@/types';
import { Send } from 'lucide-react';

interface ForwardDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document | null;
  currentDepartment: string;
  onForward: (documentId: number, targetDepartment: string, notes: string) => void;
  showNotes?: boolean; // when false, hide notes field
}

const ForwardDocumentDialog: React.FC<ForwardDocumentDialogProps> = ({
  open,
  onOpenChange,
  document,
  currentDepartment,
  onForward,
  showNotes = true,
}) => {
  const [departments, setDepartments] = useState<string[]>([]);
  const [targetDepartment, setTargetDepartment] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDepartments = async () => {
      const depts = await getDepartments();
      // Exclude current department from options
      setDepartments(depts.filter((d) => d !== currentDepartment));
    };
    fetchDepartments();
  }, [currentDepartment]);

  const handleSubmit = async () => {
    if (!document || !targetDepartment) return;
    setLoading(true);
    try {
      // If notes are hidden, send empty notes
      await onForward(document.Document_Id, targetDepartment, showNotes ? notes : '');
      setTargetDepartment('');
      setNotes('');
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Forward Document to Another Department
          </DialogTitle>
          <DialogDescription>
            Send this approved document to another department's admin for processing.
          </DialogDescription>
        </DialogHeader>

        {document && (
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm font-medium">Document: #{document.Document_Id}</p>
              <p className="text-sm text-muted-foreground">{document.Type}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Send To Department</Label>
              <Select value={targetDepartment} onValueChange={setTargetDepartment}>
                <SelectTrigger id="department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showNotes && (
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes for the receiving department..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!targetDepartment || loading}>
            {loading ? 'Sending...' : 'Forward Document'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ForwardDocumentDialog;
