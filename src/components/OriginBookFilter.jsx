import { useState } from "react";

// Filtro de Livro/Edição pra Raça e Antecedente — StepRaca.jsx/StepAntecedente.jsx seguram o
// estado (`editions`/`activeSources`, ambos Set) e usam `filterOriginItems` num useMemo antes
// de passar pro OriginTableBrowser; este componente só renderiza os checkboxes e chama os
// `onChange*` do pai (componente controlado, sem estado de filtro próprio — só o "painel
// recolhido/expandido", que é puramente visual).
//
// Grupos vêm de `item.tier` ("official"/"partnered"/"homebrew", ver shared/tools/book-tiers.mjs
// -- propagado pelo generate-site-content.mjs). "homebrew" nunca aparece hoje (nenhum item
// extraído até 2026-07-29 cai nesse grupo, ver a memória do projeto), mas a seção já existe
// pronta pra quando algum entrar.
const TIER_LABELS = { official: "Oficial", partnered: "Partnered", homebrew: "Homebrew" };
const TIER_ORDER = ["official", "partnered", "homebrew"];

// Estado inicial = tudo ligado (replica o comportamento de hoje, "mostra tudo") — cada Step
// chama isso uma vez com o pool bruto (`allRaces`/`allBackgrounds`, que nunca muda de novo
// depois de carregado) pra inicializar os dois `useState`.
export function initialOriginFilter(items) {
  return {
    editions: new Set(items.map((item) => item.rules).filter(Boolean)),
    activeSources: new Set(items.map((item) => item.source)),
  };
}

export function filterOriginItems(items, { editions, activeSources }) {
  return items.filter((item) => editions.has(item.rules) && activeSources.has(item.source));
}

// Um livro por `source` (não por arquivo) -- PHB/FTD/etc têm vários arquivos no banco mas
// aparecem como 1 checkbox só aqui. Só lista livros que aparecem de verdade em `items` (mesmo
// princípio do classOptions/schoolOptions do SpellBrowser.jsx -- sem entulhar com livro que
// não tem raça/antecedente nenhum nesse passo).
function collectBooksByTier(items) {
  const bySource = new Map();
  for (const item of items) {
    if (!bySource.has(item.source)) {
      bySource.set(item.source, { source: item.source, sourceBook: item.sourceBook || item.source, tier: item.tier || "homebrew" });
    }
  }
  const groups = { official: [], partnered: [], homebrew: [] };
  for (const book of bySource.values()) groups[book.tier]?.push(book);
  for (const tier of TIER_ORDER) groups[tier].sort((a, b) => a.sourceBook.localeCompare(b.sourceBook));
  return groups;
}

export function OriginBookFilter({ items, editions, activeSources, onChangeEditions, onChangeSources }) {
  const [expanded, setExpanded] = useState(false);
  const groups = collectBooksByTier(items);
  const totalBooks = TIER_ORDER.reduce((sum, tier) => sum + groups[tier].length, 0);
  const totalActive = TIER_ORDER.reduce((sum, tier) => sum + groups[tier].filter((b) => activeSources.has(b.source)).length, 0);

  function toggleEdition(rules) {
    const next = new Set(editions);
    if (next.has(rules)) next.delete(rules);
    else next.add(rules);
    onChangeEditions(next);
  }

  function toggleSource(source) {
    const next = new Set(activeSources);
    if (next.has(source)) next.delete(source);
    else next.add(source);
    onChangeSources(next);
  }

  function toggleGroup(tier, checked) {
    const next = new Set(activeSources);
    for (const book of groups[tier]) {
      if (checked) next.add(book.source);
      else next.delete(book.source);
    }
    onChangeSources(next);
  }

  return (
    <div className="origin-book-filter">
      <div className="origin-book-filter-bar">
        <span className="origin-book-filter-edition-label">Edição:</span>
        <label>
          <input type="checkbox" checked={editions.has("2014")} onChange={() => toggleEdition("2014")} />
          2014
        </label>
        <label>
          <input type="checkbox" checked={editions.has("2024")} onChange={() => toggleEdition("2024")} />
          2024
        </label>
        <button type="button" className="origin-book-filter-toggle" onClick={() => setExpanded((v) => !v)}>
          Livros ({totalActive}/{totalBooks}) {expanded ? "▲" : "▼"}
        </button>
      </div>
      {expanded && (
        <div className="origin-book-filter-panel">
          {TIER_ORDER.filter((tier) => groups[tier].length).map((tier) => {
            const bookList = groups[tier];
            const allChecked = bookList.every((b) => activeSources.has(b.source));
            const someChecked = bookList.some((b) => activeSources.has(b.source));
            return (
              <div className="origin-book-filter-group" key={tier}>
                <label className="origin-book-filter-group-header">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = !allChecked && someChecked;
                    }}
                    onChange={(event) => toggleGroup(tier, event.target.checked)}
                  />
                  <strong>{TIER_LABELS[tier]}</strong>
                </label>
                <div className="origin-book-filter-books">
                  {bookList.map((book) => (
                    <label key={book.source}>
                      <input
                        type="checkbox"
                        checked={activeSources.has(book.source)}
                        onChange={() => toggleSource(book.source)}
                      />
                      {book.sourceBook} <span className="origin-book-filter-source">[{book.source}]</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
