import { useState } from 'react';
import { PlacedSignature } from './PlacedSignature';
import { SIGNATURE_MIME } from './SignatureTray';
import type { DocPage, Placement } from '../types';

// Pages are shown at most this wide on screen (CSS px).
const DISPLAY_WIDTH = 816;

interface Props {
  page: DocPage;
  index: number;
  placements: Placement[];
  selectedId: string | null;
  onDropSignature: (signatureId: string, x: number, y: number) => void;
  onSelect: (id: string) => void;
  onChange: (id: string, changes: Partial<Placement>) => void;
  onDelete: (id: string) => void;
}

export function DocumentPage({
  page,
  index,
  placements,
  selectedId,
  onDropSignature,
  onSelect,
  onChange,
  onDelete,
}: Props) {
  const [over, setOver] = useState(false);

  return (
    <div
      className={`page${over ? ' over' : ''}`}
      style={{ width: Math.min(page.width, DISPLAY_WIDTH) }}
      onDragOver={e => {
        if (!e.dataTransfer.types.includes(SIGNATURE_MIME)) return;
        e.preventDefault();
        e.stopPropagation();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={e => {
        setOver(false);
        const signatureId = e.dataTransfer.getData(SIGNATURE_MIME);
        if (!signatureId) return;
        e.preventDefault();
        e.stopPropagation();
        const r = e.currentTarget.getBoundingClientRect();
        onDropSignature(signatureId, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
      }}
    >
      <img className="doc" src={page.src} alt={`Page ${index + 1}`} draggable={false} />
      {placements.map(p => (
        <PlacedSignature
          key={p.id}
          placement={p}
          pageRatio={page.width / page.height}
          selected={p.id === selectedId}
          onSelect={() => onSelect(p.id)}
          onChange={changes => onChange(p.id, changes)}
          onDelete={() => onDelete(p.id)}
        />
      ))}
    </div>
  );
}
