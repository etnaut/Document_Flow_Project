import React, { useEffect, useState } from 'react';
import { Document } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getDocumentTrack } from '@/services/api';
import { MessageSquare, CheckCircle2, Circle, Loader2, Clock, Package, Send, FileCheck, Building2 } from 'lucide-react';

interface TrackDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: Document | null;
}

const TrackDocumentDialog: React.FC<TrackDocumentDialogProps> = ({ open, onOpenChange, doc }) => {
  const [trackData, setTrackData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showResponses, setShowResponses] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setMounted(false);
      try {
        if (!doc) {
          setTrackData(null);
          return;
        }
        const data = await getDocumentTrack(doc.Document_Id);
        setTrackData(data || null);
        // Small delay to trigger animation
        setTimeout(() => setMounted(true), 100);
      } catch (err) {
        console.error('Failed to load track data', err);
        setTrackData(null);
      } finally {
        setLoading(false);
        setTimeout(() => setMounted(true), 100);
      }
    };

    if (open) {
      load();
    } else {
      setMounted(false);
    }
  }, [open, doc]);

  const getStageIcon = (stageKey: string, done: boolean, isCurrent: boolean) => {
    if (done) return <CheckCircle2 className="h-5 w-5" />;
    if (isCurrent) return <Loader2 className="h-5 w-5 animate-spin" />;
    return <Circle className="h-5 w-5" />;
  };

  const getStageIconComponent = (stageKey: string) => {
    const icons: Record<string, React.ReactNode> = {
      sender: <Send className="h-4 w-4" />,
      admin: <FileCheck className="h-4 w-4" />,
      head: <Building2 className="h-4 w-4" />,
      recorder: <Package className="h-4 w-4" />,
      releaser: <Send className="h-4 w-4" />,
      target: <Building2 className="h-4 w-4" />,
    };
    return icons[stageKey] || <Circle className="h-4 w-4" />;
  };

  const openBase64File = (base64: string, filename?: string, mime?: string) => {
    try {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mime || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      // If the browser can preview the MIME type, open in new tab; otherwise force download
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      if (filename) a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error('Failed to open file', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Track Document
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Monitor the current stage and progress of your document through the workflow.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg border bg-muted/50">
                  <div className="w-12 h-12 rounded-full bg-muted animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
                    <div className="h-3 bg-muted rounded w-1/2 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : !trackData ? (
            <div className="rounded-lg bg-muted/50 border border-dashed p-6 text-center animate-fade-in">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No tracking information found for this document.</p>
            </div>
          ) : (() => {
            const { sender, approved, record, releases, responses, stages, currentStage, latestRelease } = trackData;

            // If document is still pending at admin and no release history, show minimal message (do not show table)
            if ((String(sender?.status || '').toLowerCase() === 'pending') && (!releases || releases.length === 0) && !approved) {
              return (
                <div className="rounded-lg bg-gradient-to-br from-muted/50 to-muted/30 border border-dashed p-6 text-center animate-fade-in">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3 animate-pulse" />
                  <p className="text-sm font-medium mb-1"><strong>Current Location:</strong> Pending Admin office</p>
                  <p className="text-muted-foreground text-xs">Status: Pending Review</p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {/* Stages */}
                <div className="space-y-3">
                  {stages.map((s: any, index: number) => {
                    const isDone = s.done;
                    const isCurrent = currentStage === s.key && !s.done;
                    const isPending = !isDone && !isCurrent;
                    
                    return (
                      <div
                        key={s.key}
                        className={`group relative overflow-hidden rounded-xl border-2 transition-all duration-500 ease-out ${
                          isDone 
                            ? 'bg-gradient-to-r from-success/10 via-success/5 to-transparent border-success/30 shadow-sm' 
                            : isCurrent 
                            ? 'bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/50 shadow-lg ring-2 ring-primary/20 animate-pulse-subtle' 
                            : 'bg-muted/30 border-muted/50 hover:border-muted/70'
                        } ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}
                        style={{
                          animationDelay: `${index * 100}ms`,
                          animationFillMode: 'both',
                        }}
                      >
                        {/* Progress bar indicator */}
                        {isCurrent && (
                          <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-primary via-primary/70 to-transparent animate-progress-bar"></div>
                        )}
                        
                        <div className="p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1">
                              {/* Icon Circle */}
                              <div className={`relative flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                                isDone 
                                  ? 'bg-success text-white shadow-lg shadow-success/30 scale-110' 
                                  : isCurrent 
                                  ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110 animate-pulse-subtle' 
                                  : 'bg-muted text-muted-foreground scale-100'
                              }`}>
                                {getStageIcon(s.key, isDone, isCurrent)}
                                {isDone && (
                                  <div className="absolute inset-0 rounded-full bg-success animate-ping opacity-20"></div>
                                )}
                              </div>
                              
                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className={`font-semibold text-base transition-colors ${
                                    isDone ? 'text-success' : isCurrent ? 'text-primary' : 'text-foreground'
                                  }`}>
                                    {s.title}
                                  </div>
                                  {isCurrent && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full animate-fade-in">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  {getStageIconComponent(s.key)}
                                  <span>{s.description}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Status Badge */}
                            {s.status && (
                              <div className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                                isDone 
                                  ? 'bg-success/10 text-success' 
                                  : isCurrent 
                                  ? 'bg-primary/10 text-primary' 
                                  : 'bg-muted text-muted-foreground'
                              }`}>
                                {s.status}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Release history (if any) */}
                {(() => {
                  const doneReleases = (releases || []).filter((r: any) => String(r.mark || '').toLowerCase() === 'done');
                  const notDone = (releases || []).filter((r: any) => String(r.mark || '').toLowerCase() === 'not_done');
                  const anyDoneRelease = doneReleases.length > 0;

                  if (doneReleases.length > 0) {
                    // Only show button when target stage is done (mark='done' means target department completed)
                    const targetStage = stages?.find((s: any) => s.key === 'target');
                    const isTargetDone = targetStage?.done || anyDoneRelease;
                    
                    if (isTargetDone) {
                      return (
                        <div className="flex justify-end pt-2 animate-fade-in">
                          <Button 
                            onClick={() => setShowResponses(true)} 
                            variant="outline"
                            className="group relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-md"
                          >
                            <span className="relative z-10 flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 transition-transform group-hover:scale-110" />
                              View Responses
                            </span>
                          </Button>
                        </div>
                      );
                    }
                  }

                  // If there are in-progress releases (not_done), show that the target department is processing
                  if (notDone.length > 0) {
                    const r = notDone[0] || latestRelease || null;
                    const dept = r?.department || sender?.sender_department || 'target department';
                    const div = r?.division || sender?.sender_division || 'target division';
                    
                    return (
                      <div className="rounded-xl bg-gradient-to-r from-warning/10 via-warning/5 to-transparent border-2 border-warning/30 p-4 animate-fade-in">
                        <div className="flex items-start gap-3">
                          <Loader2 className="h-5 w-5 text-warning animate-spin flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold mb-1"><strong>Current Location:</strong> Target Department/Division</p>
                            <p className="text-muted-foreground text-xs">Request is being processed by <span className="font-medium">{dept}</span> / <span className="font-medium">{div}</span></p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  // If recorder marked as released but no release record yet
                  if (record && String(record.status || '').toLowerCase() === 'released' && releases.length === 0) {
                    return (
                      <div className="rounded-xl bg-gradient-to-r from-warning/10 via-warning/5 to-transparent border-2 border-warning/30 p-4 animate-fade-in">
                        <div className="flex items-start gap-3">
                          <Clock className="h-5 w-5 text-warning flex-shrink-0 mt-0.5 animate-pulse" />
                          <div>
                            <p className="text-sm font-semibold mb-1"><strong>Current Location:</strong> Releaser</p>
                            <p className="text-muted-foreground text-xs">Status: Waiting to be released</p>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })()}
              </div>
            );
          })()}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Responses Dialog */}
      <Dialog open={showResponses} onOpenChange={setShowResponses}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <MessageSquare className="h-5 w-5 text-primary animate-bounce-subtle" />
              Document Responses
            </DialogTitle>
            <DialogDescription>
              Responses from the target department for this document.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {!trackData || !trackData.responses || trackData.responses.length === 0 ? (
              <div className="rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-dashed p-6 text-center animate-fade-in">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground">No responses available yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {trackData.responses.map((response: any, index: number) => (
                  <div 
                    key={response.respond_doc_id || index} 
                    className="group rounded-xl border-2 border-muted/50 bg-gradient-to-br from-card to-muted/20 p-5 space-y-4 transition-all duration-500 hover:border-primary/30 hover:shadow-lg animate-fade-in-up"
                    style={{
                      animationDelay: `${index * 100}ms`,
                      animationFillMode: 'both',
                    }}
                  >
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs text-muted-foreground mb-0.5">Respond from</div>
                            <div className="text-sm font-medium">{response.full_name || '—'}</div>
                            <div className="text-xs text-muted-foreground">User ID: {response.user_id ?? '—'}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs text-muted-foreground mb-0.5">Department</div>
                            <div className="text-sm font-medium">{response.department || '—'}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs text-muted-foreground mb-0.5">Division</div>
                            <div className="text-sm font-medium">{response.division || '—'}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                          <CheckCircle2 className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs text-muted-foreground mb-0.5">Status</div>
                            <span className={`px-2.5 py-1 rounded-md text-xs font-semibold inline-block transition-all duration-300 ${
                              String(response.status || '').toLowerCase() === 'actioned' 
                                ? 'bg-success/20 text-success border border-success/30' 
                                : 'bg-muted text-muted-foreground border border-muted'
                            }`}>
                              {response.status || '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-muted/50">
                        <div className="flex items-start gap-3">
                          <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                          <div className="flex-1">
                            <div className="text-xs text-muted-foreground mb-2 font-medium">Comment</div>
                            <div className="text-sm text-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-3 border border-muted/50">
                              {response.comment || 'No comment provided.'}
                            </div>
                          </div>
                        </div>
                      </div>
                      {response.document && (
                        <div className="pt-3 border-t border-muted/50">
                          <div className="flex items-start gap-3">
                            <FileCheck className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                            <div>
                              <div className="text-xs text-muted-foreground mb-2 font-medium">Attachment</div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-foreground">{response.document_name || 'Attached file'}</span>
                                <Button size="sm" variant="ghost" onClick={() => openBase64File(response.document, response.document_name, response.mime)}>View</Button>
                                <Button size="sm" variant="outline" onClick={() => openBase64File(response.document, response.document_name, response.mime)}>Download</Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResponses(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default TrackDocumentDialog;
