<<<<<<< HEAD
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Document } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Calendar,
  Building2,
  User,
  MessageSquare,
  Tag,
  Paperclip,
  Clock,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
=======
﻿import React from 'react';
import DocumentTable from './DocumentTable';
import { Document } from '@/types';
>>>>>>> 14358356059b01645918b43587691d6bc6cf2e43

interface DocumentAccordionProps {
  documents: Document[];
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onRevision?: (id: number, comment?: string) => void;
  onRelease?: (id: number) => void;
  onRecord?: (doc: Document) => void;
<<<<<<< HEAD
  onForward?: (doc: Document) => void;
=======
  onForward?: (doc: Document, includeNotes?: boolean) => void;
>>>>>>> 14358356059b01645918b43587691d6bc6cf2e43
  onView?: (doc: Document) => void;
  onEdit?: (doc: Document) => void;
  onDelete?: (id: number) => void;
  onTrack?: (doc: Document) => void;
  renderActions?: (doc: Document) => React.ReactNode;
  showPriority?: boolean;
  showDescription?: boolean;
  showDate?: boolean;
  descriptionLabel?: string;
  enablePagination?: boolean;
  pageSizeOptions?: number[];
  showStatusFilter?: boolean;
}

<<<<<<< HEAD
const statusVariants: Record<string, 'pending' | 'approved' | 'revision' | 'released' | 'received' | 'default'> = {
  pending: 'pending',
  approved: 'approved',
  revision: 'revision',
  released: 'released',
  received: 'received',
  'not forwarded': 'default',
  forwarded: 'approved',
  recorded: 'approved',
  'not recorded': 'default',
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

const getStatusBadgeVariant = (status: string): 'pending' | 'approved' | 'revision' | 'released' | 'received' | 'default' => {
  const statusLower = (status || '').toLowerCase();
  return statusVariants[statusLower] || statusVariants[status] || 'default';
};

const getDirectionBadge = (doc: Document): { label: string; variant: 'default' | 'secondary' } => {
  // Determine if incoming or outgoing based on document flow
  if (doc.is_forwarded_request || doc.forwarded_from) {
    return { label: 'Incoming', variant: 'default' };
  }
  return { label: 'Outgoing', variant: 'secondary' };
};

const DocumentAccordion: React.FC<DocumentAccordionProps> = ({
  documents,
  onApprove,
  onRevision,
  onRelease,
  onForward,
  onRecord,
  onEdit,
  onDelete,
  onTrack,
  renderActions,
  showPriority = true,
  showDescription = true,
  showDate = true,
  descriptionLabel = 'Description',
  enablePagination = true,
  pageSizeOptions = [10, 20, 50],
  showStatusFilter = true,
}) => {
  const navigate = useNavigate();
  const [revisionDialogDoc, setRevisionDialogDoc] = React.useState<Document | null>(null);
  const [revisionComment, setRevisionComment] = React.useState('');
  const [deleteDialogDoc, setDeleteDialogDoc] = React.useState<Document | null>(null);
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | string>('all');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(pageSizeOptions[0] ?? 10);

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

  const handleAttachmentClick = (doc: Document) => {
    navigate(`/documents/view/${doc.Document_Id}`, { state: { doc } });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateString;
    }
  };

  const generateDocumentId = (doc: Document): string => {
    // Generate a document ID like "ITSD-2025-211644"
    const year = new Date(doc.created_at || Date.now()).getFullYear();
    const id = doc.Document_Id.toString().padStart(6, '0');
    // Use department abbreviation or default to DOC
    const deptAbbr = doc.sender_department
      ? doc.sender_department
          .split(' ')
          .map((word) => word[0])
          .join('')
          .substring(0, 4)
          .toUpperCase()
      : 'DOC';
    return `${deptAbbr}-${year}-${id}`;
  };

  const handleDelete = () => {
    if (deleteDialogDoc && onDelete) {
      onDelete(deleteDialogDoc.Document_Id);
      setDeleteDialogDoc(null);
      toast({
        title: 'Document deleted',
        description: 'The document has been deleted successfully.',
      });
    }
  };

  // Generate pagination items
  const getPaginationItems = () => {
    const items: React.ReactNode[] = [];
    const maxVisible = 7;
    
    if (totalPages <= maxVisible) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setPage(i);
              }}
              isActive={i === currentPage}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      // Show first page
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setPage(1);
            }}
            isActive={1 === currentPage}
          >
            1
          </PaginationLink>
        </PaginationItem>
      );

      // Show ellipsis if needed
      if (currentPage > 3) {
        items.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          items.push(
            <PaginationItem key={i}>
              <PaginationLink
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage(i);
                }}
                isActive={i === currentPage}
              >
                {i}
              </PaginationLink>
            </PaginationItem>
          );
        }
      }

      // Show ellipsis if needed
      if (currentPage < totalPages - 2) {
        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Show last page
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setPage(totalPages);
            }}
            isActive={totalPages === currentPage}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  return (
    <div className="rounded-xl border bg-card shadow-card overflow-hidden">
      <div className="flex flex-col gap-3 p-3 border-b">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-[240px]"
            />
            {showStatusFilter && (
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {availableStatuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {labelForStatus(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {enablePagination && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Rows per page</span>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(parseInt(v))}>
                <SelectTrigger className="w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {pageSlice.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground">
          No documents found.
        </div>
      ) : (
        <Accordion type="single" collapsible className="w-full">
          {pageSlice.map((doc) => {
            const directionBadge = getDirectionBadge(doc);
            const statusVariant = getStatusBadgeVariant(doc.Status || '');
            const docId = generateDocumentId(doc);
            const hasAttachment = !!doc.Document;

            return (
              <AccordionItem key={doc.Document_Id} value={`item-${doc.Document_Id}`} className="border-b">
                <AccordionTrigger className="px-4 py-3 hover:no-underline group">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-base truncate">
                            {docId} {doc.Type}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge 
                        variant={directionBadge.variant === 'default' ? 'success' : 'secondary'} 
                        className="text-xs bg-green-100 text-green-800 border-green-200"
                      >
                        {directionBadge.label}
                      </Badge>
                      <Badge variant={statusVariant} className="text-xs">
                        {doc.Status === 'Revision' ? 'Needs Revision' : doc.Status}
                      </Badge>
                      {showPriority && doc.Priority && doc.Priority === 'High' && (
                        <Badge variant="destructive" className="text-xs">
                          {doc.Priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4 pt-2 pl-4 border-l-2 border-muted">
                    {/* Description */}
                    {showDescription && doc.description && (
                      <div className="text-sm text-foreground">
                        {doc.description}
                      </div>
                    )}

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-foreground">
                      {showDate && doc.created_at && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">{formatDate(doc.created_at)}</span>
                        </div>
                      )}

                      {doc.sender_department && (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">{doc.sender_department}</span>
                        </div>
                      )}

                      {doc.sender_name && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">{doc.sender_name}</span>
                        </div>
                      )}

                      {doc.Type && (
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">Kind: {doc.Type}</span>
                          {doc.Priority === 'High' && (
                            <Badge variant="info" className="ml-2 text-xs bg-blue-100 text-blue-800 border-blue-200">Urgent</Badge>
                          )}
                        </div>
                      )}

                      {hasAttachment && (
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                          <Button
                            variant="link"
                            className="px-0 h-auto text-xs text-primary hover:underline"
                            onClick={() => handleAttachmentClick(doc)}
                          >
                            {hasAttachment ? '1 attachment' : 'No attachments'}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Assigned To / Target Department */}
                    {(doc.target_department || doc.sender_name) && (
                      <div className="flex items-start gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground">Assigned to:</span>
                          <div className="flex flex-wrap gap-1">
                            {doc.target_department && (
                              <Badge variant="info" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                                {doc.target_department}
                              </Badge>
                            )}
                            {doc.sender_name && !doc.target_department && (
                              <Badge variant="info" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                                {doc.sender_name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Priority and Follow-up */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {showPriority && doc.Priority && doc.Priority !== 'High' && (
                        <Badge
                          variant={
                            doc.Priority === 'Medium'
                              ? 'warning'
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {doc.Priority}
                        </Badge>
                      )}
                      {doc.Status === 'Approved' && (
                        <Badge variant="success" className="text-xs bg-green-100 text-green-800 border-green-200">
                          Follow-up: Completed
                        </Badge>
                      )}
                    </div>

                    {/* Audit Trail */}
                    <div className="flex flex-col gap-1.5 pt-2 border-t text-xs text-muted-foreground">
                      {doc.created_at && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>Created: {formatDateTime(doc.created_at)}</span>
                        </div>
                      )}
                      {doc.created_at && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>Updated: {formatDateTime(doc.created_at)}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => onEdit(doc)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-destructive hover:text-destructive"
                          onClick={() => setDeleteDialogDoc(doc)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      )}
                      {renderActions && renderActions(doc)}
                      {onTrack && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => onTrack(doc)}
                        >
                          Track
                        </Button>
                      )}
                      {onForward && (doc.Status === 'Not Forwarded' || doc.Status === 'not forwarded') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => onForward(doc)}
                        >
                          Forward
                        </Button>
                      )}
                      {onApprove && doc.Status === 'Pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => onApprove(doc.Document_Id)}
                        >
                          Approve
                        </Button>
                      )}
                      {onRevision && doc.Status === 'Pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            setRevisionDialogDoc(doc);
                            setRevisionComment('');
                          }}
                        >
                          Send for Revision
                        </Button>
                      )}
                      {onRelease && (doc.Status === 'Approved' || doc.Status === 'not released') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => onRelease(doc.Document_Id)}
                        >
                          Release
                        </Button>
                      )}
                      {onRecord && doc.Status === 'Not Recorded' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => onRecord(doc)}
                        >
                          Record
                        </Button>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Pagination */}
      {enablePagination && totalPages > 1 && (
        <div className="p-3 border-t">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.max(1, p - 1));
                  }}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
              {getPaginationItems()}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.min(totalPages, p + 1));
                  }}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Revision Dialog */}
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
              <p className="text-sm text-muted-foreground">
                {revisionDialogDoc?.Type} — {revisionDialogDoc?.sender_name}
              </p>
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
            <Button
              variant="outline"
              className="text-primary border-primary hover:text-primary hover:bg-primary/10"
              onClick={() => {
                setRevisionDialogDoc(null);
                setRevisionComment('');
              }}
            >
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteDialogDoc}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialogDoc(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">{deleteDialogDoc?.Type}</span> — {deleteDialogDoc?.sender_name}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogDoc(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
=======
// Accordion feature removed  render the table view as a fallback
const DocumentAccordion: React.FC<DocumentAccordionProps> = ({ documents, ...props }) => {
  return <DocumentTable documents={documents} {...props} />;
>>>>>>> 14358356059b01645918b43587691d6bc6cf2e43
};

export default DocumentAccordion;
