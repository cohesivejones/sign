import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { trimCanvas } from '../lib/trimCanvas';
import type { Signature } from '../types';

interface Props {
  open: boolean;
  onSave: (signature: Signature) => void;
  onClose: () => void;
}

interface Point {
  x: number;
  y: number;
}

export function SignatureDialog({ open, onSave, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ point: Point; mid: Point } | null>(null);
  const [color, setColor] = useState('#1a2a6c');
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current!;
    if (open && !dialog.open) {
      clear();
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function context() {
    return canvasRef.current!.getContext('2d')!;
  }

  function toCanvas(e: PointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
    };
  }

  function handlePointerDown(e: PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toCanvas(e);
    const ctx = context();
    ctx.strokeStyle = ctx.fillStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = ctx.lineJoin = 'round';
    // Dot for single clicks.
    ctx.beginPath();
    ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    last.current = { point: p, mid: p };
    setHasInk(true);
  }

  function handlePointerMove(e: PointerEvent<HTMLCanvasElement>) {
    if (!last.current) return;
    const p = toCanvas(e);
    const { point, mid } = last.current;
    const nextMid = { x: (point.x + p.x) / 2, y: (point.y + p.y) / 2 };
    const ctx = context();
    ctx.beginPath();
    ctx.moveTo(mid.x, mid.y);
    ctx.quadraticCurveTo(point.x, point.y, nextMid.x, nextMid.y);
    ctx.stroke();
    last.current = { point: p, mid: nextMid };
  }

  function handlePointerUp() {
    last.current = null;
  }

  function clear() {
    const canvas = canvasRef.current!;
    context().clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  }

  function save() {
    const trimmed = trimCanvas(canvasRef.current!);
    onSave({
      id: crypto.randomUUID(),
      dataUrl: trimmed.toDataURL('image/png'),
      aspect: trimmed.height / trimmed.width,
    });
  }

  return (
    <dialog ref={dialogRef} onClose={onClose}>
      <div className="sig-dialog">
        <h2>Draw your signature</h2>
        <canvas
          ref={canvasRef}
          className="sig-pad"
          width={600}
          height={200}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        <div className="dialog-actions">
          <label>
            Colour <input type="color" value={color} onChange={e => setColor(e.target.value)} />
          </label>
          <button type="button" className="btn" onClick={clear}>
            Clear
          </button>
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn primary" onClick={save} disabled={!hasInk}>
            Save
          </button>
        </div>
      </div>
    </dialog>
  );
}
