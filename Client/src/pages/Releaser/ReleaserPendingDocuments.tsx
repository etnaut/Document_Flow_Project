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
import { Input } from '@/components/ui/input';

const ReleaserPendingDocuments: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [releaseDialogDoc, setReleaseDialogDoc] = useState<Document | null>(null);
  const [releaseStatus, setReleaseStatus] = useState<'low' | 'medium' | 'high'>('low');
  const [releaseDept, setReleaseDept] = useState<string>('');
  const [releaseDiv, setReleaseDiv] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);

  const isReleaser = user && (user.User_Role === 'Releaser' || String(user.pre_assigned_role ?? '').trim().toLowerCase() === 'releaser');

  const load = async () => {
    if (!user) return;
    try {
      setLoading(true);
  const data = await getRecordedDocuments(user.Department, 'recorded');
  setDocuments(data || []);
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
      if (!releaseDept) {
        setDivisions([]);
        setReleaseDiv('');
        return;
      }
      try {
        const divs = await getDivisions(releaseDept);
        setDivisions(divs || []);
        if (divs && divs.length > 0 && !divs.includes(releaseDiv)) {
          setReleaseDiv(divs[0]);
        }
      } catch {
        setDivisions([]);
      }
    };
    void loadDivs();
  }, [releaseDept]);

  const openRelease = (doc: Document) => {
    setReleaseDialogDoc(doc);
    setReleaseStatus('low');
    setReleaseDept('');
    setReleaseDiv('');
  };

  const submitRelease = async () => {
    if (!releaseDialogDoc || !releaseDialogDoc.record_doc_id) return;
    try {
      setSaving(true);
      await createReleaseDocument(
        releaseDialogDoc.record_doc_id,
        releaseStatus,
        releaseDept || '',
        releaseDiv || ''
      );
      toast({ title: 'Document released' });
      setReleaseDialogDoc(null);
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
        descriptionLabel="Comment"
        showDate={false}
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
                className="w-full rounded-md border bg-background p-2 text-sm"
                value={releaseDept}
                onChange={(e) => setReleaseDept(e.target.value)}
              >
                <option value="">Select department</option>
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
                value={releaseDiv}
                onChange={(e) => setReleaseDiv(e.target.value)}
              >
                <option value="">Select division</option>
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

export default ReleaserPendingDocuments;
