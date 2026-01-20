import React, { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getApprovedDocuments, updateDocumentStatus, getDepartments } from '@/services/api';
import { Document } from '@/types';
import DocumentTable from '@/components/documents/DocumentTable';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const HeadNotForwarded: React.FC = () => {
  const { user } = useAuth();
  const allowed = user && (user.User_Role === 'DepartmentHead' || user.User_Role === 'DivisionHead' || user.User_Role === 'OfficerInCharge' || user.User_Role === 'SuperAdmin');
  const isSuperAdmin = user?.User_Role === 'SuperAdmin';
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [forwardDialogDoc, setForwardDialogDoc] = useState<Document | null>(null);

  const loadDocuments = useCallback(async () => {
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
      setLoading(true);
      const approvedDocs = await getApprovedDocuments(effectiveDept, undefined, user.User_Id);
      type Approved = Document & { admin?: string; forwarded_by_admin?: string };
      const mapped = (approvedDocs || [])
        .map((d: Approved) => ({
          ...d,
          // prefer forwarded admin name when available
          description: d.forwarded_by_admin || d.admin || '',
        }))
        .filter((d) => (d.Status || '').toLowerCase() === 'not forwarded');
      setDocuments(mapped);
    } catch (error: unknown) {
      console.error('Head Not Forwarded load error', error);
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Failed to load documents', description: message || 'Please try again', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, isSuperAdmin, selectedDept]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const init = async () => {
      try {
        const depts = await getDepartments();
        setDepartments(depts || []);
        setSelectedDept((prev) => prev || depts?.[0] || '');
      } catch {
        setDepartments([]);
      }
    };
    void init();
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!allowed) return;
    void loadDocuments();
  }, [allowed, loadDocuments]);

  const handleConfirmForward = async () => {
    if (!forwardDialogDoc || !user) return;
    try {
      setSubmittingId(forwardDialogDoc.Document_Id);
      // Do not send a comment when forwarding (comments no longer required)
      await updateDocumentStatus(forwardDialogDoc.Document_Id, 'Forwarded', undefined, user.Full_Name);
      toast({ title: 'Document forwarded' });
      setForwardDialogDoc(null);
      await loadDocuments();
    } catch (error: unknown) {
      console.error('Forward failed', error);
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Failed to forward document', description: message || 'Please try again', variant: 'destructive' });
    } finally {
      setSubmittingId(null);
    }
  };

  if (!allowed) return <Navigate to="/dashboard" replace />;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Not Forwarded</h1>
          <p className="text-muted-foreground">Documents approved but not yet forwarded from your department.</p>
        </div>
        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Department</span>
            <select
              className="rounded-md border bg-background p-2 text-sm"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <DocumentTable
        documents={documents}
        onForward={(doc) => setForwardDialogDoc(doc)}
        showDescription
        descriptionLabel="Admin"
        showDate={false}
        showStatusFilter={false}
        enablePagination
        pageSizeOptions={[10,20,50]}
      />

      <Dialog open={!!forwardDialogDoc} onOpenChange={(open) => { if (!open) { setForwardDialogDoc(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forward Document</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm font-medium">Document</p>
              <p className="text-sm text-muted-foreground">ID #{forwardDialogDoc?.Document_Id} — {forwardDialogDoc?.Type}</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setForwardDialogDoc(null); }} disabled={submittingId !== null}>Cancel</Button>
            <Button onClick={handleConfirmForward} disabled={submittingId !== null}>{submittingId ? 'Forwarding…' : 'Forward'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HeadNotForwarded;
