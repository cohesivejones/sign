import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { DocumentPage } from './components/DocumentPage';
import { SignatureDialog } from './components/SignatureDialog';
import { SignatureTray } from './components/SignatureTray';
import { clamp } from './lib/clamp';
import { loadDocument } from './lib/loadDocument';
import type { DocPage, Placement, Signature } from './types';

// New signatures take up this fraction of the page width.
const DEFAULT_WIDTH = 0.25;

export default function App() {
  const [pages, setPages] = useState<DocPage[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [status, setStatus] = useState('');
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

  async function openFile(file: File) {
    setStatus(`Loading ${file.name}…`);
    try {
      const loaded = await loadDocument(file);
      pages.forEach(p => URL.revokeObjectURL(p.src));
      setPages(loaded);
      setPlacements([]);
      setSelectedId(null);
      setStatus(file.name);
    } catch (err) {
      console.error(err);
      setStatus(err instanceof Error ? err.message : 'Could not open that file.');
    }
  }

  function handleFileInput(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) openFile(file);
    e.target.value = '';
  }

  function handleFileDragOver(e: DragEvent) {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    setFileOver(true);
  }

  function handleFileDrop(e: DragEvent) {
    setFileOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    e.preventDefault();
    openFile(file);
  }

  /** Place a signature centred on (cx, cy), given as fractions of the page. */
  function placeSignature(page: DocPage, signature: Signature, cx: number, cy: number) {
    const ratio = page.width / page.height;
    const width = Math.min(DEFAULT_WIDTH, 1 / (signature.aspect * ratio));
    const height = width * signature.aspect * ratio;
    const placement: Placement = {
      id: crypto.randomUUID(),
      pageId: page.id,
      signature,
      x: clamp(cx - width / 2, 0, 1 - width),
      y: clamp(cy - height / 2, 0, 1 - height),
      width,
    };
    setPlacements(ps => [...ps, placement]);
    setSelectedId(placement.id);
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
        <span className="status">{status}</span>
      </header>

      <SignatureTray
        signatures={signatures}
        onPick={sig => pages[0] && placeSignature(pages[0], sig, 0.5, 0.5)}
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
              onDropSignature={(sigId, x, y) => {
                const sig = signatures.find(s => s.id === sigId);
                if (sig) placeSignature(page, sig, x, y);
              }}
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
