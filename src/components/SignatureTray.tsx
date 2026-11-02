import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { usePreventTouchScroll } from '../lib/usePreventTouchScroll';
import type { Stamp } from '../types';

// Pointer movement (CSS px) before a press on a tray item counts as a drag
// rather than a tap.
const DRAG_THRESHOLD = 6;

interface Props {
  stamps: Stamp[];
  /** Called when a stamp is dragged out of the tray and released at (clientX, clientY). */
  onDrop: (stamp: Stamp, clientX: number, clientY: number) => void;
  onTap: (stamp: Stamp) => void;
  onRemove: (id: string) => void;
}

interface Ghost {
  stamp: Stamp;
  x: number;
  y: number;
}

export function SignatureTray({ stamps, onDrop, onTap, onRemove }: Props) {
  const [ghost, setGhost] = useState<Ghost | null>(null);

  return (
    <aside className="tray">
      <h2>Sign &amp; date</h2>
      <p className="hint">Drag onto the page, or tap to add to the page in view.</p>
      <div className="sig-list">
        {stamps.map(stamp => (
          <TrayItem
            key={stamp.id}
            stamp={stamp}
            onDragMove={(x, y) => setGhost({ stamp, x, y })}
            onDrop={(x, y) => {
              setGhost(null);
              onDrop(stamp, x, y);
            }}
            onCancel={() => setGhost(null)}
            onTap={() => onTap(stamp)}
            onRemove={stamp.kind === 'signature' ? () => onRemove(stamp.id) : undefined}
          />
        ))}
      </div>
      {ghost && (
        <img
          className="drag-ghost"
          src={ghost.stamp.dataUrl}
          alt=""
          style={{ left: ghost.x, top: ghost.y }}
        />
      )}
    </aside>
  );
}

interface ItemProps {
  stamp: Stamp;
  onDragMove: (clientX: number, clientY: number) => void;
  onDrop: (clientX: number, clientY: number) => void;
  onCancel: () => void;
  onTap: () => void;
  /** Omitted for stamps that can't be removed, like today's date. */
  onRemove?: () => void;
}

function TrayItem({ stamp, onDragMove, onDrop, onCancel, onTap, onRemove }: ItemProps) {
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
      className={`sig-item ${stamp.kind}`}
      title="Drag onto the document"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <img src={stamp.dataUrl} alt={stamp.kind === 'date' ? "Today's date" : 'Signature'} draggable={false} />
      {onRemove && (
        <button
          type="button"
          className="remove"
          title="Remove from tray"
          onPointerDown={e => e.stopPropagation()}
          onClick={onRemove}
        >
          ×
        </button>
      )}
    </div>
  );
}
