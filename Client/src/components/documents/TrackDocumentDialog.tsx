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

interface TrackDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document | null;
}

const TrackDocumentDialog: React.FC<TrackDocumentDialogProps> = ({ open, onOpenChange, document }) => {
  const [trackData, setTrackData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

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
            Shows the current stage (Admin / Division Head / Recorder / Releaser) and release history for this document.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {loading ? (
            <div className="text-muted-foreground">Loading tracking information...</div>
          ) : !trackData ? (
            <div className="rounded-lg bg-muted p-3 text-sm">No tracking information found for this document.</div>
          ) : (() => {
            const { sender, approved, record, releases, stages, currentStage, latestRelease } = trackData;

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

                  if (doneReleases.length > 0) {
                    // Show table only for completed releases
                    const latestDone = doneReleases[0];
                    return (
                      <div className="rounded-lg border bg-card shadow-card overflow-hidden">
                        <div className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">Release History</div>
                            <div className="text-sm text-muted-foreground">Current: {latestDone.department || '—'} / {latestDone.division || '—'} • Mark: {latestDone.mark ?? latestDone.status ?? '—'}</div>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="px-4 py-2 text-left font-semibold">Record ID</th>
                                <th className="px-4 py-2 text-left font-semibold">Department</th>
                                <th className="px-4 py-2 text-left font-semibold">Division</th>
                                <th className="px-4 py-2 text-left font-semibold">Status</th>
                                { /* mark column might not exist on some schemas */ }
                                <th className="px-4 py-2 text-left font-semibold">Mark</th>
                              </tr>
                            </thead>
                            <tbody>
                              {doneReleases.map((t: any) => (
                                <tr key={`${t.record_doc_id}-${t.approved_doc_id}-${t.document_id}`} className="border-t">
                                  <td className="px-4 py-2">{t.record_doc_id}</td>
                                  <td className="px-4 py-2">{t.department || '—'}</td>
                                  <td className="px-4 py-2">{t.division || '—'}</td>
                                  <td className="px-4 py-2">{t.status || '—'}</td>
                                  <td className="px-4 py-2">{t.mark ?? '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  }

                  // If there are in-progress releases (not_done) or the recorder marked released but no completed release yet, show a small in-progress card
                  if (notDone.length > 0 || (record && String(record.status || '').toLowerCase() === 'released')) {
                    const r = notDone[0] || null;
                    const dept = r?.department || latestRelease?.department || sender?.sender_department || '—';
                    const div = r?.division || latestRelease?.division || sender?.sender_division || '—';
                    return (
                      <div className="rounded-lg bg-warning/5 p-3 text-sm">
                        <p className="text-sm"><strong>Current Location:</strong> Releaser</p>
                        <p className="text-muted-foreground text-xs">Status: Waiting to be released to {dept} / {div}</p>
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
    </Dialog>
  );
};

export default TrackDocumentDialog;
