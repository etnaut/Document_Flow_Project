import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments, updateDocumentStatus } from '@/services/api';
import { Document } from '@/types';
import DocumentTable from '@/components/documents/DocumentTable';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const AllDocuments: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const fetchDocuments = async () => {
    if (!user) return;
    try {
      // Filter by user's department - Admin sees docs sent TO their department
      const data = await getDocuments(user.User_Id, user.User_Role, user.Department);
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    await updateDocumentStatus(id, 'Approved');
    toast({ title: 'Document approved successfully.' });
    fetchDocuments();
  };

  const handleReject = async (id: number) => {
    await updateDocumentStatus(id, 'Received');
    toast({ title: 'Document rejected.', variant: 'destructive' });
    fetchDocuments();
  };

  const handleRevision = async (id: number) => {
    await updateDocumentStatus(id, 'Revision');
    toast({ title: 'Document sent for revision.' });
    fetchDocuments();
  };

  const handleRelease = async (id: number) => {
    await updateDocumentStatus(id, 'Released');
    toast({ title: 'Document released successfully.' });
    fetchDocuments();
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
        <h1 className="text-3xl font-bold text-foreground">All Documents</h1>
        <p className="mt-1 text-muted-foreground">
          Documents sent to {user?.Department} department.
        </p>
      </div>

      <DocumentTable
        documents={documents}
        onApprove={handleApprove}
        onReject={handleReject}
        onRevision={handleRevision}
        onRelease={handleRelease}
        onView={setViewingDoc}
      />

      <Dialog open={!!viewingDoc} onOpenChange={() => setViewingDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Document Details</DialogTitle>
            <DialogDescription>
              Document #{viewingDoc?.Document_Id}
            </DialogDescription>
          </DialogHeader>
          {viewingDoc && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">{viewingDoc.Type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={viewingDoc.Status === 'Approved' ? 'approved' : viewingDoc.Status === 'Pending' ? 'pending' : 'default'}>
                    {viewingDoc.Status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sender</p>
                  <p className="font-medium">{viewingDoc.sender_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">From Department</p>
                  <p className="font-medium">{viewingDoc.sender_department}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">To Department</p>
                  <p className="font-medium">{viewingDoc.target_department}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Priority</p>
                  <Badge variant={viewingDoc.Priority === 'High' ? 'destructive' : 'secondary'}>
                    {viewingDoc.Priority}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{viewingDoc.created_at}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AllDocuments;
