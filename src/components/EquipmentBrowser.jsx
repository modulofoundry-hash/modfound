import { useMemo, useState } from "react";

// Mesmo molde do SpellBrowser.jsx (busca + filtros + tabela, dentro do mesmo
// `modal-backdrop`/`modal-panel-wide` já usado em todo lugar do site) --
// reaproveita as classes CSS `.spell-browser*` de propósito (são só estrutura
// de busca/tabela genérica, nada específico de magia nelas). Equipamento não
// tem filtro de "quem pode pegar" (qualquer personagem pode carregar
// qualquer item, diferente de magia por classe) -- só busca + tipo + edição
// (informativa, não trava nada, mesmo espírito de Raça/Antecedente/Feat).
const TYPE_LABELS = {
  weapon: "Arma",
  armorModelWeapon: "Arma de Armadura",
  magicItem: "Item Mágico",
  raw: "Item",
  loot: "Tesouro",
  tool: "Ferramenta",
  consumable: "Consumível",
  equipment: "Equipamento",
  container: "Recipiente",
  ammo: "Munição",
  clothing: "Vestimenta",
};

function typeLabel(type) {
  return TYPE_LABELS[type] ?? type ?? "—";
}

function formatPrice(priceGp) {
  if (!priceGp) return "—";
  return `${priceGp} po`;
}

function formatWeight(weight) {
  if (!weight) return "—";
  return `${weight} lb`;
}

function compareByColumn(a, b, column) {
  if (column === "type") return typeLabel(a.foundryType).localeCompare(typeLabel(b.foundryType)) || a.name.localeCompare(b.name);
  if (column === "price") return (a.priceGp ?? 0) - (b.priceGp ?? 0) || a.name.localeCompare(b.name);
  return a.name.localeCompare(b.name);
}

// `onAdd` recebe o ITEM inteiro (não só o nome) -- quem chama decide quais
// campos aproveitar (ex: FoundrySheetView só usa `name`, StepEquipamento
// também zera quantidade/equipado/sintonizado default).
export function EquipmentBrowser({ items, onAdd }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sort, setSort] = useState({ column: "name", dir: "asc" });

  const typeOptions = useMemo(() => [...new Set(items.map((i) => i.foundryType))].sort((a, b) => typeLabel(a).localeCompare(typeLabel(b))), [items]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter((item) => {
      if (needle && !item.name.toLowerCase().includes(needle)) return false;
      if (typeFilter && item.foundryType !== typeFilter) return false;
      return true;
    });
  }, [items, search, typeFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered].sort((a, b) => compareByColumn(a, b, sort.column));
    if (sort.dir === "desc") copy.reverse();
    return copy.slice(0, 200);
  }, [filtered, sort]);

  function toggleSort(column) {
    setSort((prev) => (prev.column === column ? { column, dir: prev.dir === "asc" ? "desc" : "asc" } : { column, dir: "asc" }));
  }

  function sortArrow(column) {
    if (sort.column !== column) return "";
    return sort.dir === "asc" ? " ▲" : " ▼";
  }

  return (
    <div className="spell-browser">
      <div className="spell-browser-filters">
        <input type="text" placeholder="Buscar item..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">Todos os tipos</option>
          {typeOptions.map((t) => (
            <option key={t} value={t}>
              {typeLabel(t)}
            </option>
          ))}
        </select>
      </div>
      <div className="spell-browser-table-wrap">
        <table className="spell-browser-table">
          <thead>
            <tr>
              <th>
                <button type="button" onClick={() => toggleSort("name")}>
                  Nome{sortArrow("name")}
                </button>
              </th>
              <th>
                <button type="button" onClick={() => toggleSort("type")}>
                  Tipo{sortArrow("type")}
                </button>
              </th>
              <th className="spell-browser-col-time">Peso</th>
              <th>
                <button type="button" onClick={() => toggleSort("price")}>
                  Preço{sortArrow("price")}
                </button>
              </th>
              <th className="spell-browser-col-edition">Edição</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => (
              <tr key={`${item.name}-${item.source}-${item.rules ?? ""}`}>
                <td>
                  <button type="button" className="spell-browser-pick" onClick={() => onAdd(item)}>
                    {item.name}
                  </button>
                </td>
                <td>{typeLabel(item.foundryType)}</td>
                <td className="spell-browser-col-time">{formatWeight(item.weight)}</td>
                <td>{formatPrice(item.priceGp)}</td>
                <td className="spell-browser-col-edition">
                  <span className={`rules-tag rules-tag-${item.rules}`}>{item.rules}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="spell-browser-count">
        {sorted.length} item(ns){filtered.length > sorted.length && ` (de ${filtered.length}, refine a busca)`}
      </p>
    </div>
  );
}
