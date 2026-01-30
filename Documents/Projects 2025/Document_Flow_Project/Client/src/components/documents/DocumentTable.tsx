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
import { DataTableFilters } from '@/components/ui/data-table-filters';
// Reuse existing Select imports declared above in this file
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import {
  CheckCircle2,
  ExternalLink,
  Forward,
  Pencil,
  RotateCcw,
  Search,
  Send,
  Paperclip,
  Eye,
  Download,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface DocumentTableProps {
  documents: Document[];
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onRevision?: (id: number, comment?: string) => void;
  onRelease?: (id: number) => void;
  onRecord?: (doc: Document) => void;
  onForward?: (doc: Document, includeNotes?: boolean) => void; // second arg indicates whether to show comment field
  onView?: (doc: Document) => void;
  onEdit?: (doc: Document) => void;
  onTrack?: (doc: Document) => void;
  renderActions?: (doc: Document) => React.ReactNode;
  showPriority?: boolean;
  showDescription?: boolean;
  showDate?: boolean;
  descriptionLabel?: string;
  enablePagination?: boolean;
  pageSizeOptions?: number[];
  showStatusFilter?: boolean;
  // Optional function to render a suffix for the Priority column
  prioritySuffix?: (doc: Document) => string | undefined;
  // Optional handler to mark a release record as done (used by ReceivedRequests)
  onMarkRelease?: (recordDocId: number, mark?: 'done' | 'not_done') => Promise<void> | void;
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
  onTrack,
  renderActions,
  showPriority = true,
  showDescription = false,
  showDate = true,
  descriptionLabel = 'Comment',
  enablePagination = false,
  pageSizeOptions = [5, 10, 20],
  showStatusFilter = true,
  prioritySuffix,
  onMarkRelease,
}) => {
  const baseColumns = showDate ? 6 : 5; // id, type, sender, document, date?, status
  // Show comment/description column if showDescription is true OR if any document has comments
  const hasComments = documents.some(doc => doc.comments);
  const showCommentColumn = showDescription || hasComments;
  const hasActionsColumn = !!(renderActions || onApprove || onRevision || onRelease || onForward || onRecord || onEdit || onTrack || onMarkRelease);
  const columnsCount = baseColumns + (showPriority ? 1 : 0) + (showCommentColumn ? 1 : 0) + (hasActionsColumn ? 1 : 0);

  const navigate = useNavigate();
  const [revisionDialogDoc, setRevisionDialogDoc] = React.useState<Document | null>(null);
  const [revisionComment, setRevisionComment] = React.useState('');
  // Dialog state for marking a release as done
  const [markDialogDoc, setMarkDialogDoc] = React.useState<Document | null>(null);
  const [markLoading, setMarkLoading] = React.useState(false);

  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | string>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<'all' | 'high' | 'moderate' | 'low'>('all');
  const [dateFrom, setDateFrom] = React.useState<string>('');
  const [dateTo, setDateTo] = React.useState<string>('');
  const [sortOrder, setSortOrder] = React.useState<'desc' | 'asc'>('desc');
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

  const availablePriorities = React.useMemo(() => {
    const set = new Set<'high' | 'moderate' | 'low'>();
    (documents || []).forEach((d) => {
      const raw = String(d.Priority || '').trim().toLowerCase();
      if (!raw) return;
      if (raw === 'high') set.add('high');
      else if (raw === 'medium' || raw === 'moderate') set.add('moderate');
      else if (raw === 'low') set.add('low');
    });
    // Stable order
    return Array.from(set).sort((a, b) => {
      const order: Record<string, number> = { high: 1, moderate: 2, low: 3 };
      return (order[a] ?? 99) - (order[b] ?? 99);
    });
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

  // Helper: append '/override' suffix when final_status is 'override'
  const labelWithFinal = (base: string | undefined, doc: Document) => {
    const b = typeof base === 'string' ? base : (base ?? '');
    const finalRaw = (doc as any).final_status ?? (doc as any).finalStatus ?? '';
    if (String(finalRaw).toLowerCase() === 'override') return `${b}/override`;
    return b;
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

    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo) : null;
    if (fromDate) fromDate.setHours(0, 0, 0, 0);
    if (toDate) toDate.setHours(23, 59, 59, 999);

    return (documents || []).filter((d) => {
      const statusOk = statusFilter === 'all' ? true : (d.Status || '').toLowerCase() === statusFilter.toLowerCase();

      const rawPriority = String(d.Priority || '').trim().toLowerCase();
      const normalizedPriority: 'high' | 'moderate' | 'low' | '' =
        rawPriority === 'high'
          ? 'high'
          : rawPriority === 'medium' || rawPriority === 'moderate'
            ? 'moderate'
            : rawPriority === 'low'
              ? 'low'
              : '';
      const priorityOk = priorityFilter === 'all' ? true : normalizedPriority === priorityFilter;

      const dateFilterActive = !!fromDate || !!toDate;
      let dateOk = true;
      if (dateFilterActive) {
        const ts = Date.parse(String(d.created_at || ''));
        if (Number.isNaN(ts)) {
          dateOk = false;
        } else {
          const docDate = new Date(ts);
          dateOk = (!fromDate || docDate >= fromDate) && (!toDate || docDate <= toDate);
        }
      }

      if (!statusOk || !priorityOk || !dateOk) return false;
      if (!q) return true;

      // “Filter by name” uses the same search box: Type, sender name, description, and status.
      const hay = [d.Type, d.sender_name, d.description, d.Status].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [documents, query, statusFilter, priorityFilter, dateFrom, dateTo]);

  const sorted = React.useMemo(() => {
    const list = [...normalized];
    const dir = sortOrder === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      if (showDate) {
        const ta = Date.parse(String(a.created_at || ''));
        const tb = Date.parse(String(b.created_at || ''));
        const va = Number.isNaN(ta) ? -Infinity : ta;
        const vb = Number.isNaN(tb) ? -Infinity : tb;
        if (va !== vb) return (va - vb) * dir;
      }

      // Fallback/stable tie-breaker
      const ida = Number(a.Document_Id ?? 0);
      const idb = Number(b.Document_Id ?? 0);
      return (ida - idb) * dir;
    });

    return list;
  }, [normalized, sortOrder, showDate]);

  const statusBadge = (doc: Document) => {
    // Received requests: show Done/Not Done based on mark
    const mark = String((doc as any).mark || '').toLowerCase();
    if (mark === 'done' || mark === 'not_done' || mark === 'not done') {
      const isDone = mark === 'done';
      const statusLabel = isDone ? 'Done' : 'Not Done';
      return (
        <Badge variant={isDone ? 'success' : 'default'}>
          {labelWithFinal(statusLabel, doc)}
        </Badge>
      );
    }

    const statusLower = doc.Status?.toLowerCase();
    let statusLabel = statusLower === 'revision' ? 'Needs Revision' : doc.Status;
    statusLabel = labelWithFinal(statusLabel, doc);
    return <Badge variant={statusVariants[statusLower || ''] || 'default'}>{statusLabel}</Badge>;
  };

  const IconActionButton = ({
    onClick,
    disabled,
    title,
    ariaLabel,
    children,
    className,
  }: {
    onClick: () => void;
    disabled?: boolean;
    title: string;
    ariaLabel: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className={['h-8 w-8', className].filter(Boolean).join(' ')}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
    >
      {children}
    </Button>
  );

  React.useEffect(() => {
    if (statusFilter !== 'all' && !availableStatuses.includes(statusFilter.toLowerCase())) {
      setStatusFilter('all');
    }
  }, [availableStatuses, statusFilter]);

  React.useEffect(() => {
    if (priorityFilter !== 'all' && !availablePriorities.includes(priorityFilter)) {
      setPriorityFilter('all');
    }
  }, [availablePriorities, priorityFilter]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageSlice = enablePagination ? sorted.slice((currentPage - 1) * pageSize, (currentPage) * pageSize) : sorted;

  React.useEffect(() => {
    setPage(1);
  }, [query, statusFilter, priorityFilter, dateFrom, dateTo, sortOrder, pageSize, documents]);

  const activeFiltersCount =
    (showStatusFilter && statusFilter !== 'all' ? 1 : 0) +
    (priorityFilter !== 'all' ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (sortOrder !== 'desc' ? 1 : 0);

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              placeholder="Search..." 
              className="w-[260px] pl-9" 
            />
          </div>
          <DataTableFilters
            activeCount={activeFiltersCount}
            description="Status, priority, and date."
            onClear={() => {
              setStatusFilter('all');
              setPriorityFilter('all');
              setDateFrom('');
              setDateTo('');
              setSortOrder('desc');
            }}
          >
            {showStatusFilter ? (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Status</div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
                  <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {availableStatuses.map((s) => (
                      <SelectItem key={s} value={s}>{labelForStatus(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Priority</div>
              <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as any)}>
                <SelectTrigger><SelectValue placeholder="All priorities" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {(availablePriorities.length ? availablePriorities : ['high', 'moderate', 'low']).map((p) => (
                    <SelectItem key={p} value={p}>
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={
                            p === 'high'
                              ? 'h-2.5 w-2.5 rounded-full bg-red-500'
                              : p === 'moderate'
                              ? 'h-2.5 w-2.5 rounded-full bg-amber-500'
                              : 'h-2.5 w-2.5 rounded-full bg-emerald-500'
                          }
                        />
                        {p === 'high' ? 'High' : p === 'moderate' ? 'Moderate' : 'Low'}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Date range</div>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="Date from" />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="Date to" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Sort</div>
              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'asc' | 'desc')}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Newest first</SelectItem>
                  <SelectItem value="asc">Oldest first</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-[11px] text-muted-foreground">Sorts by created date{showDate ? '' : ' (falls back to ID)'}.</div>
            </div>
          </DataTableFilters>
        </div>
        {enablePagination && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show:</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(parseInt(v))}>
              <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((n) => (<SelectItem key={n} value={String(n)}>{n}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-12 text-center font-semibold">ID</TableHead>
            <TableHead className="font-semibold">Type</TableHead>
            <TableHead className="font-semibold">Sender</TableHead>
            {showPriority && <TableHead className="font-semibold">Priority</TableHead>}
            <TableHead className="font-semibold">Document</TableHead>
            {showDate && <TableHead className="font-semibold">Date</TableHead>}
            {showCommentColumn && (
              <TableHead className="font-semibold">
                {showDescription ? descriptionLabel : (hasComments ? 'Comment' : descriptionLabel)}
              </TableHead>
            )}
            <TableHead className="font-semibold">Status</TableHead>
            {hasActionsColumn && <TableHead className="font-semibold text-center">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageSlice.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columnsCount + 1} className="h-24 text-center text-muted-foreground">
                No documents found.
              </TableCell>
            </TableRow>
          ) : (
            pageSlice.map((doc, index) => {
              const rowNumber = enablePagination 
                ? (currentPage - 1) * pageSize + index + 1 
                : index + 1;
              return (
              <TableRow key={doc.Document_Id} className="animate-fade-in">
                <TableCell className="font-medium text-foreground text-center">{rowNumber}</TableCell>
                <TableCell className="text-foreground">{doc.Type}</TableCell>
                <TableCell className="text-foreground">{doc.sender_name}</TableCell>
                {showPriority && (
                  <TableCell>
                    {(() => {
                      // Map Priority values: High, Low, Moderate
                      let priorityValue = doc.Priority || '';
                      let priorityVariant: 'destructive' | 'warning' | 'secondary' = 'secondary';
                      
                      if (priorityValue.toLowerCase() === 'high') {
                        priorityValue = 'High';
                        priorityVariant = 'destructive';
                      } else if (priorityValue.toLowerCase() === 'medium' || priorityValue.toLowerCase() === 'moderate') {
                        priorityValue = 'Moderate';
                        priorityVariant = 'warning';
                      } else {
                        priorityValue = 'Low';
                        priorityVariant = 'secondary';
                      }

                      return (
                        <>
                          <Badge variant={priorityVariant}>{priorityValue}</Badge>
                          {(() => {
                            if (!prioritySuffix) return null;
                            const suffix = prioritySuffix(doc);
                            if (!suffix) return null;
                            return <span className="ml-2 text-xs text-muted-foreground">/{suffix}</span>;
                          })()}
                        </>
                      );
                    })()}
                  </TableCell>
                )}
                <TableCell>
                  {doc.Document ? (
                    <Button
                      variant="link"
                      className="px-0 text-xs text-blue-600 underline inline-flex items-center gap-1"
                      onClick={() => {
                        void handleAttachmentClick(doc);
                      }}
                    >
                      <Paperclip className="h-4 w-4" />
                      <span>Attached</span>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                </TableCell>
                {showDate && <TableCell>{formatDateTime(doc.created_at)}</TableCell>}
                {showCommentColumn && (
                  <TableCell className="max-w-[240px] truncate" title={doc.description || doc.comments || ''}>
                    {doc.description || doc.comments || '—'}
                  </TableCell>
                )}
                <TableCell>{statusBadge(doc)}</TableCell>

                {hasActionsColumn && (
                  <TableCell className="whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1 w-full">
                      {(() => {
                        const mark = String((doc as any).mark || '').toLowerCase();
                        const isReceivedMark = mark === 'done' || mark === 'not_done' || mark === 'not done';
                        const isDone = mark === 'done';
                        if (isReceivedMark && !isDone && onMarkRelease) {
                          return (
                            <IconActionButton
                              onClick={() => setMarkDialogDoc(doc)}
                              title="Mark as done"
                              ariaLabel={`Mark ${doc.Type} as done`}
                              className="text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </IconActionButton>
                          );
                        }
                        return null;
                      })()}

                      {(() => {
                        const statusLower = doc.Status?.toLowerCase();

                        // Approver-side actions (Pending)
                        if ((onApprove || onRevision) && statusLower === 'pending') {
                          return (
                            <>
                              {onApprove && (
                                <IconActionButton
                                  onClick={() => onApprove(doc.Document_Id)}
                                  title="Approve"
                                  ariaLabel={`Approve ${doc.Type}`}
                                  className="text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </IconActionButton>
                              )}
                              {onRevision && (
                                <IconActionButton
                                  onClick={() => {
                                    setRevisionDialogDoc(doc);
                                    setRevisionComment('');
                                  }}
                                  title="Send for revision"
                                  ariaLabel={`Send ${doc.Type} for revision`}
                                  className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </IconActionButton>
                              )}
                            </>
                          );
                        }

                        // Track (Approved/Pending)
                        if (onTrack && (statusLower === 'approved' || statusLower === 'pending')) {
                          return (
                            <IconActionButton
                              onClick={() => onTrack(doc)}
                              title="Track"
                              ariaLabel={`Track ${doc.Type}`}
                              className="text-primary hover:bg-primary/10"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </IconActionButton>
                          );
                        }

                        return null;
                      })()}

                      {(() => {
                        const statusLower = doc.Status?.toLowerCase();

                        // Releaser: Release action
                        if (onRelease && (statusLower === 'approved' || statusLower === 'not released')) {
                          return (
                            <IconActionButton
                              onClick={() => onRelease(doc.Document_Id)}
                              title="Release"
                              ariaLabel={`Release ${doc.Type}`}
                              className="text-sky-600 hover:bg-sky-500/10 hover:text-sky-700"
                            >
                              <Send className="h-4 w-4" />
                            </IconActionButton>
                          );
                        }

                        // Not Forwarded: Forward without notes
                        if (onForward && (statusLower === 'not forwarded' || statusLower === 'not_forwarded')) {
                          return (
                            <IconActionButton
                              onClick={() => onForward(doc, false)}
                              title="Forward"
                              ariaLabel={`Forward ${doc.Type}`}
                              className="text-primary hover:bg-primary/10"
                            >
                              <Forward className="h-4 w-4" />
                            </IconActionButton>
                          );
                        }

                        // Approved/Pending: Forward with notes (used in some flows)
                        if (onForward && (statusLower === 'approved' || statusLower === 'pending')) {
                          return (
                            <IconActionButton
                              onClick={() => onForward(doc, true)}
                              title="Forward (with notes)"
                              ariaLabel={`Forward ${doc.Type} with notes`}
                              className="text-primary hover:bg-primary/10"
                            >
                              <Forward className="h-4 w-4" />
                            </IconActionButton>
                          );
                        }

                        // Recorder: Record action
                        if (onRecord && statusLower === 'not recorded') {
                          return (
                            <IconActionButton
                              onClick={() => onRecord(doc)}
                              title="Record"
                              ariaLabel={`Record ${doc.Type}`}
                              className="text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </IconActionButton>
                          );
                        }

                        // Employee-side: Edit action (when allowed)
                        if (onEdit && !onApprove && !onRevision && statusLower !== 'approved' && statusLower !== 'pending') {
                          return (
                            <IconActionButton
                              onClick={() => onEdit(doc)}
                              title="Edit"
                              ariaLabel={`Edit ${doc.Type}`}
                              className="text-muted-foreground hover:bg-muted"
                            >
                              <Pencil className="h-4 w-4" />
                            </IconActionButton>
                          );
                        }

                        return null;
                      })()}

                      {renderActions ? renderActions(doc) : null}
                    </div>
                  </TableCell>
                )}
              </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      </div>
      {enablePagination && (
        <div className="p-4 border-t border-border grid grid-cols-3 items-center text-sm bg-muted/30">
          <div className="justify-self-start">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }} 
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
          <div className="justify-self-center text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="justify-self-end">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationNext 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }} 
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
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

      {/* Mark as done confirmation dialog */}
      <Dialog
        open={!!markDialogDoc}
        onOpenChange={(open) => {
          if (!open) {
            setMarkDialogDoc(null);
            setMarkLoading(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-primary">Mark request as done</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this request as done? This will set the release as completed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <p className="text-sm font-medium text-primary">Document</p>
              <p className="text-sm text-muted-foreground">{markDialogDoc?.Type} — {markDialogDoc?.sender_name}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="text-primary border-primary hover:text-primary hover:bg-primary/10" onClick={() => setMarkDialogDoc(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!markDialogDoc || !onMarkRelease) {
                  setMarkDialogDoc(null);
                  return;
                }
                if (!markDialogDoc.record_doc_id) {
                  toast({ title: 'Cannot mark: missing record id', variant: 'destructive' });
                  setMarkDialogDoc(null);
                  return;
                }
                try {
                  setMarkLoading(true);
                  await onMarkRelease(markDialogDoc.record_doc_id, 'done');
                  setMarkDialogDoc(null);
                } catch (err) {
                  console.error('Mark release error', err);
                  toast({ title: 'Failed to mark request', variant: 'destructive' });
                } finally {
                  setMarkLoading(false);
                }
              }}
              disabled={markLoading}
            >
              Mark as done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentTable;
