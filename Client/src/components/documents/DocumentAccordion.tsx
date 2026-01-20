import React from 'react';
import DocumentTable from './DocumentTable';
import { Document } from '@/types';

interface DocumentAccordionProps {
  documents: Document[];
  [key: string]: any;
}

// Accordion feature removed — render the table view as a fallback
const DocumentAccordion: React.FC<DocumentAccordionProps> = ({ documents, ...props }) => {
  return <DocumentTable documents={documents} {...props} />;
};

export default DocumentAccordion;
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-foreground text-left">
                      {showDate && doc.created_at && (
                        <div className="flex items-center justify-start gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">{formatDate(doc.created_at)}</span>
                        </div>
                      )}

                      {doc.sender_department && (
                        <div className="flex items-center justify-start gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">{doc.sender_department}</span>
                        </div>
                      )}

                      {doc.sender_name && (
                        <div className="flex items-center justify-start gap-2">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">{doc.sender_name}</span>
                        </div>
                      )}

                      {doc.Type && (
                        <div className="flex items-center justify-start gap-2">
                          <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">Kind: {doc.Type}</span>
                          {doc.Priority === 'High' && (
                            <Badge variant="info" className="ml-2 text-xs bg-blue-100 text-blue-800 border-blue-200">Urgent</Badge>
                          )}
                        </div>
                      )}

                      {hasAttachment && (
                        <div className="flex items-center justify-start gap-2">
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
                      <div className="flex items-start justify-start gap-2 text-sm text-left">
                        <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-1 text-left">
                          <span className="text-muted-foreground">Assigned to:</span>
                          <div className="flex flex-wrap gap-1 justify-start">
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
                    <div className="flex items-center justify-start gap-2 flex-wrap">
                      {showPriority && (() => {
                        // Map Priority values: High, Low, Moderate
                        let priorityValue = doc.Priority || '';
                        let priorityVariant: 'destructive' | 'warning' | 'secondary' = 'secondary';
                        
                        if (priorityValue.toLowerCase() === 'high') {
                          priorityValue = 'High';
                          priorityVariant = 'destructive';
                        } else if (priorityValue.toLowerCase() === 'medium' || priorityValue.toLowerCase() === 'moderate') {
                          priorityValue = 'Moderate';
                          priorityVariant = 'warning';
                        } else if (priorityValue) {
                          priorityValue = 'Low';
                          priorityVariant = 'secondary';
                        }
                        
                        if (!priorityValue) return null;
                        
                        return (
                          <Badge
                            variant={priorityVariant}
                            className="text-xs"
                          >
                            {priorityValue}
                          </Badge>
                        );
                      })()}
                      {doc.Status === 'Approved' && (
                        <Badge variant="success" className="text-xs bg-green-100 text-green-800 border-green-200">
                          Follow-up: Completed
                        </Badge>
                      )}
                    </div>

                    {/* Audit Trail */}
                    <div className="flex flex-col gap-1.5 pt-2 border-t text-xs text-muted-foreground text-left">
                      {doc.created_at && (
                        <div className="flex items-center justify-start gap-2">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>Created: {formatDateTime(doc.created_at)}</span>
                        </div>
                      )}
                      {doc.created_at && (
                        <div className="flex items-center justify-start gap-2">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>Updated: {formatDateTime(doc.created_at)}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-start gap-2 pt-2 border-t">
                      {onView && (
                        <Button
                          variant="default"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => onView(doc)}
                        >
                          View
                        </Button>
                      )}
                      {onEdit && (
                        <Button
                          variant="default"
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
                          variant="default"
                          size="sm"
                          className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => setDeleteDialogDoc(doc)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      )}
                      {renderActions && renderActions(doc)}
                      {onTrack && (
                        <Button
                          variant="default"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => onTrack(doc)}
                        >
                          Track
                        </Button>
                      )}
                      {onForward && (statusLower === 'not forwarded' || statusLower === 'not_forwarded') && (
                        <Button
                          variant="default"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => onForward(doc)}
                        >
                          Forward
                        </Button>
                      )}
                      {onApprove && statusLower === 'pending' && (
                        <Button
                          variant="default"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => onApprove(doc.Document_Id)}
                        >
                          Approve
                        </Button>
                      )}
                      {onReject && statusLower === 'pending' && (
                        <Button
                          variant="default"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => onReject(doc.Document_Id)}
                        >
                          Reject
                        </Button>
                      )}
                      {onRevision && statusLower === 'pending' && (
                        <Button
                          variant="default"
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
                      {onRelease && (statusLower === 'approved' || statusLower === 'not released') && (
                        <Button
                          variant="default"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => onRelease(doc.Document_Id)}
                        >
                          Release
                        </Button>
                      )}
                      {onRecord && statusLower === 'not recorded' && (
                        <Button
                          variant="default"
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
        </>
      )}

      {/* Pagination */}
      {enablePagination && (
        <div className="p-4 border-t border-border bg-muted/30">
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
              {totalPages > 1 && getPaginationItems()}
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
};

export default DocumentAccordion;
