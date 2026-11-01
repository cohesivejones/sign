import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { usePreventTouchScroll } from '../lib/usePreventTouchScroll';
import type { Signature } from '../types';

// Pointer movement (CSS px) before a press on a tray item counts as a drag
// rather than a tap.
const DRAG_THRESHOLD = 6;

interface Props {
  signatures: Signature[];
  /** Called when a signature is dragged out of the tray and released at (clientX, clientY). */
  onDrop: (signature: Signature, clientX: number, clientY: number) => void;
  onTap: (signature: Signature) => void;
  onRemove: (id: string) => void;
}

interface Ghost {
  signature: Signature;
  x: number;
  y: number;
}

export function SignatureTray({ signatures, onDrop, onTap, onRemove }: Props) {
  const [ghost, setGhost] = useState<Ghost | null>(null);

  return (
    <aside className="tray">
      <h2>Signatures</h2>
      <p className="hint">Drag a signature onto the page, or tap it to add it to the page in view.</p>
      <div className="sig-list">
        {signatures.map(sig => (
          <TrayItem
            key={sig.id}
            signature={sig}
            onDragMove={(x, y) => setGhost({ signature: sig, x, y })}
            onDrop={(x, y) => {
              setGhost(null);
              onDrop(sig, x, y);
            }}
            onCancel={() => setGhost(null)}
            onTap={() => onTap(sig)}
            onRemove={() => onRemove(sig.id)}
          />
        ))}
      </div>
      {ghost && (
        <img
          className="drag-ghost"
          src={ghost.signature.dataUrl}
          alt=""
          style={{ left: ghost.x, top: ghost.y }}
        />
      )}
    </aside>
  );
}

interface ItemProps {
  signature: Signature;
  onDragMove: (clientX: number, clientY: number) => void;
  onDrop: (clientX: number, clientY: number) => void;
  onCancel: () => void;
  onTap: () => void;
  onRemove: () => void;
}

function TrayItem({ signature, onDragMove, onDrop, onCancel, onTap, onRemove }: ItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const press = useRef<{ startX: number; startY: number; dragging: boolean } | null>(null);
  usePreventTouchScroll(ref);

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    press.current = { startX: e.clientX, startY: e.clientY, dragging: false };
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const p = press.current;
    if (!p) return;
    if (!p.dragging && Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > DRAG_THRESHOLD) {
      p.dragging = true;
    }
    if (p.dragging) onDragMove(e.clientX, e.clientY);
  }

  function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
    const p = press.current;
    press.current = null;
    if (!p) return;
    if (p.dragging) onDrop(e.clientX, e.clientY);
    else onTap();
  }

  function handlePointerCancel() {
    press.current = null;
    onCancel();
  }

  return (
    <div
      ref={ref}
      className="sig-item"
      title="Drag onto the document"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <img src={signature.dataUrl} alt="Signature" draggable={false} />
      <button
        type="button"
        className="remove"
        title="Remove from tray"
        onPointerDown={e => e.stopPropagation()}
        onClick={onRemove}
      >
        ×
      </button>
    </div>
  );
}
