import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRecordedDocuments, createReleaseDocument, getDepartments, getDivisions } from '@/services/api';
import { Document } from '@/types';
import DocumentViewToggle from '@/components/documents/DocumentViewToggle';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type TabValue = 'all' | 'pending' | 'released';

const ReleaserAllDocuments: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [pendingDocuments, setPendingDocuments] = useState<Document[]>([]);
  const [releasedDocuments, setReleasedDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [releaseDialogDoc, setReleaseDialogDoc] = useState<Document | null>(null);
  const [releaseStatus, setReleaseStatus] = useState<'low' | 'medium' | 'high'>('low');
  const [releaseDepts, setReleaseDepts] = useState<string[]>([]);
  const [releaseDivs, setReleaseDivs] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);

  const isReleaser = user && (user.User_Role === 'Releaser' || String(user.pre_assigned_role ?? '').trim().toLowerCase() === 'releaser');

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const allDocs = await getRecordedDocuments(user.Department);
      type RecordedRaw = Document & { approved_admin?: string; approved_comments?: string };
      setAllDocuments((allDocs || []).map((d: RecordedRaw) => ({ ...d, description: d.approved_admin ?? d.approved_comments ?? d.description ?? '' })));
      
      const pending = await getRecordedDocuments(user.Department, 'recorded');
      setPendingDocuments((pending || []).map((d: RecordedRaw) => ({ ...d, description: d.approved_admin ?? d.approved_comments ?? d.description ?? '' })));
      
      const released = await getRecordedDocuments(user.Department, 'released');
      setReleasedDocuments((released || []).map((d: RecordedRaw) => ({ ...d, description: d.approved_admin ?? d.approved_comments ?? d.description ?? '' })));
    } catch (err: unknown) {
      console.error('Releaser all documents load error', err);
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: 'Error', description: message || 'Failed to load documents', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const openRelease = (doc: Document) => {
    setReleaseDialogDoc(doc);
    setReleaseStatus('low');
    // preselect own department
    setReleaseDepts(user?.Department ? [user.Department] : []);
    setReleaseDivs([]);
  };

  const submitRelease = async () => {
    if (!releaseDialogDoc || !releaseDialogDoc.record_doc_id) return;
    if (!releaseDepts || releaseDepts.length === 0) {
      toast({ title: 'Select department', description: 'Please select at least one department to send to', variant: 'destructive' });
      return;
    }
    try {
      setSaving(true);
      await createReleaseDocument(
        releaseDialogDoc.record_doc_id,
        releaseStatus,
        releaseDepts.length > 0 ? releaseDepts : (user?.Department ? [user.Department] : []),
        releaseDivs.length > 0 ? releaseDivs : (user?.Division ? [user.Division] : [])
      );
      toast({ title: 'Document released' });
      setReleaseDialogDoc(null);
      setReleaseDepts([]);
      setReleaseDivs([]);
      await load();
    } catch (err: unknown) {
      console.error('Release record error', err);
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: 'Error', description: message || 'Failed to release document', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const loadDepts = async () => {
      try {
        const depts = await getDepartments();
        setDepartments(depts || []);
      } catch {
        setDepartments([]);
      }
    };
    void loadDepts();
  }, []);

  useEffect(() => {
    const loadDivs = async () => {
      if (!releaseDepts || releaseDepts.length === 0) {
        setDivisions([]);
        setReleaseDivs([]);
        return;
      }
      try {
        const lists = await Promise.all(releaseDepts.map((d) => getDivisions(d)));
        const merged = Array.from(new Set(lists.flat().filter(Boolean)));
        setDivisions(merged);
        if (merged.length > 0) {
          if (releaseDivs.length === 0) {
            const defaultDiv = user?.Division && merged.includes(user.Division) ? user.Division : merged[0];
            setReleaseDivs([defaultDiv]);
          } else {
            setReleaseDivs((prev) => prev.filter((d) => merged.includes(d)));
          }
        }
      } catch {
        setDivisions([]);
        setReleaseDivs([]);
      }
    };
    void loadDivs();
  }, [releaseDepts, releaseDivs.length, user?.Division]);

  const counts = useMemo(() => ({
    all: allDocuments.length,
    pending: pendingDocuments.length,
    released: releasedDocuments.length,
  }), [allDocuments, pendingDocuments, releasedDocuments]);

  const currentDocuments = useMemo(() => {
    switch (activeTab) {
      case 'pending':
        return pendingDocuments;
      case 'released':
        return releasedDocuments;
      default:
        return allDocuments;
    }
  }, [activeTab, allDocuments, pendingDocuments, releasedDocuments]);

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
    <div className="space-y-6 min-h-screen p-6">
      {/* Header */}
      <div className="bg-transparent">
        <h1 className="text-3xl font-bold text-gray-900">Application Review</h1>
        <p className="mt-1 text-gray-600">
          Review and manage business permit applications.
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="w-full">
        <div className="flex items-center justify-between gap-4">
          <TabsList className="bg-card border border-border rounded-lg p-1.5 h-auto gap-1 inline-flex">
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-muted rounded-md px-4 py-2 text-sm font-medium transition-all"
            >
              All ({counts.all})
            </TabsTrigger>
            <TabsTrigger 
              value="pending"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-muted rounded-md px-4 py-2 text-sm font-medium transition-all"
            >
              Pending Release ({counts.pending})
            </TabsTrigger>
            <TabsTrigger 
              value="released"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-muted rounded-md px-4 py-2 text-sm font-medium transition-all"
            >
              Released ({counts.released})
            </TabsTrigger>
          </TabsList>
          <ViewToggle />
        </div>

        {/* Content */}
        <TabsContent value={activeTab} className="mt-4">
          <DocumentViewToggle
            documents={currentDocuments}
            view={viewMode}
            onViewChange={setViewMode}
            renderToggleInHeader={true}
            showDescription
            descriptionLabel="Comment"
            showDate={false}
            enablePagination
            pageSizeOptions={[10, 20, 50]}
            onRelease={activeTab === 'pending' ? (id) => {
              const doc = currentDocuments.find((d) => d.Document_Id === id);
              if (doc) openRelease(doc);
            } : undefined}
            showStatusFilter={false}
            prioritySuffix={(d) => (d as any).approved_comments ? (d as any).approved_comments : undefined}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={!!releaseDialogDoc} onOpenChange={(open) => { if (!open) setReleaseDialogDoc(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release document</DialogTitle>
            <DialogDescription>Set release details before marking as released.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm font-medium">Document</p>
              <p className="text-sm text-muted-foreground">ID #{releaseDialogDoc?.Document_Id} — {releaseDialogDoc?.Type}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="releaseStatus">Status</Label>
              <select
                id="releaseStatus"
                className="w-full rounded-md border bg-background p-2 text-sm"
                value={releaseStatus}
                onChange={(e) => setReleaseStatus(e.target.value as 'low' | 'medium' | 'high')}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="releaseDept">Sent to Department</Label>
              <select
                id="releaseDept"
                className="w-full rounded-md border bg-background p-2 text-sm"
                value={releaseDepts}
                onChange={(e) => setReleaseDepts(Array.from(e.target.selectedOptions, option => option.value))}
                multiple
              >
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="releaseDiv">In Division</Label>
              <select
                id="releaseDiv"
                className="w-full rounded-md border bg-background p-2 text-sm"
                value={releaseDivs}
                onChange={(e) => setReleaseDivs(Array.from(e.target.selectedOptions, option => option.value))}
                multiple
              >
                {divisions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReleaseDialogDoc(null)} disabled={saving}>Cancel</Button>
            <Button onClick={() => void submitRelease()} disabled={saving || !releaseDialogDoc?.record_doc_id}>
              {saving ? 'Releasing…' : 'Release'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReleaserAllDocuments;
