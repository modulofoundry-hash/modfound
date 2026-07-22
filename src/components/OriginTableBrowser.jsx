import { useMemo, useState } from "react";

// Tabela com colunas clicáveis pra ordenar + busca por nome — mesmo padrão do
// SpellBrowser.jsx, reaproveitado aqui pra Raça/Antecedente (ambos pedidos
// nesse formato). `columns` é uma lista de { key, label, render(item), sortValue(item) }
// — a primeira coluna sempre vira o botão de selecionar (nome).
function compareByColumn(a, b, column) {
  const av = column.sortValue ? column.sortValue(a) : a.name;
  const bv = column.sortValue ? column.sortValue(b) : b.name;
  if (typeof av === "number" && typeof bv === "number") return av - bv;
  return String(av ?? "").localeCompare(String(bv ?? ""));
}

// `selectedRules` (opcional) desempata quando duas entradas têm o MESMO nome
// em edições diferentes (ex: "Elf" 2014 e 2024) — sem isso, escolher uma
// destacaria as duas linhas ao mesmo tempo, já que o destaque comparava só
// pelo nome.
export function OriginTableBrowser({ items, columns, value, selectedRules, onPick, searchPlaceholder }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ column: columns[0].key, dir: "asc" });

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => item.name.toLowerCase().includes(needle));
  }, [items, search]);

  const sorted = useMemo(() => {
    const column = columns.find((c) => c.key === sort.column) ?? columns[0];
    const copy = [...filtered].sort((a, b) => compareByColumn(a, b, column));
    if (sort.dir === "desc") copy.reverse();
    return copy;
  }, [filtered, sort, columns]);

  function toggleSort(key) {
    setSort((prev) => (prev.column === key ? { column: key, dir: prev.dir === "asc" ? "desc" : "asc" } : { column: key, dir: "asc" }));
  }

  function sortArrow(key) {
    if (sort.column !== key) return "";
    return sort.dir === "asc" ? " ▲" : " ▼";
  }

  return (
    <div className="origin-table-browser">
      <input
        type="text"
        className="origin-table-search"
        placeholder={searchPlaceholder}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <div className="origin-table-wrap">
        <table className="origin-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>
                  <button type="button" onClick={() => toggleSort(col.key)}>
                    {col.label}
                    {sortArrow(col.key)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => {
              const isSelected = value === item.name && (!selectedRules || selectedRules === item.rules);
              return (
              <tr key={`${item.name}-${item.source}-${item.rules ?? ""}`} className={isSelected ? "origin-table-row-selected" : ""}>
                {columns.map((col, index) => (
                  <td key={col.key}>
                    {index === 0 ? (
                      <button type="button" className="origin-table-pick" onClick={() => onPick(item)}>
                        {item.name}
                        {item.rules && <span className={`rules-tag rules-tag-${item.rules}`}>{item.rules}</span>}
                      </button>
                    ) : (
                      col.render(item)
                    )}
                  </td>
                ))}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="origin-table-count">{sorted.length} resultado(s)</p>
    </div>
  );
}
