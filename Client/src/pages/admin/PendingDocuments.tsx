import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDocumentsByStatus, updateDocumentStatus, getDepartments } from '@/services/api';
import { Document } from '@/types';
import DocumentViewToggle from '@/components/documents/DocumentViewToggle';
import { toast } from '@/hooks/use-toast';
import { Clock } from 'lucide-react';

const PendingDocuments: React.FC = () => {
  const { user, impersonator } = useAuth();
  const isSuperAdmin = user?.User_Role === 'SuperAdmin';
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (isSuperAdmin) {
        try {
          const depts = await getDepartments();
          setDepartments(depts || []);
          if (depts && depts.length > 0) {
            setSelectedDept((prev) => prev || depts[0]);
          }
        } catch {
          setDepartments([]);
        }
      }
      await fetchDocuments();
    };
    void init();
  }, [user, isSuperAdmin, selectedDept]);

  const fetchDocuments = async () => {
    if (!user) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    const effectiveDept = isSuperAdmin ? selectedDept : user.Department;
    if (!effectiveDept) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    try {
      // Filter by user's department - Admin sees pending docs sent TO their department
      setLoading(true);
      const data = await getDocumentsByStatus('Pending', effectiveDept, isSuperAdmin ? 'Admin' : user.User_Role, user.User_Id);
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    if (!user) return;
    try {
      await updateDocumentStatus(id, 'Approved', undefined, user.Full_Name, undefined, impersonator ? true : false);
      toast({ title: 'Document approved successfully.' });
      fetchDocuments();
    } catch (error) {
      console.error('Approve failed', error);
      toast({ title: 'Failed to approve document', variant: 'destructive' });
    }
  };

  const handleReject = async (id: number) => {
    try {
      await updateDocumentStatus(id, 'Received');
      toast({ title: 'Document rejected.', variant: 'destructive' });
      fetchDocuments();
    } catch (error) {
      console.error('Reject failed', error);
      toast({ title: 'Failed to reject document', variant: 'destructive' });
    }
  };

  const handleRevision = async (id: number, comment?: string) => {
    try {
      await updateDocumentStatus(id, 'Revision', comment, user?.Full_Name, undefined, impersonator ? true : false);
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
      <div className="animate-slide-up space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
            <Clock className="h-6 w-6 text-warning" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Pending Documents</h1>
            <p className="text-muted-foreground">
              Documents awaiting your review ({user?.Department}).
            </p>
          </div>
        </div>
        {isSuperAdmin && (
          <div className="flex items-center gap-3">
            <label className="text-sm text-muted-foreground">Department</label>
            <select
              className="rounded-md border bg-background p-2 text-sm"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <DocumentViewToggle
        documents={documents}
        onApprove={handleApprove}
        onReject={handleReject}
        onRevision={handleRevision}
        showDescription
        showStatusFilter={false}
        enablePagination
        pageSizeOptions={[10,20,50]}
        defaultView="accordion"
      />
    </div>
  );
};

export default PendingDocuments;
