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
import { MessageSquare } from 'lucide-react';

interface TrackDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document | null;
}

const TrackDocumentDialog: React.FC<TrackDocumentDialogProps> = ({ open, onOpenChange, document }) => {
  const [trackData, setTrackData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showResponses, setShowResponses] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (!document) {
          setTrackData(null);
          return;
        }
        const data = await getDocumentTrack(document.Document_Id);
        setTrackData(data || null);
      } catch (err) {
        console.error('Failed to load track data', err);
        setTrackData(null);
      } finally {
        setLoading(false);
      }
    };

    if (open) load();
  }, [open, document]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Track Document</DialogTitle>
          <DialogDescription>
            Shows the current stage (Admin / Division Head / Recorder / Releaser / Target Department) and release history for this document.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {loading ? (
            <div className="text-muted-foreground">Loading tracking information...</div>
          ) : !trackData ? (
            <div className="rounded-lg bg-muted p-3 text-sm">No tracking information found for this document.</div>
          ) : (() => {
            const { sender, approved, record, releases, responses, stages, currentStage, latestRelease } = trackData;

            // If document is still pending at admin and no release history, show minimal message (do not show table)
            if ((String(sender?.status || '').toLowerCase() === 'pending') && (!releases || releases.length === 0) && !approved) {
              return (
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <p className="text-sm"><strong>Current Location:</strong> Pending Admin office</p>
                  <p className="text-muted-foreground text-xs">Status: Pending</p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {/* Stages */}
                <div className="space-y-2">
                  {stages.map((s: any) => (
                    <div
                      key={s.key}
                      className={`p-3 rounded-lg border ${s.done ? 'bg-success/5' : ''} ${currentStage === s.key && !s.done ? 'ring-2 ring-primary/30' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${s.done ? 'bg-success text-white' : currentStage === s.key ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                            {s.done ? '✓' : currentStage === s.key ? '•' : '○'}
                          </div>
                          <div>
                            <div className="font-medium">{s.title}</div>
                            <div className="text-sm text-muted-foreground">{s.description}</div>
                          </div>
                        </div>
                        {s.status ? (
                          <div className="text-sm text-muted-foreground">{s.status}</div>
                        ) : null}
                      </div>
                    </div>
                  ))}
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
                        <div className="flex justify-end">
                          <Button onClick={() => setShowResponses(true)} variant="outline">
                            View Responses
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
                      <div className="rounded-lg bg-warning/5 p-3 text-sm">
                        <p className="text-sm"><strong>Current Location:</strong> Target Department/Division</p>
                        <p className="text-muted-foreground text-xs">Request is being processed by {dept} / {div}</p>
                      </div>
                    );
                  }
                  
                  // If recorder marked as released but no release record yet
                  if (record && String(record.status || '').toLowerCase() === 'released' && releases.length === 0) {
                    return (
                      <div className="rounded-lg bg-warning/5 p-3 text-sm">
                        <p className="text-sm"><strong>Current Location:</strong> Releaser</p>
                        <p className="text-muted-foreground text-xs">Status: Waiting to be released</p>
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Document Responses
            </DialogTitle>
            <DialogDescription>
              Responses from the target department for this document.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {!trackData || !trackData.responses || trackData.responses.length === 0 ? (
              <div className="rounded-lg bg-muted p-3 text-sm text-center text-muted-foreground">
                No responses available yet.
              </div>
            ) : (
              <div className="space-y-3">
                {trackData.responses.map((response: any, index: number) => (
                  <div key={response.respond_doc_id || index} className="rounded-lg border p-4 space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <strong className="min-w-[120px] text-sm">Respond from:</strong>
                        <span className="text-sm">{response.full_name || '—'}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <strong className="min-w-[120px] text-sm">Department:</strong>
                        <span className="text-sm">{response.department || '—'}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <strong className="min-w-[120px] text-sm">Division:</strong>
                        <span className="text-sm">{response.division || '—'}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <strong className="min-w-[120px] text-sm">Status:</strong>
                        <span className={`px-2 py-1 rounded text-xs font-medium inline-block ${
                          String(response.status || '').toLowerCase() === 'actioned' 
                            ? 'bg-success/10 text-success' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {response.status || '—'}
                        </span>
                      </div>
                      <div className="flex items-start gap-2 pt-2 border-t">
                        <strong className="min-w-[120px] text-sm">Comment:</strong>
                        <span className="text-sm text-muted-foreground whitespace-pre-wrap flex-1">{response.comment || 'No comment provided.'}</span>
                      </div>
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
