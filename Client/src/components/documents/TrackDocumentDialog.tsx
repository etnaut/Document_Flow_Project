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
<<<<<<< HEAD
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
  MessageSquare,
} from 'lucide-react';
=======
import { MessageSquare, CheckCircle2, Circle, Loader2, Clock, Package, Send, FileCheck, Building2, DownloadCloud, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
>>>>>>> 14358356059b01645918b43587691d6bc6cf2e43

interface TrackDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document | null;
}

const TrackDocumentDialog: React.FC<TrackDocumentDialogProps> = ({ open, onOpenChange, document }) => {
  const [trackData, setTrackData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showResponses, setShowResponses] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setMounted(false);
      try {
        if (!document) {
          setTrackData(null);
          return;
        }
        const data = await getDocumentTrack(document.Document_Id);
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
  }, [open, document]);

<<<<<<< HEAD
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
=======
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

  const openDocumentInNewTab = (base64: string, mimetype?: string) => {
    try {
      if (!base64) throw new Error('No file data');
      // Sanitize and decode base64
      const sanitize = (b: string) => {
        let s = String(b || '');
        // Remove data:*;base64, prefix
        const idx = s.indexOf(',');
        if (s.startsWith('data:') && idx !== -1) s = s.slice(idx + 1);
        // Remove whitespace
        s = s.replace(/\s+/g, '');
        // URL-safe to standard
        s = s.replace(/-/g, '+').replace(/_/g, '/');
        // Pad
        const pad = s.length % 4;
        if (pad > 0) s += '='.repeat(4 - pad);
        return s;
      };

      const b64 = sanitize(base64);
      const binary = atob(b64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);

      const detectMime = (arr: Uint8Array) => {
        if (arr.length >= 4) {
          if (arr[0] === 0x25 && arr[1] === 0x50 && arr[2] === 0x44 && arr[3] === 0x46) return 'application/pdf';
          if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47) return 'image/png';
          if (arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF) return 'image/jpeg';
          if (arr[0] === 0x50 && arr[1] === 0x4B && arr[2] === 0x03 && arr[3] === 0x04) return 'application/zip';
        }
        return 'application/octet-stream';
      };

      const inferredMime = detectMime(bytes);
      const finalMime = mimetype || inferredMime || 'application/octet-stream';
      const blob = new Blob([bytes], { type: finalMime });
      const url = URL.createObjectURL(blob);
      const w = window.open(url);
      if (!w) {
        URL.revokeObjectURL(url);
        toast({ title: 'Unable to open document in new tab' });
      }
      // Revoke the object URL when the tab is unloaded
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      console.error('Open document failed', err);
      toast({ title: 'Failed to open document', variant: 'destructive' });
    }
  };

  const downloadBase64File = (base64: string, filename?: string, mimetype?: string) => {
    try {
      if (!base64) throw new Error('No file data');
      // sanitize base64
      const sanitize = (s: string) => {
        let v = String(s || '');
        if (v.startsWith('data:')) {
          const idx = v.indexOf(',');
          if (idx !== -1) v = v.slice(idx + 1);
        }
        v = v.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
        const pad = v.length % 4;
        if (pad > 0) v += '='.repeat(4 - pad);
        return v;
      };

      const clean = sanitize(base64);
      const binary = atob(clean);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);

      const detectMime = (arr: Uint8Array) => {
        if (arr.length >= 4) {
          if (arr[0] === 0x25 && arr[1] === 0x50 && arr[2] === 0x44 && arr[3] === 0x46) return 'application/pdf';
          if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47) return 'image/png';
          if (arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF) return 'image/jpeg';
          if (arr[0] === 0x50 && arr[1] === 0x4B && arr[2] === 0x03 && arr[3] === 0x04) return 'application/zip';
        }
        return 'application/octet-stream';
      };

      const inferredMime = detectMime(bytes);
      const finalMime = mimetype || inferredMime || 'application/octet-stream';

      const extMap: Record<string, string> = {
        'application/pdf': '.pdf',
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'application/zip': '.zip',
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'text/plain': '.txt',
      };

      let outName = filename || 'document';
      if (!/\.[a-z0-9]+$/i.test(outName)) {
        const ext = extMap[finalMime] || '';
        outName = outName + ext;
      }

      const blob = new Blob([bytes], { type: finalMime });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = outName;
      window.document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
      toast({ title: 'Failed to download document', variant: 'destructive' });
    }
