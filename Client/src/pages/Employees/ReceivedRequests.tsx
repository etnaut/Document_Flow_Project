import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getReceivedRequests, archiveDocument, respondToDocument } from '@/services/api';
import { Document } from '@/types';
import { toast } from '@/hooks/use-toast';
import { Inbox, Archive, MessageSquare } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import RespondDocumentDialog from '@/components/documents/RespondDocumentDialog';

const ReceivedRequests: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const fetchDocuments = async () => {
    if (!user) return;
    try {
      const data = await getReceivedRequests(user.Department);
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching received requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (id: number) => {
    try {
      await archiveDocument(id);
      toast({ 
        title: 'Document archived',
        description: 'Document has been marked as done and archived.'
      });
      fetchDocuments();
    } catch (error) {
      toast({ 
        title: 'Error',
        description: 'Failed to archive document.',
        variant: 'destructive'
      });
    }
  };

  const handleRespondClick = (doc: Document) => {
    setSelectedDocument(doc);
    setRespondDialogOpen(true);
  };

  const handleRespond = async (documentId: number, message: string) => {
    if (!user) return;
    try {
      await respondToDocument(documentId, user.Department, user.Full_Name, message);
      toast({ 
        title: 'Response sent',
        description: `Response sent back to ${selectedDocument?.forwarded_from} department.`
      });
      fetchDocuments();
    } catch (error) {
      toast({ 
        title: 'Error',
        description: 'Failed to send response.',
        variant: 'destructive'
      });
    }
  };

  const priorityVariants: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
    High: 'destructive',
    Medium: 'default',
    Low: 'secondary',
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Inbox className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Received Requests</h1>
            <p className="text-muted-foreground">
              Documents forwarded from other department admins - archive or respond.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-soft">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>From Department</TableHead>
              <TableHead>Forwarded By</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No received requests found.
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow key={doc.Document_Id}>
                  <TableCell className="font-medium">#{doc.Document_Id}</TableCell>
                  <TableCell>{doc.Type}</TableCell>
                  <TableCell>{doc.forwarded_from || doc.sender_department}</TableCell>
                  <TableCell>{doc.forwarded_by_admin || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={priorityVariants[doc.Priority] || 'default'}>
                      {doc.Priority}
                    </Badge>
                  </TableCell>
                  <TableCell>{doc.created_at}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {doc.comments || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRespondClick(doc)}
                        className="gap-1"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Respond
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleArchive(doc.Document_Id)}
                        className="gap-1"
                      >
                        <Archive className="h-4 w-4" />
                        Archive
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <RespondDocumentDialog
        open={respondDialogOpen}
        onOpenChange={setRespondDialogOpen}
        document={selectedDocument}
        onRespond={handleRespond}
      />
    </div>
  );
};

export default ReceivedRequests;
