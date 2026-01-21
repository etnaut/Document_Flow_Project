import React, { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getApprovedDocuments } from '@/services/api';
import { Document } from '@/types';
import DocumentViewToggle from '@/components/documents/DocumentViewToggle';
import { toast } from '@/hooks/use-toast';

const HeadForwarded: React.FC = () => {
  const { user } = useAuth();
  const allowed = user && (user.User_Role === 'DepartmentHead' || user.User_Role === 'DivisionHead' || user.User_Role === 'OfficerInCharge');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDocuments = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const approvedDocs = await getApprovedDocuments(user.Department, undefined, user.User_Id);
      type Approved = Document & { admin?: string; forwarded_by_admin?: string };
      const mapped = (approvedDocs || [])
        .map((d: Approved) => ({
          ...d,
          // set created_at to forwarded_date for forwarded list
          created_at: d.forwarded_date ?? d.created_at ?? null,
          description: d.forwarded_by_admin || d.admin || '',
        }))
        .filter((d) => (d.Status || '').toLowerCase() === 'forwarded');
      setDocuments(mapped);
    } catch (error: unknown) {
      console.error('Head Forwarded load error', error);
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Failed to load documents', description: message || 'Please try again', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!allowed) return;
    void loadDocuments();
  }, [allowed, loadDocuments]);

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
          <h1 className="text-2xl font-bold text-foreground">Forwarded Documents</h1>
          <p className="text-muted-foreground">Documents that have been forwarded from your department.</p>
        </div>
      </div>

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
    </div>
  );
};

export default HeadForwarded;
