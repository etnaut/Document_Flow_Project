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
import { Input } from '@/components/ui/input';
// Reuse existing Select imports declared above in this file
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DocumentTableProps {
  documents: Document[];
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onRevision?: (id: number, comment?: string) => void;
  onRelease?: (id: number) => void;
  onRecord?: (doc: Document) => void;
  onForward?: (doc: Document) => void;
  onView?: (doc: Document) => void;
  onEdit?: (doc: Document) => void;
  renderActions?: (doc: Document) => React.ReactNode;
  showPriority?: boolean;
  showDescription?: boolean;
  showDate?: boolean;
  descriptionLabel?: string;
  enablePagination?: boolean;
  pageSizeOptions?: number[];
}

const statusVariants: Record<string, 'pending' | 'approved' | 'revision' | 'released' | 'received' | 'default'> = {
  // Lowercase keys
  pending: 'pending',
  approved: 'approved',
  revision: 'revision',
  released: 'released',
  received: 'received',
  'not forwarded': 'default',
  forwarded: 'approved',
  recorded: 'approved',
  'not recorded': 'default',
  // Title-cased keys (for places indexing with original Status)
  Pending: 'pending',
  Approved: 'approved',
  Revision: 'revision',
  Released: 'released',
  Received: 'received',
  'Not Forwarded': 'default',
  Forwarded: 'approved',
  Recorded: 'approved',
  'Not Recorded': 'default',
};

