import { useMemo, useState } from "react";
import { pickClassPlaceholderImage } from "../data/classImagePlaceholders.js";

// Retrato é sempre preferencial ao token pro card (mais reconhecível em
// miniatura); token só entra como substituto quando não há retrato. Se as
// duas estiverem ausentes OU quebradas (onError), cai pro placeholder da
// classe do personagem (sorteado 1x por acesso à página, ver
// classImagePlaceholders.js) -- se esse também não existir/carregar, ou o
// item não tiver classe (NPC), cai no ícone genérico.
export function SheetCard({ item, onEdit, onDelete, children }) {
  const realImage = item.imageUrl || item.tokenImageUrl;
  const placeholderImage = useMemo(() => pickClassPlaceholderImage(item.classes), [item.id]);
  const candidates = [realImage, placeholderImage].filter(Boolean);
  const [failedCount, setFailedCount] = useState(0);
  const image = candidates[failedCount];

  return (
    <div className="sheet-card">
      <button type="button" className="sheet-card-body" onClick={() => onEdit(item)}>
        <div className="sheet-card-thumb">
          {image ? (
            <img src={image} alt="" onError={() => setFailedCount((n) => n + 1)} />
          ) : (
            <span className="sheet-card-thumb-placeholder">🧑</span>
          )}
        </div>
        <div className="sheet-card-info">
          <span className="sheet-card-name">{item.name || "(sem nome)"}</span>
          {children}
        </div>
      </button>
      <button
        type="button"
        className="sheet-card-delete"
        aria-label="Excluir"
        onClick={(event) => {
          event.stopPropagation();
          onDelete(item.id);
        }}
      >
        ×
      </button>
    </div>
  );
}
