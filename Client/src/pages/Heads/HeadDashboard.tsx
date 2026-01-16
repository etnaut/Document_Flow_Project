import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import DocumentTable from '@/components/documents/DocumentTable';
import { getDocuments, getDocumentsByStatus, getApprovedDocuments } from '@/services/api';
import { Document } from '@/types';
import { toast } from '@/hooks/use-toast';

const HeadDashboard: React.FC = () => {
  const { user } = useAuth();
  // Only head roles allowed
  const allowed = user && (user.User_Role === 'DepartmentHead' || user.User_Role === 'DivisionHead' || user.User_Role === 'OfficerInCharge');
  const [allDocs, setAllDocs] = useState<Document[]>([]);
  const [pendingDocs, setPendingDocs] = useState<Document[]>([]);
  const [forwardedDocs, setForwardedDocs] = useState<Document[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    approved: 0,
    forwarded: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!allowed) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [approvedDocs, pending] = await Promise.all([
        getApprovedDocuments(user?.Department, undefined, user?.User_Id),
        getDocumentsByStatus('Pending', user?.Department, user?.User_Role, user?.User_Id),
      ]);

      // Map admin/status into description to surface in Comment column
      const mappedApproved = (approvedDocs || []).map((d: any) => ({
        ...d,
        description: d.forwarded_by_admin || d.admin || '',
      }));

      setAllDocs(mappedApproved);
      setPendingDocs(pending || []);

      // forwarded: derive by status from approved feed
      const forwarded = (mappedApproved || []).filter((d) => (d.Status || '').toLowerCase() === 'forwarded');
      setForwardedDocs(forwarded);

      setCounts({
        total: mappedApproved.length,
        approved: mappedApproved.length,
        forwarded: forwarded.length,
      });

      // departments not loaded here anymore
    } catch (err: any) {
      console.error('HeadDashboard load error', err);
      toast({ title: 'Error', description: err?.message || 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!allowed) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Head Dashboard</h1>
          <p className="text-muted-foreground">Overview for department/division heads and OICs</p>
        </div>
        <div className="flex gap-2" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Total Documents</p>
          <p className="text-2xl font-bold text-foreground">{counts.total}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Approved Documents</p>
          <p className="text-2xl font-bold text-foreground">{counts.approved}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Forwarded Documents</p>
          <p className="text-2xl font-bold text-foreground">{counts.forwarded}</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold">All Documents</h2>
        <DocumentTable documents={allDocs} showDescription descriptionLabel="Admin" showDate={false} enablePagination pageSizeOptions={[10,20,50]} />
      </div>
    </div>
  );
};

export default HeadDashboard;
