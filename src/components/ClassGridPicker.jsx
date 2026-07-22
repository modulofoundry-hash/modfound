// Grid de cards pra escolher classe/subclasse no wizard — em vez da busca por
// texto (`SourceItemPicker`) usada no formulário antigo. `renderMeta` é
// opcional, pra mostrar uma linha extra por card (ex: dado de vida).
// `selectedRules` (opcional) desempata quando duas entradas têm o MESMO nome
// em edições diferentes (ex: subclasse "Life Domain" existe em 2014 E 2024)
// — sem isso, escolher uma destacaria as duas ao mesmo tempo (mesmo bug já
// corrigido em OriginTableBrowser pra Raça/Antecedente).
export function ClassGridPicker({ items, value, selectedRules, onPick, renderMeta, emptyMessage }) {
  if (!items.length) {
    return <p className="field-hint">{emptyMessage ?? "Nenhuma opção disponível."}</p>;
  }
  return (
    <div className="class-grid">
      {items.map((item) => {
        const isSelected = value === item.name && (!selectedRules || selectedRules === item.rules);
        return (
        <button
          key={`${item.name}-${item.rules ?? ""}`}
          type="button"
          className={`class-grid-card${isSelected ? " class-grid-card-selected" : ""}`}
          onClick={() => onPick(item)}
        >
          <span className="class-grid-name">{item.name}</span>
          {item.rules && <span className={`rules-tag rules-tag-${item.rules}`}>{item.rules}</span>}
          {renderMeta && <span className="class-grid-meta">{renderMeta(item)}</span>}
        </button>
        );
      })}
    </div>
  );
}
