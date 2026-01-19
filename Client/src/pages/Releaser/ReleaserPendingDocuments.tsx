import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRecordedDocuments, createReleaseDocument, getDepartments, getDivisions } from '@/services/api';
import { Document } from '@/types';
import DocumentTable from '@/components/documents/DocumentTable';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const ReleaserPendingDocuments: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [releaseDialogDoc, setReleaseDialogDoc] = useState<Document | null>(null);
  const [releaseStatus, setReleaseStatus] = useState<'low' | 'medium' | 'high'>('low');
  const [releaseDepts, setReleaseDepts] = useState<string[]>([]);
  const [releaseDivs, setReleaseDivs] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);

  const isReleaser = user && (user.User_Role === 'Releaser' || String(user.pre_assigned_role ?? '').trim().toLowerCase() === 'releaser');

  const load = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await getRecordedDocuments(user.Department, 'recorded');
      const mapped = (data || []).map((d) => ({
        ...d,
        description: (d as any).approved_admin || (d as any).approved_comments || d.description || '',
      }));
      setDocuments(mapped);
    } catch (err: any) {
      console.error('Releaser pending load error', err);
      toast({ title: 'Error', description: err?.message || 'Failed to load documents', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [user]);

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
        // If user division is available and in list, preselect it otherwise keep prior selections that still exist
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
  }, [releaseDepts]);

  const openRelease = (doc: Document) => {
    setReleaseDialogDoc(doc);
    setReleaseStatus('low');
    // Preselect own department for convenience
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
        releaseDepts,
        releaseDivs
      );
      toast({ title: 'Document released' });
      setReleaseDialogDoc(null);
      setReleaseDepts([]);
      setReleaseDivs([]);
      await load();
    } catch (err: any) {
      console.error('Release error', err);
      toast({ title: 'Error', description: err?.message || 'Failed to release document', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Pending Release</h1>
            <p className="text-muted-foreground">Approved documents awaiting release for {user.Department}.</p>
          </div>
        </div>
        <Button onClick={() => void load()} variant="outline">Refresh</Button>
      </div>

      <DocumentTable
        documents={documents}
        onRelease={(id) => {
          const doc = documents.find((d) => d.Document_Id === id);
          if (doc) openRelease(doc);
        }}
        showDescription
        descriptionLabel="Admin"
        showDate={false}
        showStatusFilter={false}
        enablePagination
        pageSizeOptions={[10, 20, 50]}
      />

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
                multiple
                size={Math.min(8, Math.max(3, departments.length))}
                className="w-full rounded-md border bg-background p-2 text-sm"
                value={releaseDepts}
                onChange={(e) => setReleaseDepts(Array.from(e.target.selectedOptions).map((o) => o.value))}
              >
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Select one or more departments (hold Ctrl/Cmd to select multiple).</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="releaseDiv">In Division</Label>
              <select
                id="releaseDiv"
                multiple
                size={Math.min(8, Math.max(3, divisions.length))}
                className="w-full rounded-md border bg-background p-2 text-sm"
                value={releaseDivs}
                onChange={(e) => setReleaseDivs(Array.from(e.target.selectedOptions).map((o) => o.value))}
                disabled={divisions.length === 0}
              >
                {divisions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Optionally select one or more divisions. Leave empty to send to department-level only.</p>
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

export default ReleaserPendingDocuments;
