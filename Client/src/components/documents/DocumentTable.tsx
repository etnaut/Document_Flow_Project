import React from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Eye, Download, ExternalLink } from 'lucide-react';

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
  showStatusFilter?: boolean;
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
  showStatusFilter = true,
}) => {
  const baseColumns = showDate ? 5 : 4; // type, sender, document, date?, status
  const columnsCount = baseColumns + (showPriority ? 1 : 0) + (showDescription ? 1 : 0) + (renderActions ? 1 : 0);

  const navigate = useNavigate();
  const [revisionDialogDoc, setRevisionDialogDoc] = React.useState<Document | null>(null);
  const [revisionComment, setRevisionComment] = React.useState('');

  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | string>('all');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(pageSizeOptions[0] ?? 5);

  const availableStatuses = React.useMemo(() => {
    const set = new Set<string>();
    (documents || []).forEach((d) => {
      const raw = String(d.Status || '').trim().toLowerCase();
      if (raw) set.add(raw);
    });
    return Array.from(set).sort();
  }, [documents]);

  const labelForStatus = (key: string) => {
    const k = key.trim().toLowerCase();
    if (k === 'revision') return 'Needs Revision';
    return k.split(' ').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
  };

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

  const handleAttachmentClick = (doc: Document) => {
    navigate(`/documents/view/${doc.Document_Id}`, { state: { doc } });
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

  React.useEffect(() => {
    if (statusFilter !== 'all' && !availableStatuses.includes(statusFilter.toLowerCase())) {
      setStatusFilter('all');
    }
  }, [availableStatuses, statusFilter]);

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
            {showStatusFilter && (
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {availableStatuses.map((s) => (
                    <SelectItem key={s} value={s}>{labelForStatus(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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

                    // Releaser: click to Release when approved
                    if (onRelease && statusLower === 'approved') {
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
        <div className="p-3 border-t grid grid-cols-3 items-center text-sm">
          <div className="justify-self-start">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
          <div className="justify-self-center text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="justify-self-end">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}

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
