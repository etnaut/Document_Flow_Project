import React, { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRecordedDocuments, getDepartments } from '@/services/api';
import { Document } from '@/types';
import DocumentTable from '@/components/documents/DocumentTable';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { CheckCircle } from 'lucide-react';

const ReleaserReleasedDocuments: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');

  const isSuperAdmin = user?.User_Role === 'SuperAdmin';
  const isReleaser = user && (isSuperAdmin || user.User_Role === 'Releaser' || String(user.pre_assigned_role ?? '').trim().toLowerCase() === 'releaser');

  const load = useCallback(async () => {
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
      const data = await getRecordedDocuments(effectiveDept, 'released');
      type RecordedRaw = Document & { approved_admin?: string; approved_comments?: string };
      const mapped = (data || []).map((d: RecordedRaw) => ({
        ...d,
        description: d.approved_admin ?? d.approved_comments ?? d.description ?? '',
      }));
      setDocuments(mapped);
    } catch (err: unknown) {
      console.error('Releaser released load error', err);
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: 'Error', description: message || 'Failed to load documents', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, isSuperAdmin, selectedDept]);

  useEffect(() => {
    void load();
  }, [load]);

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

  if (!user) return <Navigate to="/login" replace />;
  if (!isReleaser) return <Navigate to="/dashboard" replace />;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
            <CheckCircle className="h-5 w-5 text-success" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Released Documents</h1>
            <p className="text-muted-foreground">
              All released items for {isSuperAdmin ? (selectedDept || 'all departments') : user.Department}.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
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
          <Button onClick={() => void load()} variant="outline">Refresh</Button>
        </div>
      </div>

      <DocumentTable
        documents={documents}
        showDescription
        descriptionLabel="Admin"
        showDate={false}
        showStatusFilter={false}
        enablePagination
        pageSizeOptions={[10, 20, 50]}
      />
    </div>
  );
};

export default ReleaserReleasedDocuments;
