import React from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { Document, RevisionEntry } from '@/types';
import { API_BASE_URL, getRevisions } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Download, ArrowLeft } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

const DocumentViewer: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const params = useParams();
  const doc = (state as any)?.doc as Document | undefined;
  const docId = doc?.Document_Id ?? Number(params.id);

  const [mimeChoice, setMimeChoice] = React.useState<'pdf' | 'word' | 'excel' | 'auto'>('pdf');
  const [fileBytes, setFileBytes] = React.useState<Uint8Array | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState<boolean>(false);
  const [previewError, setPreviewError] = React.useState<string | null>(null);
  const [revisionEntry, setRevisionEntry] = React.useState<RevisionEntry | null>(null);

  const revokePreviewUrl = (url?: string | null) => { if (url) URL.revokeObjectURL(url); };

  const decodePayload = (payload: any): Uint8Array | null => {
    if (!payload) return null;
    try {
      if (typeof payload === 'string') {
        const binary = atob(payload);
        const len = binary.length;
        const arr = new Uint8Array(len);
        for (let i = 0; i < len; i++) arr[i] = binary.charCodeAt(i);
        return arr;
      }
      if (payload?.data) {
        return new Uint8Array(payload.data);
      }
      return null;
    } catch {
      return null;
    }
  };

  const detectMimeChoice = (bytes: Uint8Array): 'pdf' | 'word' | 'excel' | 'auto' => {
    if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'pdf';
    if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
      const sample = new TextDecoder().decode(bytes.slice(0, Math.min(bytes.length, 4096)));
      if (sample.includes('xl/')) return 'excel';
      if (sample.includes('word/')) return 'word';
      return 'word';
    }
    return 'auto';
  };

  const buildPdfPreview = (bytes: Uint8Array) => {
    revokePreviewUrl(previewUrl);
    const buffer = bytes.buffer instanceof ArrayBuffer ? bytes.buffer : new Uint8Array(bytes).buffer;
    const blob = new Blob([buffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    setPreviewError(null);
  };

  const fetchPreviewPdf = async (id: number) => {
    try {
      setPreviewLoading(true);
      revokePreviewUrl(previewUrl);
      const resp = await fetch(`${API_BASE_URL}/documents/${id}/preview`);
      if (!resp.ok) throw new Error(`Preview failed: ${resp.status}`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewError(null);
    } catch (error) {
      console.error('Preview fetch error', error);
      setPreviewUrl(null);
      setPreviewError('Unable to generate a PDF preview for this file. You can still open/download it.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const openDocument = () => {
    if (!fileBytes) return;
    try {
      if (mimeChoice === 'pdf' && previewUrl) {
        window.open(previewUrl, '_blank');
        return;
      }
      const buffer = fileBytes.buffer instanceof ArrayBuffer ? fileBytes.buffer : new Uint8Array(fileBytes).buffer;
      const mime = mimeChoice === 'pdf'
        ? 'application/pdf'
        : mimeChoice === 'word'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : mimeChoice === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/octet-stream';
      const blob = new Blob([buffer], { type: mime });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (error) {
      console.error('Open document error', error);
    }
  };

  React.useEffect(() => {
    return () => revokePreviewUrl(previewUrl);
  }, [previewUrl]);

  React.useEffect(() => {
    const run = async () => {
      if (!docId) return;
      let bytes = doc ? decodePayload((doc as any).Document) : null;
      if (bytes) {
        const detected = detectMimeChoice(bytes);
        setFileBytes(bytes);
        setMimeChoice(detected);
        if (detected === 'pdf') {
          buildPdfPreview(bytes);
        } else {
          if (mimeChoice === 'pdf') await fetchPreviewPdf(docId);
          else setPreviewUrl(null);
        }
      } else {
        setFileBytes(null);
        await fetchPreviewPdf(docId);
      }

      // If in revision status, try to fetch the latest revision comment for this document
      const isRevision = String(doc?.Status || '').toLowerCase() === 'revision';
      if (isRevision) {
        try {
          const revs = await getRevisions();
          const byDoc = revs.filter((r) => r.document_id === docId);
          const latest = byDoc.length ? byDoc[byDoc.length - 1] : null;
          setRevisionEntry(latest);
        } catch (err) {
          console.warn('Failed to load revision entry', err);
          setRevisionEntry(null);
        }
      } else {
        setRevisionEntry(null);
      }
    };
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" onClick={() => navigate(-1)} className="shrink-0"><ArrowLeft className="h-4 w-4" /></Button>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground truncate">{doc?.Type || 'Attachment'}</p>
            <h1 className="text-xl font-semibold truncate">{doc?.sender_name || 'Document'}</h1>
          </div>
          {doc?.Priority && <Badge className="ml-2 shrink-0">{doc.Priority}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Select value={mimeChoice} onValueChange={(v) => setMimeChoice(v as any)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="View as" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="word">Word</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
              <SelectItem value="auto">Auto (detected)</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => openDocument()} disabled={!fileBytes}>
            <ExternalLink className="mr-2 h-4 w-4" /> Open
          </Button>
          <Button onClick={() => openDocument()} disabled={!fileBytes}>
            <Download className="mr-2 h-4 w-4" /> Download
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 rounded-xl border overflow-hidden bg-card shadow-card">
        <div className="md:col-span-8 bg-background">
          {revisionEntry && (
            <div className="border-b bg-muted/30 px-4 py-3">
              <p className="text-sm font-medium text-foreground">Revision Comment</p>
              <p className="text-xs text-muted-foreground mt-1">{revisionEntry.admin ? `By ${revisionEntry.admin}` : ''}</p>
              <p className="mt-2 text-sm text-foreground/90 break-words">{revisionEntry.comment || '—'}</p>
            </div>
          )}
          {previewLoading ? (
            <div className="flex h-[75vh] items-center justify-center">
              <div className="animate-pulse rounded-md border bg-muted/30 w-[92%] h-[65vh]" />
            </div>
          ) : previewUrl ? (
            <iframe title="Attachment preview" src={previewUrl} className="h-[75vh] w-full" />
          ) : (
            <div className="flex h-[75vh] items-center justify-center text-sm text-muted-foreground text-center px-6">
              {previewError
                ? previewError
                : 'Preview will be generated as PDF when available. For Word or Excel files, we convert a temporary PDF preview.'}
            </div>
          )}
        </div>
        <div className="md:col-span-4 border-l bg-muted/30 p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Details</p>
          <div className="text-sm text-muted-foreground space-y-1">
            <div><span className="font-medium text-foreground">Type:</span> {doc?.Type || '—'}</div>
            <div><span className="font-medium text-foreground">Sender:</span> {doc?.sender_name || '—'}</div>
            <div><span className="font-medium text-foreground">Priority:</span> {doc?.Priority || '—'}</div>
            <div><span className="font-medium text-foreground">Status:</span> {doc?.Status || '—'}</div>
            <div><span className="font-medium text-foreground">Date:</span> {formatDateTime(doc?.created_at)}</div>
            {doc?.description && (
              <div className="mt-2">
                <span className="font-medium text-foreground">Notes:</span>
                <p className="mt-1 text-xs text-foreground/80 break-words">{doc.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
