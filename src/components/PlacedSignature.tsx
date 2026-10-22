import { useRef } from 'react';
import type { PointerEvent } from 'react';
import { clamp } from '../lib/clamp';
import type { Placement } from '../types';

interface Props {
  placement: Placement;
  /** Page width divided by page height. */
  pageRatio: number;
  selected: boolean;
  onSelect: () => void;
  onChange: (changes: Partial<Placement>) => void;
  onDelete: () => void;
}

interface DragState {
  mode: 'move' | 'resize';
  startX: number;
  startY: number;
  pageWidth: number;
  pageHeight: number;
  start: Placement;
}

const MIN_WIDTH_PX = 30;

export function PlacedSignature({ placement, pageRatio, selected, onSelect, onChange, onDelete }: Props) {
  const drag = useRef<DragState | null>(null);
  const { x, y, width, signature } = placement;

  function beginDrag(e: PointerEvent<HTMLElement>, mode: DragState['mode']) {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    e.currentTarget.setPointerCapture(e.pointerId);
    const page = e.currentTarget.closest('.page')!.getBoundingClientRect();
    drag.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      pageWidth: page.width,
      pageHeight: page.height,
      start: placement,
    };
  }

  function handlePointerMove(e: PointerEvent<HTMLElement>) {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / d.pageWidth;
    const dy = (e.clientY - d.startY) / d.pageHeight;
    if (d.mode === 'move') {
      const h = d.start.width * signature.aspect * pageRatio;
      onChange({
        x: clamp(d.start.x + dx, 0, 1 - d.start.width),
        y: clamp(d.start.y + dy, 0, 1 - h),
      });
    } else {
      const maxByWidth = 1 - d.start.x;
      const maxByHeight = (1 - d.start.y) / (signature.aspect * pageRatio);
      onChange({
        width: clamp(d.start.width + dx, MIN_WIDTH_PX / d.pageWidth, Math.min(maxByWidth, maxByHeight)),
      });
    }
  }

  function endDrag() {
    drag.current = null;
  }

  return (
    <div
      className={`placed${selected ? ' active' : ''}`}
      style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${width * 100}%` }}
      onPointerDown={e => beginDrag(e, 'move')}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <img src={signature.dataUrl} alt="Signature" draggable={false} />
      {/* Move/up events from the captured handle bubble to the handlers above. */}
      <div className="handle" onPointerDown={e => beginDrag(e, 'resize')} />
      <button
        type="button"
        className="delete"
        title="Remove"
        onPointerDown={e => e.stopPropagation()}
        onClick={onDelete}
      >
        ×
      </button>
    </div>
  );
}
