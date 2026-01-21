import React, { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
<<<<<<< HEAD
import DocumentViewToggle from '@/components/documents/DocumentViewToggle';
import { getApprovedDocuments } from '@/services/api';
=======
import DocumentTable from '@/components/documents/DocumentTable';
import { getApprovedDocuments, getDepartments } from '@/services/api';
>>>>>>> 14358356059b01645918b43587691d6bc6cf2e43
import { Document } from '@/types';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

const RecordedDocuments: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.User_Role === 'SuperAdmin';
  const isRecorder = user && (isSuperAdmin || user.User_Role === 'Releaser' || String(user.pre_assigned_role ?? '').toLowerCase() === 'recorder');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');

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
      // Include both recorded and released so entries that were marked released in approved table are also shown as recorded
      const approved = await getApprovedDocuments(effectiveDept, 'recorded,released', user.User_Id);
      type ApiRecord = Document & { approved_by?: string; approved_admin?: string; admin?: string; forwarded_by_admin?: string; type?: string };
      const mapped = (approved || [])
        .map((d: ApiRecord | null) => {
          if (!d) return null;
          const statusRaw = (d.Status || '').toLowerCase();
          if (statusRaw !== 'recorded' && statusRaw !== 'released') return null;
          return {
            ...d,
            Type: d.Type || d.type || '',
            sender_name: d.sender_name || '',
            description: d.approved_by || d.approved_admin || d.admin || d.forwarded_by_admin || '',
            Status: 'Recorded' as const,
            // Prefer record_date if available
            created_at: d.record_date ?? d.forwarded_date ?? d.created_at ?? null,
          } as Document;
        })
        .filter(Boolean) as Document[];
      setDocuments(mapped);
    } catch (error: unknown) {
      console.error('RecordedDocuments load error', error);
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Failed to load recorded documents', description: message || 'Please try again', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, isSuperAdmin, selectedDept]);

  useEffect(() => {
    if (!user) return;
    void loadDocuments();
  }, [loadDocuments, user]);

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
  if (!isRecorder) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recorded Documents</h1>
          <p className="text-muted-foreground">
            Documents already recorded for {isSuperAdmin ? (selectedDept || 'all departments') : user.Department}.
          </p>
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
          <Button onClick={() => void loadDocuments()} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-4 text-sm text-muted-foreground">Loading documents...</div>
      ) : (
        <DocumentViewToggle
          documents={documents}
          showDescription
          descriptionLabel="Admin"
          showDate={true}
          showStatusFilter={false}
          enablePagination
          pageSizeOptions={[10,20,50]}
          defaultView="accordion"
        />
      )}
    </div>
  );
};

export default RecordedDocuments;
