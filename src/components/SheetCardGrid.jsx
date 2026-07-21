import { useEffect, useState } from "react";

const PAGE_SIZE = 16; // grid 4x4

export function SheetCardGrid({ items, renderCard }) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  // Só corrige a página quando ela deixa de existir (ex: apagou o último item
  // da última página) — não reseta a cada atualização do Firestore, senão
  // qualquer mudança (mesmo em outro personagem) chutaria o usuário de volta
  // pra página 1.
  useEffect(() => {
    if (page >= pageCount) setPage(0);
  }, [page, pageCount]);

  const start = page * PAGE_SIZE;
  const pageItems = items.slice(start, start + PAGE_SIZE);

  return (
    <div>
      <div className="sheet-card-grid">{pageItems.map(renderCard)}</div>
      {pageCount > 1 && (
        <div className="sheet-pagination">
          <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            ← Anterior
          </button>
          <span>
            Página {page + 1} de {pageCount}
          </span>
          <button type="button" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}
