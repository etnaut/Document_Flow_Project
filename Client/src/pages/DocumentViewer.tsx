import React from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { Document, RevisionEntry } from '@/types';
import { API_BASE_URL, getRevisions } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Menu,
  X
} from 'lucide-react';
import { formatDateTime, cn } from '@/lib/utils';

const DocumentViewer: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const params = useParams();
  const { user } = useAuth();
  const doc = (state as any)?.doc as Document | undefined;
  const initialDocId = doc?.Document_Id ?? Number(params.id);

  const [selectedDoc, setSelectedDoc] = React.useState<Document | null>(doc || null);
  const [fileBytes, setFileBytes] = React.useState<Uint8Array | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState<boolean>(false);
  const [previewError, setPreviewError] = React.useState<string | null>(null);
  const [revisionEntry, setRevisionEntry] = React.useState<RevisionEntry | null>(null);
  const [isDetailsCollapsed, setIsDetailsCollapsed] = React.useState<boolean>(false);
  
  // Responsive: make details collapsible on small screens
  React.useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setIsDetailsCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const loadDocument = async (doc: Document) => {
    setSelectedDoc(doc);
    
    const docId = doc.Document_Id;
    let bytes = decodePayload((doc as any).Document);
    
      if (bytes) {
        const detected = detectMimeChoice(bytes);
        setFileBytes(bytes);
        if (detected === 'pdf') {
          buildPdfPreview(bytes);
        } else {
          await fetchPreviewPdf(docId);
        }
      } else {
        setFileBytes(null);
        await fetchPreviewPdf(docId);
      }

    // Load revision entry if status is revision
    const isRevision = String(doc.Status || '').toLowerCase() === 'revision';
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


  const getPriorityColor = (priority?: string) => {
    const p = (priority || '').toLowerCase();
    if (p === 'high') return 'bg-red-600 text-white';
    if (p === 'medium' || p === 'moderate') return 'bg-yellow-600 text-white';
    if (p === 'low') return 'bg-green-600 text-white';
    return 'bg-gray-600 text-white';
  };

  // Load the document if we have one from props/params
  React.useEffect(() => {
    if (doc && !selectedDoc) {
      setSelectedDoc(doc);
    }
  }, [doc]);

  // Load selected document when it changes
  React.useEffect(() => {
    if (selectedDoc) {
      void loadDocument(selectedDoc);
    }
  }, [selectedDoc?.Document_Id]);

  React.useEffect(() => {
    return () => revokePreviewUrl(previewUrl);
  }, [previewUrl]);

  // Prevent horizontal scrollbars while viewing a document (PDF iframe toolbars can overflow)
  React.useEffect(() => {
    const prevBody = document.body.style.overflowX;
    const prevHtml = document.documentElement.style.overflowX;
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
    return () => {
      document.body.style.overflowX = prevBody;
      document.documentElement.style.overflowX = prevHtml;
    };
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden overflow-x-hidden flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Details Panel - Top */}
      {!isDetailsCollapsed && selectedDoc && (
        <div className="border-b border-gray-200 shrink-0">
          <div className="bg-white p-4 w-full max-w-[1280px] mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#8C1D18]">Details</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsDetailsCollapsed(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-5 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type</label>
                <p className="text-sm text-gray-900 mt-1">{selectedDoc.Type || '—'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sender</label>
                <p className="text-sm text-gray-900 mt-1">{selectedDoc.sender_name || '—'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Priority</label>
                <div className="mt-1">
                  {selectedDoc.Priority ? (
                    <Badge className={cn("text-xs", getPriorityColor(selectedDoc.Priority))}>
                      {selectedDoc.Priority}
                    </Badge>
                  ) : (
                    <span className="text-sm text-gray-900">—</span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
                <p className="text-sm text-gray-900 mt-1">{selectedDoc.Status || '—'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date</label>
                <p className="text-sm text-gray-900 mt-1">{formatDateTime(selectedDoc.created_at)}</p>
              </div>
            </div>
            {selectedDoc.description && (
              <div className="mt-4">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">Notes</label>
                <p className="text-sm text-gray-900">{selectedDoc.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {isDetailsCollapsed && (
        <div className="border-b border-gray-200 shrink-0 p-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => setIsDetailsCollapsed(false)}
          >
            <Menu className="h-4 w-4 mr-2" /> Show Details
          </Button>
        </div>
      )}

      {/* Document Viewer - Full Width */}
      <div className="flex-1 flex overflow-hidden" style={{ height: isDetailsCollapsed ? 'calc(100vh)' : 'calc(100vh - 200px)' }}>
        {/* PDF Preview Canvas */}
        <div 
          className="flex items-center justify-center overflow-hidden w-full" 
          style={{ 
            height: '100%', 
            width: '100%',
            position: 'relative'
          }}
        >
            <div className="w-full h-full max-w-[1280px] mx-auto overflow-hidden">
            {previewLoading ? (
              <div className="w-full h-full animate-pulse bg-white" style={{ height: '100%' }} />
            ) : previewUrl ? (
              <iframe 
                title="PDF preview" 
                src={previewUrl} 
                className="border-0"
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  overflow: 'hidden',
                  display: 'block'
                }}
                scrolling="no"
              />
            ) : (
              <div className="text-center text-gray-500 p-8">
                <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">
                  {previewError || 'Document preview will appear here'}
                </p>
              </div>
            )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;