import { PlacedSignature } from './PlacedSignature';
import type { DocPage, Placement } from '../types';

// Pages are shown at most this wide on screen (CSS px).
const DISPLAY_WIDTH = 816;

interface Props {
  page: DocPage;
  index: number;
  placements: Placement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onChange: (id: string, changes: Partial<Placement>) => void;
  onDelete: (id: string) => void;
}

export function DocumentPage({ page, index, placements, selectedId, onSelect, onChange, onDelete }: Props) {
  return (
    <div className="page" data-page-id={page.id} style={{ width: Math.min(page.width, DISPLAY_WIDTH) }}>
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
