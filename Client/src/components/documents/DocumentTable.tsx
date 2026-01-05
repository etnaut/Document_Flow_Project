import React from 'react';
import { Document } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/services/api';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DocumentTableProps {
  documents: Document[];
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onRevision?: (id: number) => void;
  onRelease?: (id: number) => void;
  onForward?: (doc: Document) => void;
  onView?: (doc: Document) => void;
  onEdit?: (doc: Document) => void;
  renderActions?: (doc: Document) => React.ReactNode;
  showPriority?: boolean;
  showDescription?: boolean;
}

const statusVariants: Record<string, 'pending' | 'approved' | 'revision' | 'released' | 'default'> = {
  Pending: 'pending',
  Approved: 'approved',
  Revision: 'revision',
  Released: 'released',
  Received: 'default',
};

const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  onEdit,
  renderActions,
  showPriority = true,
  showDescription = false,
}) => {
  const baseColumns = 5; // type, sender, document, date, status
  const columnsCount = baseColumns + (showPriority ? 1 : 0) + (showDescription ? 1 : 0) + (renderActions ? 1 : 0);

  const [fileDialogDoc, setFileDialogDoc] = React.useState<Document | null>(null);
  const [fileBytes, setFileBytes] = React.useState<Uint8Array | null>(null);
  const [mimeChoice, setMimeChoice] = React.useState<'pdf' | 'word' | 'excel' | 'auto'>('pdf');
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState<boolean>(false);
  const [previewError, setPreviewError] = React.useState<string | null>(null);

  const mimeFromChoice = (choice: 'pdf' | 'word' | 'excel' | 'auto') => {
    switch (choice) {
      case 'pdf':
        return 'application/pdf';
      case 'word':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'excel':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      default:
        return 'application/octet-stream';
    }
  };

  const decodePayload = (payload: any): Uint8Array | null => {
    if (!payload) return null;
    try {
      if (typeof payload === 'string') {
        const binary = atob(payload);
        const len = binary.length;
        const arr = new Uint8Array(len);
        for (let i = 0; i < len; i++) arr[i] = binary.charCodeAt(i);
        return arr;
      }
      if (payload?.data) {
        return new Uint8Array(payload.data);
      }
      return null;
    } catch {
      return null;
    }
  };

  const detectMimeChoice = (bytes: Uint8Array): 'pdf' | 'word' | 'excel' | 'auto' => {
    // PDF magic %PDF
    if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      return 'pdf';
    }
    // ZIP-based office formats start with PK\x03\x04
    if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
      // scan a small window for folder markers
      const sample = new TextDecoder().decode(bytes.slice(0, Math.min(bytes.length, 4096)));
      if (sample.includes('xl/')) return 'excel';
      if (sample.includes('word/')) return 'word';
      return 'word';
    }
    return 'auto';
  };

  const revokePreviewUrl = (url?: string | null) => {
    if (url) URL.revokeObjectURL(url);
  };

  React.useEffect(() => {
    return () => {
      revokePreviewUrl(previewUrl);
    };
  }, [previewUrl]);

  // Re-run preview when user switches to PDF view
  React.useEffect(() => {
    const run = async () => {
      if (!fileDialogDoc || !fileBytes) return;
      setPreviewError(null);

      if (mimeChoice !== 'pdf') {
        revokePreviewUrl(previewUrl);
        setPreviewUrl(null);
        return;
      }

      const detected = detectMimeChoice(fileBytes);
      if (detected === 'pdf') {
        buildPdfPreview(fileBytes);
        return;
      }

      await fetchPreviewPdf(fileDialogDoc.Document_Id);
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mimeChoice]);

  const buildPdfPreview = (bytes: Uint8Array) => {
    revokePreviewUrl(previewUrl);
    const buffer = bytes.buffer instanceof ArrayBuffer ? bytes.buffer : new Uint8Array(bytes).buffer;
    const blob = new Blob([buffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    setPreviewError(null);
  };

  const fetchPreviewPdf = async (docId: number) => {
    try {
      setPreviewLoading(true);
      revokePreviewUrl(previewUrl);
      const resp = await fetch(`${API_BASE_URL}/documents/${docId}/preview`);
      if (!resp.ok) {
        throw new Error(`Preview failed: ${resp.status}`);
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewError(null);
    } catch (error) {
      console.error('Preview fetch error', error);
      setPreviewUrl(null);
      setPreviewError('Unable to generate a PDF preview for this file. You can still open/download it.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const openDocument = () => {
    if (!fileDialogDoc) return;
    if (!fileBytes) {
      toast({ title: 'Unable to read attachment', variant: 'destructive' });
      return;
    }

    try {
      // If user selected PDF and we have a converted preview, open that to avoid downloading the original format
      if (mimeChoice === 'pdf' && previewUrl) {
        window.open(previewUrl, '_blank');
        return;
      }

      const buffer = fileBytes.buffer instanceof ArrayBuffer ? fileBytes.buffer : new Uint8Array(fileBytes).buffer;
      const mime = mimeFromChoice(mimeChoice);
      const blob = new Blob([buffer], { type: mime });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (error) {
      console.error('Open document error', error);
      toast({ title: 'Failed to open attachment', variant: 'destructive' });
    }
  };

  const handleAttachmentClick = async (doc: Document) => {
    const bytes = decodePayload((doc as any).Document);
    if (!bytes) {
      toast({ title: 'Unable to read attachment', variant: 'destructive' });
      return;
    }

    const detected = detectMimeChoice(bytes);

    setFileBytes(bytes);
    setMimeChoice(detected);
    setFileDialogDoc(doc);

    if (detected === 'pdf') {
      buildPdfPreview(bytes);
      return;
    }

    if (mimeChoice === 'pdf') {
      await fetchPreviewPdf(doc.Document_Id);
    } else {
      setPreviewUrl(null);
    }
  };

  return (
    <div className="rounded-xl border bg-card shadow-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Type</TableHead>
            <TableHead className="font-semibold">Sender</TableHead>
            <TableHead className="font-semibold">Priority</TableHead>
            <TableHead className="font-semibold">Document</TableHead>
            <TableHead className="font-semibold">Date</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            {renderActions && <TableHead className="font-semibold">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columnsCount} className="h-24 text-center text-muted-foreground">
                No documents found.
              </TableCell>
            </TableRow>
          ) : (
            documents.map((doc) => (
              <TableRow key={doc.Document_Id} className="animate-fade-in">
                <TableCell>{doc.Type}</TableCell>
                <TableCell>{doc.sender_name}</TableCell>
                {showPriority && (
                  <TableCell>
                    <Badge
                      variant={
                        doc.Priority === 'High'
                          ? 'destructive'
                          : doc.Priority === 'Medium'
                          ? 'warning'
                          : 'secondary'
                      }
                    >
                      {doc.Priority}
                    </Badge>
                  </TableCell>
                )}
                <TableCell>
                  {doc.Document ? (
                    <Button
                      variant="link"
                      className="px-0 text-xs"
                      onClick={() => {
                        void handleAttachmentClick(doc);
                      }}
                    >
                      Attached
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{doc.created_at}</TableCell>
                {showDescription && (
                  <TableCell className="max-w-[240px] truncate text-muted-foreground" title={doc.description || ''}>
                    {doc.description || '—'}
                  </TableCell>
                )}
                <TableCell>
                  {doc.Status === 'Revision' && onEdit ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-0 text-info hover:text-info"
                      onClick={() => onEdit(doc)}
                    >
                      <Badge variant={statusVariants[doc.Status] || 'default'} className="cursor-pointer">
                        {doc.Status}
                      </Badge>
                    </Button>
                  ) : (
                    <Badge variant={statusVariants[doc.Status] || 'default'}>{doc.Status}</Badge>
                  )}
                </TableCell>
                {renderActions && (
                  <TableCell className="space-x-2 whitespace-nowrap">
                    {renderActions(doc)}
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog
        open={!!fileDialogDoc}
        onOpenChange={(open) => {
          if (!open) {
            setFileDialogDoc(null);
            setFileBytes(null);
            setMimeChoice('pdf');
            revokePreviewUrl(previewUrl);
            setPreviewUrl(null);
            setPreviewLoading(false);
            setPreviewError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open Attachment</DialogTitle>
            <DialogDescription>
              {mimeChoice === 'auto'
                ? 'We will try to auto-detect the best viewer from the original file.'
                : `Recommended: ${mimeChoice.toUpperCase()} based on the original file.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-md border bg-muted/30 p-2">
              {previewLoading ? (
                <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                  Generating PDF preview...
                </div>
              ) : previewUrl ? (
                <iframe
                  title="Attachment preview"
                  src={previewUrl}
                  className="h-[420px] w-full rounded-sm border bg-background"
                />
              ) : (
                <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground text-center px-4">
                  {previewError
                    ? previewError
                    : 'Preview is generated as PDF. If this is a Word or Excel file, we convert it to PDF for preview only.'}
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Preview uses a PDF rendition; choosing Word or Excel will still open/download the original format in a new tab.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">View as:</span>
                <Select value={mimeChoice} onValueChange={(v) => setMimeChoice(v as any)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Choose format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="word">Word</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="auto">Auto (use detected)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => { openDocument(); }} disabled={!fileBytes}>
                Download
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFileDialogDoc(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentTable;
