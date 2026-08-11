import { useState } from "react";

// Mostra o texto de descrição + a lista do que o item concede (traits com nome —
// Darkvision/resistência/etc pra raça, já vem pronta do livro, mesmo bloco que o
// PHB usa; `feature` singular pra antecedente 2014 — ex: "Shelter of the Faithful"
// do Acolyte) da raça/antecedente/classe/subclasse escolhida, num card por item.
// Nem todo item tem descrição extraída (algumas raças homebrew do Book of Ebon Tides
// não têm) — card ainda aparece se tiver traits pra mostrar, só a descrição some.
// Antecedente 2024 não tem `feature` nenhuma (substituída por talento de origem,
// já mostrado à parte em OriginSuggestions) — card só de descrição, sem seção
// "O que concede".
export function DescriptionPanel({ cards }) {
  // Rastreia quem foi EXPANDIDO (não quem foi colapsado) -- assim, por
  // default (Set vazio), todo card nasce colapsado. E como a chave é o
  // `title` (não o nome do item), se o jogador já expandiu o card de "Raça"
  // e troca de raça em seguida, o card continua expandido em vez de fechar
  // sozinho a cada escolha nova.
  const [expanded, setExpanded] = useState(() => new Set());

  function traitsOf(item) {
    return item?.traits ?? (item?.feature ? [item.feature] : []);
  }

  function toggle(title) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  const withContent = cards.filter((card) => card.item?.description || traitsOf(card.item).length);
  if (!withContent.length) return null;

  return (
    <div className="description-panel">
      {withContent.map((card) => {
        const isCollapsed = !expanded.has(card.title);
        return (
          <div key={`${card.title}-${card.item.name}`} className="description-card">
            <button
              type="button"
              className="description-card-header"
              onClick={() => toggle(card.title)}
              aria-expanded={!isCollapsed}
            >
              <h3>
                {card.title}: {card.item.name}
              </h3>
              <span className={`description-card-chevron${isCollapsed ? " description-card-chevron-collapsed" : ""}`}>▾</span>
            </button>
            {!isCollapsed && (
              <div className="description-card-content">
                {card.item.description && (
                  <div className="description-card-body" dangerouslySetInnerHTML={{ __html: card.item.description }} />
                )}
                {traitsOf(card.item).length > 0 && (
                  <div className="description-card-traits">
                    <h4>O que concede</h4>
                    <dl>
                      {traitsOf(card.item).map((trait) => (
                        <div key={trait.name} className="description-trait">
                          <dt>{trait.name}</dt>
                          <dd dangerouslySetInnerHTML={{ __html: trait.description }} />
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