const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  onApprove,
  onRevision,
  onRelease,
  onForward,
  onRecord,
  onEdit,
  renderActions,
  showPriority = true,
  showDescription = false,
  showDate = true,
  descriptionLabel = 'Comment',
  enablePagination = false,
  pageSizeOptions = [5, 10, 20],
}) => {
  const baseColumns = showDate ? 5 : 4; // type, sender, document, date?, status
  const columnsCount = baseColumns + (showPriority ? 1 : 0) + (showDescription ? 1 : 0) + (renderActions ? 1 : 0);

  const [fileDialogDoc, setFileDialogDoc] = React.useState<Document | null>(null);
  const [fileBytes, setFileBytes] = React.useState<Uint8Array | null>(null);
  const [mimeChoice, setMimeChoice] = React.useState<'pdf' | 'word' | 'excel' | 'auto'>('pdf');
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState<boolean>(false);
  const [previewError, setPreviewError] = React.useState<string | null>(null);
  const [revisionDialogDoc, setRevisionDialogDoc] = React.useState<Document | null>(null);
  const [revisionComment, setRevisionComment] = React.useState('');

  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | string>('all');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(pageSizeOptions[0] ?? 5);

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

  const normalized = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return (documents || []).filter((d) => {
      const statusOk = statusFilter === 'all' ? true : (d.Status || '').toLowerCase() === statusFilter.toLowerCase();
      if (!q) return statusOk;
      const hay = [d.Type, d.sender_name, d.description, d.Status].join(' ').toLowerCase();
      return statusOk && hay.includes(q);
    });
  }, [documents, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(normalized.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageSlice = enablePagination ? normalized.slice((currentPage - 1) * pageSize, (currentPage) * pageSize) : normalized;

  React.useEffect(() => {
    setPage(1);
  }, [query, statusFilter, pageSize, documents]);

  return (
    <div className="rounded-xl border bg-card shadow-card overflow-hidden">
      <div className="flex flex-col gap-3 p-3 border-b">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents..." className="w-[240px]" />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="revision">Revision</SelectItem>
                <SelectItem value="released">Released</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="forwarded">Forwarded</SelectItem>
                <SelectItem value="recorded">Recorded</SelectItem>
                <SelectItem value="not forwarded">Not Forwarded</SelectItem>
                <SelectItem value="not recorded">Not Recorded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {enablePagination && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Rows per page</span>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(parseInt(v))}>
                <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((n) => (<SelectItem key={n} value={String(n)}>{n}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Type</TableHead>
            <TableHead>Sender</TableHead>
            {showPriority && <TableHead>Priority</TableHead>}
            <TableHead>Document</TableHead>
            {showDate && <TableHead>Date</TableHead>}
            {showDescription && <TableHead>{descriptionLabel}</TableHead>}
            <TableHead>Status</TableHead>
            {renderActions && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageSlice.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columnsCount} className="h-24 text-center text-black/80">
                No documents found.
              </TableCell>
            </TableRow>
          ) : (
            pageSlice.map((doc) => (
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
                      className="px-0 text-xs text-black hover:underline"
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
                {showDate && <TableCell>{doc.created_at}</TableCell>}
                {showDescription && (
                  <TableCell className="max-w-[240px] truncate" title={doc.description || ''}>
                    {doc.description || '—'}
                  </TableCell>
                )}
                <TableCell>
                  {(() => {
                    const statusLower = doc.Status?.toLowerCase();
                    const statusLabel = statusLower === 'revision' ? 'Needs Revision' : doc.Status;

                    // Recorder: click to mark as Recorded
                    if (onRecord && statusLower === 'not recorded') {
                      return (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-0 text-info hover:text-info"
                          onClick={() => onRecord(doc)}
                        >
                          <Badge variant={statusVariants[doc.Status] || 'default'} className="cursor-pointer">
                            {statusLabel}
                          </Badge>
                        </Button>
                      );
                    }

                    // Employee-side: clickable status when edit handler provided and no approve/revision controls
                    if (onEdit && !onApprove && !onRevision && statusLower !== 'approved' && statusLower !== 'pending') {
                      return (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-0"
                          onClick={() => onEdit(doc)}
                        >
                          <Badge variant={statusVariants[statusLower || ''] || 'default'} className="cursor-pointer">
                            {statusLabel}
                          </Badge>
                        </Button>
                      );
                    }

                    // Releaser: click to Release when approved or not released
                    if (onRelease && (statusLower === 'approved' || statusLower === 'not released')) {
                      return (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-0 text-info hover:text-info"
                          onClick={() => onRelease(doc.Document_Id)}
                        >
                          <Badge variant={statusVariants[doc.Status] || 'default'} className="cursor-pointer">
                            {statusLabel}
                          </Badge>
                        </Button>
                      );
                    }

                    // Head/Admin forwarding: allow forwarding when status is Not Forwarded
                    if (onForward && statusLower === 'not forwarded') {
                      return (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-0 text-info hover:text-info"
                          onClick={() => onForward(doc)}
                        >
                          <Badge variant={statusVariants[doc.Status] || 'default'} className="cursor-pointer">
                            {statusLabel}
                          </Badge>
                        </Button>
                      );
                    }

                    // Approver-side: allow actions only when pending (matches Pending table behavior)
                    if ((onApprove || onRevision) && statusLower === 'pending') {
                      return (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="px-0">
                              <Badge variant={statusVariants[statusLower || ''] || 'default'} className="cursor-pointer">
                                {statusLabel}
                              </Badge>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            {onApprove && (
                              <DropdownMenuItem onSelect={() => onApprove(doc.Document_Id)}>
                                Approve
                              </DropdownMenuItem>
                            )}
                            {onRevision && (
                              <DropdownMenuItem
                                onSelect={() => {
                                  setRevisionDialogDoc(doc);
                                  setRevisionComment('');
                                }}
                              >
                                Send for Revision
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      );
                    }

                    return (
                      <Badge variant={statusVariants[statusLower || ''] || 'default'}>{statusLabel}</Badge>
                    );
                  })()}
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
      {enablePagination && (
        <div className="p-3 border-t flex items-center justify-between text-sm">
          <span className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</span>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }} />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

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
        <DialogContent className="sm:max-w-[85vw] md:max-w-[80vw] lg:max-w-[70vw]">
          <DialogHeader>
            <DialogTitle className="text-white">Open Attachment</DialogTitle>
            <DialogDescription>
              {mimeChoice === 'auto'
                ? 'We will try to auto-detect the best viewer from the original file.'
                : `Recommended: ${mimeChoice.toUpperCase()} based on the original file.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-md border bg-muted/30 p-2">
              {previewLoading ? (
                <div className="flex h-[65vh] items-center justify-center text-sm text-muted-foreground">
                  Generating PDF preview...
                </div>
              ) : previewUrl ? (
                <iframe
                  title="Attachment preview"
                  src={previewUrl}
                  className="h-[65vh] w-full rounded-sm border bg-background"
                />
              ) : (
                <div className="flex h-[65vh] items-center justify-center text-sm text-muted-foreground text-center px-4">
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
                <span className="text-sm text-white">View as:</span>
                <Select value={mimeChoice} onValueChange={(v) => setMimeChoice(v as any)}>
                  <SelectTrigger className="w-[180px] text-white">
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
            <Button variant="outline" className="text-white border-white hover:text-white hover:bg-white/10" onClick={() => setFileDialogDoc(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revision comment dialog */}
      <Dialog
        open={!!revisionDialogDoc}
        onOpenChange={(open) => {
          if (!open) {
            setRevisionDialogDoc(null);
            setRevisionComment('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-primary">Send for Revision</DialogTitle>
            <DialogDescription>
              Optionally add a note for the sender before marking this document for revision.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <p className="text-sm font-medium text-primary">Document</p>
              <p className="text-sm text-muted-foreground">{revisionDialogDoc?.Type} — {revisionDialogDoc?.sender_name}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-primary">Comment (optional)</p>
              <textarea
                className="w-full rounded-md border bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                rows={3}
                value={revisionComment}
                onChange={(e) => setRevisionComment(e.target.value)}
                placeholder="Add a note for the sender (optional)"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="text-primary border-primary hover:text-primary hover:bg-primary/10" onClick={() => { setRevisionDialogDoc(null); setRevisionComment(''); }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (revisionDialogDoc && onRevision) {
                  onRevision(revisionDialogDoc.Document_Id, revisionComment.trim() || undefined);
                }
                setRevisionDialogDoc(null);
                setRevisionComment('');
              }}
            >
              Send for Revision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentTable;
