import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { DocumentPage } from './components/DocumentPage';
import { SignatureDialog } from './components/SignatureDialog';
import { SignatureTray } from './components/SignatureTray';
import { clamp } from './lib/clamp';
import { exportPdf } from './lib/exportPdf';
import { newId } from './lib/id';
import { loadDocument } from './lib/loadDocument';
import { renderDateStamp } from './lib/stamps';
import type { DocPage, Placement, Stamp } from './types';

// New stamps take up this fraction of the page width.
const DEFAULT_WIDTH: Record<Stamp['kind'], number> = { signature: 0.25, date: 0.2 };

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<DocPage[]>([]);
  const [signatures, setSignatures] = useState<Stamp[]>([]);
  const [dateStamp] = useState(() => renderDateStamp());
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [fileOver, setFileOver] = useState(false);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  // Free rendered page images on unmount.
  useEffect(() => () => pagesRef.current.forEach(p => URL.revokeObjectURL(p.src)), []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (dialogOpen || !selectedId) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        setPlacements(ps => ps.filter(p => p.id !== selectedId));
        setSelectedId(null);
      }
    }
    function handlePointerDown(e: PointerEvent) {
      if (!(e.target as Element).closest('.placed')) setSelectedId(null);
    }
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [dialogOpen, selectedId]);

  async function openFile(next: File) {
    setStatus(`Loading ${next.name}…`);
    try {
      const loaded = await loadDocument(next);
      pages.forEach(p => URL.revokeObjectURL(p.src));
      setFile(next);
      setPages(loaded);
      setPlacements([]);
      setSelectedId(null);
      setStatus(next.name);
    } catch (err) {
      console.error(err);
      setStatus(err instanceof Error ? err.message : 'Could not open that file.');
    }
  }

  async function savePdf() {
    if (!file) return;
    setBusy(true);
    setStatus('Creating PDF…');
    try {
      const bytes = await exportPdf(file, pages, placements);
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.replace(/\.[^.]+$/, '')}-signed.pdf`;
      a.click();
      // Give the browser time to start the download before freeing it.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setStatus(file.name);
    } catch (err) {
      console.error(err);
      setStatus('Could not create the PDF.');
    } finally {
      setBusy(false);
    }
  }

  function handleFileInput(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0];
    if (next) openFile(next);
    e.target.value = '';
  }

  function handleFileDragOver(e: DragEvent) {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    setFileOver(true);
  }

  function handleFileDrop(e: DragEvent) {
    setFileOver(false);
    const next = e.dataTransfer.files[0];
    if (!next) return;
    e.preventDefault();
    openFile(next);
  }

  /** Place a stamp centred on (cx, cy), given as fractions of the page. */
  function placeStamp(page: DocPage, stamp: Stamp, cx: number, cy: number) {
    const ratio = page.width / page.height;
    const width = Math.min(DEFAULT_WIDTH[stamp.kind], 1 / (stamp.aspect * ratio));
    const height = width * stamp.aspect * ratio;
    const placement: Placement = {
      id: newId(),
      pageId: page.id,
      stamp,
      x: clamp(cx - width / 2, 0, 1 - width),
      y: clamp(cy - height / 2, 0, 1 - height),
      width,
    };
    setPlacements(ps => [...ps, placement]);
    setSelectedId(placement.id);
  }

  /** Place a stamp where it was dropped, if that point is over a page. */
  function dropStamp(stamp: Stamp, clientX: number, clientY: number) {
    const el = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>('[data-page-id]');
    const page = el && pages.find(p => p.id === el.dataset.pageId);
    if (!el || !page) return;
    const r = el.getBoundingClientRect();
    placeStamp(page, stamp, (clientX - r.left) / r.width, (clientY - r.top) / r.height);
  }

  /** Place a stamp in the middle of the visible part of the most visible page. */
  function placeInView(stamp: Stamp) {
    const viewer = document.querySelector('.viewer')!.getBoundingClientRect();
    let best: { page: DocPage; cx: number; cy: number; area: number } | null = null;
    for (const el of document.querySelectorAll<HTMLElement>('[data-page-id]')) {
      const page = pages.find(p => p.id === el.dataset.pageId);
      if (!page) continue;
      const r = el.getBoundingClientRect();
      const left = Math.max(r.left, viewer.left);
      const right = Math.min(r.right, viewer.right);
      const top = Math.max(r.top, viewer.top);
      const bottom = Math.min(r.bottom, viewer.bottom);
      const area = Math.max(0, right - left) * Math.max(0, bottom - top);
      if (!best || area > best.area) {
        best = {
          page,
          cx: ((left + right) / 2 - r.left) / r.width,
          cy: ((top + bottom) / 2 - r.top) / r.height,
          area,
        };
      }
    }
    if (best) placeStamp(best.page, stamp, best.cx, best.cy);
  }

  function updatePlacement(id: string, changes: Partial<Placement>) {
    setPlacements(ps => ps.map(p => (p.id === id ? { ...p, ...changes } : p)));
  }

  return (
    <div className="app">
      <header className="toolbar">
        <h1>Sign</h1>
        <label className="btn">
          Open document
          <input
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp,image/gif"
            hidden
            onChange={handleFileInput}
          />
        </label>
        <button type="button" className="btn" onClick={() => setDialogOpen(true)}>
          New signature
        </button>
        <button type="button" className="btn primary" disabled={!pages.length} onClick={() => window.print()}>
          Print
        </button>
        <button type="button" className="btn primary" disabled={!pages.length || busy} onClick={savePdf}>
          Save PDF
        </button>
        <span className="status">{status}</span>
      </header>

      <SignatureTray
        stamps={[dateStamp, ...signatures]}
        onDrop={dropStamp}
        onTap={placeInView}
        onRemove={id => setSignatures(s => s.filter(sig => sig.id !== id))}
      />

      <main
        className="viewer"
        onDragOver={handleFileDragOver}
        onDragLeave={() => setFileOver(false)}
        onDrop={handleFileDrop}
      >
        {pages.length === 0 ? (
          <div className={`empty${fileOver ? ' over' : ''}`}>
            <p>Open a PDF or image, or drop one here.</p>
            <p className="hint">The file stays in your browser and is never uploaded.</p>
          </div>
        ) : (
          pages.map((page, i) => (
            <DocumentPage
              key={page.id}
              page={page}
              index={i}
              placements={placements.filter(p => p.pageId === page.id)}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onChange={updatePlacement}
              onDelete={id => setPlacements(ps => ps.filter(p => p.id !== id))}
            />
          ))
        )}
      </main>

      <SignatureDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={sig => {
          setSignatures(s => [...s, sig]);
          setDialogOpen(false);
        }}
      />
    </div>
  );
}
