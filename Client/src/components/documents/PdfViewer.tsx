import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
// Import worker via Vite's ?url so it becomes an emitted asset URL
// (avoids constructing a wrong relative path at runtime)
// @ts-ignore - Vite returns a string URL for ?url imports
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl as string;

interface PdfViewerProps {
  file?: string | Blob | Uint8Array | ArrayBuffer | null;
  className?: string;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ file, className }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pdfRef = useRef<any | null>(null);
  const loadingTaskRef = useRef<any | null>(null);
  const renderTasksRef = useRef<Map<number, any>>(new Map());
  const renderedPagesRef = useRef<Set<number>>(new Set());
  const ioRef = useRef<IntersectionObserver | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const resizeTimerRef = useRef<number | null>(null);
  const lastScaleRef = useRef<number | null>(null);
  const renderVersionRef = useRef<number>(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';
  }, []);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    // Cleanup any previous state
    renderVersionRef.current++;
    renderedPagesRef.current.clear();
    renderTasksRef.current.forEach((v) => {
      try {
        if (v?.task && typeof v.task.cancel === 'function') v.task.cancel();
      } catch (e) {
        // ignore
      }
    });
    renderTasksRef.current.clear();
    if (ioRef.current) {
      try { ioRef.current.disconnect(); } catch (e) { }
      ioRef.current = null;
    }
    if (roRef.current) {
      try { roRef.current.disconnect(); } catch (e) { }
      roRef.current = null;
    }

    // Clear DOM
    container.innerHTML = '';
    setError(null);

    if (!file) return;

    setLoading(true);

    const renderVersion = ++renderVersionRef.current;

    const loadAndPrepare = async () => {
      try {
        let data: any = file;

        if (file instanceof Blob) {
          data = await file.arrayBuffer();
        } else if (typeof file === 'string') {
          if (file.startsWith('blob:') || file.startsWith('http') || file.startsWith('/')) {
            const resp = await fetch(file);
            if (!resp.ok) throw new Error(`Failed to fetch PDF: ${resp.status}`);
            data = await resp.arrayBuffer();
          }
        } else if (file instanceof Uint8Array) {
          data = file;
        }

        // Cancel if a new render started
        if (renderVersionRef.current !== renderVersion || cancelled) return;

        const loadingTask = pdfjsLib.getDocument({ data });
        loadingTaskRef.current = loadingTask;
        const pdf = await loadingTask.promise;

        if (renderVersionRef.current !== renderVersion || cancelled) {
          try { pdf.destroy?.(); } catch (e) {}
          return;
        }

        pdfRef.current = pdf;

        // Prepare placeholders/wrappers for pages
        const pageCount = pdf.numPages || 0;

        // Try to determine first page aspect ratio for placeholder heights
        let firstPageWidth = 1;
        let firstPageHeight = 1;
        try {
          const p1 = await pdf.getPage(1);
          const v1 = p1.getViewport({ scale: 1 });
          firstPageWidth = v1.width;
          firstPageHeight = v1.height;
        } catch (err) {
          // ignore
        }

        // Create wrappers
        for (let i = 1; i <= pageCount; i++) {
          const wrapper = document.createElement('div');
          wrapper.dataset.page = String(i);
          wrapper.style.marginBottom = '16px';
          wrapper.style.display = 'block';
          // set an estimated height to avoid layout jumps
          const containerWidth = container.clientWidth || 800;
          const ratio = firstPageHeight / Math.max(firstPageWidth, 1);
          const estHeight = Math.round(containerWidth * ratio);
          wrapper.style.minHeight = estHeight + 'px';
          wrapper.className = 'pdf-page-wrapper';
          wrapper.innerHTML = `<div class="pdf-page-placeholder" style="width:100%;height:${estHeight}px;background:#f6f6f6;border-radius:6px"></div>`;
          container.appendChild(wrapper);
        }

        // Setup IntersectionObserver to lazy-render pages near viewport
        const io = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (renderVersionRef.current !== renderVersion || cancelled) break;
            const el = entry.target as HTMLDivElement;
            const pageNum = Number(el.dataset.page);
            if (entry.isIntersecting) {
              // Render when visible (or near viewport per rootMargin)
              void renderPage(pageNum);
            }
          }
        }, { root: null, rootMargin: '800px 0px 800px 0px', threshold: 0.05 });

        ioRef.current = io;
        // Observe all wrappers
        const wrappers = Array.from(container.querySelectorAll<HTMLDivElement>('.pdf-page-wrapper'));
        wrappers.forEach((w) => io.observe(w));

        // Compute current scale based on container and first page size
        const computeScale = () => {
          const cw = container.clientWidth || 800;
          return cw / Math.max(firstPageWidth || 1, 1);
        };
        lastScaleRef.current = computeScale();

        // Debounced resize handler
        const ro = new ResizeObserver(() => {
          if (resizeTimerRef.current) window.clearTimeout(resizeTimerRef.current);
          resizeTimerRef.current = window.setTimeout(() => {
            // Only re-render pages that have already been rendered (to avoid flashing)
            const newScale = computeScale();
            const last = lastScaleRef.current ?? newScale;
            if (Math.abs(newScale - last) > 0.01) {
              lastScaleRef.current = newScale;
              // Increment render version so any ongoing renders can cancel
              renderVersionRef.current++;
              // For each currently rendered page, request re-render with new scale
              for (const p of Array.from(renderedPagesRef.current)) {
                void renderPage(p, newScale);
              }
            }
          }, 150);
        });

        ro.observe(container);
        roRef.current = ro;

        setLoading(false);

        // Auto-render the first visible pages immediately
        const firstWrappers = Array.from(container.querySelectorAll<HTMLDivElement>('.pdf-page-wrapper')).slice(0, 2);
        for (const w of firstWrappers) {
          void renderPage(Number(w.dataset.page));
        }

        async function renderPage(pageNum: number, scaleOverride?: number) {
          if (renderVersionRef.current !== renderVersion || cancelled) return;
          try {
            const page = await pdf.getPage(pageNum);
            if (renderVersionRef.current !== renderVersion || cancelled) return;

            const wrapper = container.querySelector<HTMLDivElement>(`[data-page="${pageNum}"]`);
            if (!wrapper) return;

            // Cancel any previous render task for this page
            const prev = renderTasksRef.current.get(pageNum);
            if (prev && prev.task && typeof prev.task.cancel === 'function') {
              try { prev.task.cancel(); } catch (e) { /* ignore */ }
            }

            // Determine scale
            const containerWidth = container.clientWidth || 800;
            const viewportUnit = page.getViewport({ scale: 1 });
            const baseScale = containerWidth / Math.max(viewportUnit.width, 1);
            const scale = typeof scaleOverride === 'number' ? scaleOverride : baseScale;

            // Use devicePixelRatio for crisp rendering
            const dpr = Math.max(window.devicePixelRatio || 1, 1);
            const viewportCss = page.getViewport({ scale });
            const viewportForCanvas = page.getViewport({ scale: scale * dpr });

            // Create canvas and set proper sizes
            const canvas = document.createElement('canvas');
            canvas.style.display = 'block';
            canvas.style.borderRadius = '6px';
            canvas.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
            // CSS size (logical pixels)
            canvas.style.width = Math.floor(viewportCss.width) + 'px';
            canvas.style.height = Math.floor(viewportCss.height) + 'px';
            // backing store size (actual pixels)
            canvas.width = Math.floor(viewportForCanvas.width);
            canvas.height = Math.floor(viewportForCanvas.height);

            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Could not get canvas context');

            // Replace placeholder / old canvas with new canvas
            wrapper.innerHTML = '';
            wrapper.appendChild(canvas);

            // Start rendering
            const renderTask = page.render({ canvasContext: ctx, viewport: viewportForCanvas });
            // store task so it can be cancelled
            renderTasksRef.current.set(pageNum, { task: renderTask, canvas });

            // Smooth fade-in
            canvas.style.opacity = '0';
            canvas.style.transition = 'opacity 120ms linear';

            await renderTask.promise;

            // If this render was superseded, bail
            const stored = renderTasksRef.current.get(pageNum);
            if (!stored || stored.canvas !== canvas) return;

            // mark rendered
            renderedPagesRef.current.add(pageNum);
            renderTasksRef.current.delete(pageNum);

            // remove placeholder minHeight so layout adjusts if needed
            try { wrapper.style.minHeight = `${Math.floor(viewportCss.height)}px`; } catch (_) { }

            // fade-in
            canvas.style.opacity = '1';
          } catch (err: unknown) {
            if (!cancelled) {
              console.error('Render page error', err);
              setError((err as Error)?.message || String(err));
            }
          }
        }

      } catch (err: unknown) {
        if (!cancelled) {
          console.error('Failed to render PDF', err);
          setError((err as Error)?.message || 'Failed to render PDF');
        }
      }
    };

    void loadAndPrepare();

    return () => {
      cancelled = true;
      // increment version to cancel out any inflight work
      renderVersionRef.current++;
      // cancel tasks
      renderTasksRef.current.forEach((v) => {
        try { if (v?.task && typeof v.task.cancel === 'function') v.task.cancel(); } catch (e) { }
      });
      renderTasksRef.current.clear();
      // disconnect observers
      if (ioRef.current) { try { ioRef.current.disconnect(); } catch (e) {} ioRef.current = null; }
      if (roRef.current) { try { roRef.current.disconnect(); } catch (e) {} roRef.current = null; }
      // destroy pdf
      try { pdfRef.current?.destroy?.(); } catch (e) { }
      loadingTaskRef.current = null;
      if (container) container.innerHTML = '';
    };
  }, [file]);

  return (
    <div className={`pdf-viewer ${className || ''}`}>
      {loading && (
        <div className="flex items-center justify-center p-6">
          <div className="text-muted-foreground">Rendering PDF…</div>
        </div>
      )}
      {error && (
        <div className="p-4 text-sm text-destructive">{error}</div>
      )}
      <div ref={containerRef} />
    </div>
  );
};

export default PdfViewer;
