import React from 'react';
import { Document } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle, XCircle, RotateCcw, Eye, Edit, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface DocumentTableProps {
  documents: Document[];
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onRevision?: (id: number) => void;
  onRelease?: (id: number) => void;
  onForward?: (doc: Document) => void;
  onView?: (doc: Document) => void;
  onEdit?: (doc: Document) => void;
  showActions?: boolean;
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
  onApprove,
  onReject,
  onRevision,
  onRelease,
  onForward,
  onView,
  onEdit,
  showActions = true,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.User_Role === 'Admin';
  const isReleaser = user?.User_Role === 'Releaser' || String(user?.pre_assigned_role ?? '').trim().toLowerCase() === 'releaser';
  const canRelease = (isAdmin || isReleaser) && onRelease;
  const columnsCount = showActions ? 7 : 6;

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
            {showActions && <TableHead className="font-semibold text-right">Actions</TableHead>}
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
                <TableCell>
                  {doc.Document ? (
                    <Badge variant="secondary" className="text-xs">Attached</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{doc.created_at}</TableCell>
                <TableCell>
                  <Badge variant={statusVariants[doc.Status] || 'default'}>{doc.Status}</Badge>
                </TableCell>
                {showActions && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {onView && (
                        <Button variant="ghost" size="sm" onClick={() => onView(doc)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {/* Employee can edit documents that are for revision */}
                      {!isAdmin && doc.Status === 'Revision' && onEdit && (
                        <Button variant="ghost" size="sm" onClick={() => onEdit(doc)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Admin actions */}
                      {isAdmin && doc.Status === 'Pending' && (
                        <>
                          {onApprove && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-success hover:text-success"
                              onClick={() => onApprove(doc.Document_Id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {onRevision && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-info hover:text-info"
                              onClick={() => onRevision(doc.Document_Id)}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          {onReject && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => onReject(doc.Document_Id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}

                      {canRelease && doc.Status === 'Approved' && (
                        <>
                          {isAdmin && onForward && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-info hover:text-info"
                              onClick={() => onForward(doc)}
                              title="Forward to another department"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          {onRelease && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:text-primary"
                              onClick={() => onRelease(doc.Document_Id)}
                              title="Release document"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default DocumentTable;
