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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDocumentTrack } from '@/services/api';
import {
  FileText,
  User,
  CheckCircle2,
  Clock,
  Archive,
  Send,
  ArrowRight,
  MapPin,
  Calendar,
  Building2,
  Users,
} from 'lucide-react';

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

  const getStageIcon = (stageKey: string) => {
    switch (stageKey) {
      case 'sender':
        return FileText;
      case 'admin':
        return User;
      case 'division':
        return Users;
      case 'recorder':
        return Archive;
      case 'releaser':
        return Send;
      default:
        return Clock;
    }
  };

  const getStageColor = (stage: any, currentStage: string) => {
    if (stage.done) {
      return 'text-success border-success bg-success/10';
    }
    if (currentStage === stage.key) {
      return 'text-primary border-primary bg-primary/10';
    }
    return 'text-muted-foreground border-muted bg-muted/30';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Track Document
          </DialogTitle>
          <DialogDescription className="text-base">
            Real-time tracking of your document through the approval and release workflow
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">Loading tracking information...</p>
            </div>
          ) : !trackData ? (
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">No tracking information found</p>
                  <p className="text-xs text-muted-foreground">This document may not have entered the tracking system yet.</p>
                </div>
              </CardContent>
            </Card>
          ) : (() => {
            const { sender, approved, record, releases, stages, currentStage, latestRelease } = trackData;

            // If document is still pending at admin and no release history, show minimal message
            if ((String(sender?.status || '').toLowerCase() === 'pending') && (!releases || releases.length === 0) && !approved) {
              return (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="rounded-full bg-primary/10 p-3">
                        <Clock className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-foreground">Current Location</h3>
                          <Badge variant="pending">Pending</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Document is pending review at Admin office</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return (
              <div className="space-y-6">
                {/* Document Info Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Document Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Document ID</p>
                        <p className="font-medium">#{document?.Document_Id}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Type</p>
                        <p className="font-medium">{document?.Type || '—'}</p>
                      </div>
                      {sender?.sender_department && (
                        <div>
                          <p className="text-muted-foreground mb-1">From Department</p>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium">{sender.sender_department}</p>
                          </div>
                        </div>
                      )}
                      {sender?.sender_division && (
                        <div>
                          <p className="text-muted-foreground mb-1">From Division</p>
                          <p className="font-medium">{sender.sender_division}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Timeline/Stages */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Workflow Timeline</CardTitle>
                    <CardDescription>Track the document's journey through each stage</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {stages.map((s: any, index: number) => {
                        const Icon = getStageIcon(s.key);
                        const isActive = currentStage === s.key && !s.done;
                        const isCompleted = s.done;
                        const isPending = !s.done && currentStage !== s.key;

                        return (
                          <div key={s.key} className="relative">
                            {/* Connector Line */}
                            {index < stages.length - 1 && (
                              <div
                                className={`absolute left-6 top-12 w-0.5 h-full ${
                                  isCompleted ? 'bg-success' : 'bg-muted'
                                }`}
                                style={{ height: 'calc(100% + 1rem)' }}
                              />
                            )}

                            <div
                              className={`relative flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                                isCompleted
                                  ? 'bg-success/5 border-success/30'
                                  : isActive
                                  ? 'bg-primary/5 border-primary shadow-md ring-2 ring-primary/20'
                                  : 'bg-muted/30 border-muted'
                              }`}
                            >
                              {/* Icon Circle */}
                              <div
                                className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                                  isCompleted
                                    ? 'bg-success text-white border-success'
                                    : isActive
                                    ? 'bg-primary text-white border-primary animate-pulse'
                                    : 'bg-muted text-muted-foreground border-muted'
                                }`}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 className="h-6 w-6" />
                                ) : (
                                  <Icon className="h-5 w-5" />
                                )}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <h3 className="font-semibold text-base">{s.title}</h3>
                                  {isCompleted && (
                                    <Badge variant="success" className="text-xs">
                                      Completed
                                    </Badge>
                                  )}
                                  {isActive && (
                                    <Badge variant="pending" className="text-xs animate-pulse">
                                      In Progress
                                    </Badge>
                                  )}
                                  {isPending && (
                                    <Badge variant="secondary" className="text-xs">
                                      Pending
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{s.description}</p>
                                {s.status && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <Calendar className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-muted-foreground">{s.status}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Release History */}
                {(() => {
                  const doneReleases = (releases || []).filter(
                    (r: any) => String(r.mark || '').toLowerCase() === 'done'
                  );
                  const notDone = (releases || []).filter(
                    (r: any) => String(r.mark || '').toLowerCase() === 'not_done'
                  );

                  if (doneReleases.length > 0) {
                    const latestDone = doneReleases[0];
                    return (
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Send className="h-5 w-5" />
                                Release History
                              </CardTitle>
                              <CardDescription className="mt-1">
                                Current location: {latestDone.department || '—'} / {latestDone.division || '—'}
                              </CardDescription>
                            </div>
                            <Badge variant="success" className="text-xs">
                              {doneReleases.length} Release{doneReleases.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {doneReleases.map((t: any, idx: number) => (
                              <div
                                key={`${t.record_doc_id}-${t.approved_doc_id}-${t.document_id}`}
                                className={`p-4 rounded-lg border ${
                                  idx === 0
                                    ? 'bg-primary/5 border-primary/30'
                                    : 'bg-muted/30 border-muted'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <p className="text-muted-foreground mb-1 text-xs">Record ID</p>
                                      <p className="font-medium">#{t.record_doc_id}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground mb-1 text-xs">Status</p>
                                      <Badge
                                        variant={t.status === 'released' ? 'success' : 'secondary'}
                                        className="text-xs"
                                      >
                                        {t.status || '—'}
                                      </Badge>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground mb-1 text-xs flex items-center gap-1">
                                        <Building2 className="h-3 w-3" />
                                        Department
                                      </p>
                                      <p className="font-medium">{t.department || '—'}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground mb-1 text-xs">Division</p>
                                      <p className="font-medium">{t.division || '—'}</p>
                                    </div>
                                  </div>
                                  {idx === 0 && (
                                    <Badge variant="default" className="shrink-0">
                                      Latest
                                    </Badge>
                                  )}
                                </div>
                                {t.mark && (
                                  <div className="mt-3 pt-3 border-t">
                                    <p className="text-xs text-muted-foreground mb-1">Mark</p>
                                    <Badge variant="outline" className="text-xs">
                                      {t.mark}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }

                  // In-progress releases
                  if (notDone.length > 0 || (record && String(record.status || '').toLowerCase() === 'released')) {
                    const r = notDone[0] || null;
                    const dept = r?.department || latestRelease?.department || sender?.sender_department || '—';
                    const div = r?.division || latestRelease?.division || sender?.sender_division || '—';
                    return (
                      <Card className="border-warning/30 bg-warning/5">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <div className="rounded-full bg-warning/10 p-3">
                              <Clock className="h-6 w-6 text-warning" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-foreground">Current Location</h3>
                                <Badge variant="warning">In Progress</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">
                                Document is at the Releaser stage
                              </p>
                              <div className="flex items-center gap-2 mt-2 text-sm">
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  Awaiting release to <span className="font-medium text-foreground">{dept}</span> /{' '}
                                  <span className="font-medium text-foreground">{div}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
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