>>>>>>> 14358356059b01645918b43587691d6bc6cf2e43
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
<<<<<<< HEAD
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Track Document
          </DialogTitle>
          <DialogDescription className="text-base">
            Real-time tracking of your document through the approval and release workflow
=======
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Track Document
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Monitor the current stage and progress of your document through the workflow.
>>>>>>> 14358356059b01645918b43587691d6bc6cf2e43
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
<<<<<<< HEAD
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
=======
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
>>>>>>> 14358356059b01645918b43587691d6bc6cf2e43
          ) : (() => {
            const { sender, approved, record, releases, responses, stages, currentStage, latestRelease } = trackData;

            // If document is still pending at admin and no release history, show minimal message
            if ((String(sender?.status || '').toLowerCase() === 'pending') && (!releases || releases.length === 0) && !approved) {
              return (
<<<<<<< HEAD
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
=======
                <div className="rounded-lg bg-gradient-to-br from-muted/50 to-muted/30 border border-dashed p-6 text-center animate-fade-in">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3 animate-pulse" />
                  <p className="text-sm font-medium mb-1"><strong>Current Location:</strong> Pending Admin office</p>
                  <p className="text-muted-foreground text-xs">Status: Pending Review</p>
                </div>
>>>>>>> 14358356059b01645918b43587691d6bc6cf2e43
              );
            }

            return (
<<<<<<< HEAD
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
=======
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
>>>>>>> 14358356059b01645918b43587691d6bc6cf2e43

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
                  const anyDoneRelease = doneReleases.length > 0;

                  if (doneReleases.length > 0) {
                    const latestDone = doneReleases[0];
                    const targetStage = stages?.find((s: any) => s.key === 'target');
                    const isTargetDone = targetStage?.done || anyDoneRelease;
                    
<<<<<<< HEAD
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
                          {isTargetDone && (
                            <div className="mt-4 flex justify-end">
                              <Button onClick={() => setShowResponses(true)} variant="outline">
                                <MessageSquare className="h-4 w-4 mr-2" />
                                View Responses
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
=======
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
>>>>>>> 14358356059b01645918b43587691d6bc6cf2e43
                    );
                  }

                  // In-progress releases
                  if (notDone.length > 0 || (record && String(record.status || '').toLowerCase() === 'released')) {
                    const r = notDone[0] || null;
                    const dept = r?.department || latestRelease?.department || sender?.sender_department || '—';
                    const div = r?.division || latestRelease?.division || sender?.sender_division || '—';
                    return (
<<<<<<< HEAD
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
=======
                      <div className="rounded-xl bg-gradient-to-r from-warning/10 via-warning/5 to-transparent border-2 border-warning/30 p-4 animate-fade-in">
                        <div className="flex items-start gap-3">
                          <Clock className="h-5 w-5 text-warning flex-shrink-0 mt-0.5 animate-pulse" />
                          <div>
                            <p className="text-sm font-semibold mb-1"><strong>Current Location:</strong> Releaser</p>
                            <p className="text-muted-foreground text-xs">Status: Waiting to be released</p>
                          </div>
                        </div>
                      </div>
>>>>>>> 14358356059b01645918b43587691d6bc6cf2e43
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
                            {response.user_id && (
                              <div className="text-xs text-muted-foreground mt-0.5">User ID: {response.user_id}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs text-muted-foreground mb-0.5">Department</div>
                            <div className="text-sm font-medium">{response.department || '—'}</div>
                            {response.department_id && (
                              <div className="text-xs text-muted-foreground mt-0.5">Dept ID: {response.department_id}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs text-muted-foreground mb-0.5">Division</div>
                            <div className="text-sm font-medium">{response.division || '—'}</div>
                            {response.division_id && (
                              <div className="text-xs text-muted-foreground mt-0.5">Div ID: {response.division_id}</div>
                            )}
                          </div>
                        </div>
                        {/* Document box */}
                        <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                          <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="text-xs text-muted-foreground mb-0.5">Document</div>
                            <div className="text-sm font-medium">{response.document_name || response.filename || response.file_name ? (response.document_name || response.filename || response.file_name) : (response.document ? 'Attached file' : '—')}</div>
                          </div>
                          {response.document && (
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="ghost" onClick={() => openDocumentInNewTab(response.document, response.document_type || response.mime || response.content_type)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="sm" onClick={() => downloadBase64File(response.document, response.document_name || response.filename || response.file_name, response.document_type || response.mime || response.content_type)}>
                                <DownloadCloud className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            </div>
                          )}
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
