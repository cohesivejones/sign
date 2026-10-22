import type { Signature } from '../types';

export const SIGNATURE_MIME = 'application/x-signature';

interface Props {
  signatures: Signature[];
  onPick: (signature: Signature) => void;
  onRemove: (id: string) => void;
}

export function SignatureTray({ signatures, onPick, onRemove }: Props) {
  return (
    <aside className="tray">
      <h2>Signatures</h2>
      <p className="hint">Drag a signature onto the page, or click it to add it to the first page.</p>
      <div className="sig-list">
        {signatures.map(sig => (
          <div
            key={sig.id}
            className="sig-item"
            draggable
            title="Drag onto the document"
            onDragStart={e => {
              e.dataTransfer.setData(SIGNATURE_MIME, sig.id);
              e.dataTransfer.effectAllowed = 'copy';
            }}
            onClick={() => onPick(sig)}
          >
            <img src={sig.dataUrl} alt="Signature" />
            <button
              type="button"
              className="remove"
              title="Remove from tray"
              onClick={e => {
                e.stopPropagation();
                onRemove(sig.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
