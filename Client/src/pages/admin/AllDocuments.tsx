import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments, updateDocumentStatus } from '@/services/api';
import { Document } from '@/types';
import DocumentTable from '@/components/documents/DocumentTable';
import { toast } from '@/hooks/use-toast';

const AllDocuments: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const fetchDocuments = async () => {
    if (!user) return;
    try {
      // Get all documents, then filter by sender's department/division matching admin's
      const docs = await getDocuments();
      const filtered = (docs || []).filter((d: any) => {
        // sender user info
        const senderDeptId = d.sender_department_id ?? d.Department_Id ?? d.sender_departmentid ?? d.department_id;
        const senderDivId = d.sender_division_id ?? d.Division_Id ?? d.sender_divisionid ?? d.division_id;
        // admin user info
        // Fallback: try matching by department/division name if IDs are not present
        const adminDeptId = user.Department;
        const adminDivId = user.Division;
        // If senderDeptId/divId are undefined, try matching by name
        if (senderDeptId === undefined || senderDivId === undefined) {
          return (d.sender_department === adminDeptId && d.sender_division === adminDivId);
        }
        return senderDeptId === adminDeptId && senderDivId === adminDivId;
      });
      const mapped = filtered.map((d: any) => ({
        ...d,
        description: d.forwarded_by_admin || d.comments || d.sender_name || '',
      }));
      setDocuments(mapped);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({ title: 'Failed to load documents', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    if (!user) return;
    try {
      await updateDocumentStatus(id, 'Approved', undefined, user.Full_Name);
      toast({ title: 'Document approved successfully.' });
      fetchDocuments();
    } catch (error) {
      console.error('Approve failed', error);
      toast({ title: 'Failed to approve document', variant: 'destructive' });
    }
  };

  const handleRevision = async (id: number, comment?: string) => {
    if (!user) return;
    try {
      await updateDocumentStatus(id, 'Revision', comment, user.Full_Name);
      toast({ title: 'Document sent for revision.' });
      fetchDocuments();
    } catch (error) {
      console.error('Revision failed', error);
      toast({ title: 'Failed to update document', variant: 'destructive' });
    }
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
        onRevision={handleRevision}
        showPriority
        showDescription
        descriptionLabel="Admin"
        showDate={false}
        enablePagination
        pageSizeOptions={[10,20,50]}
      />
    </div>
  );
};

export default AllDocuments;
