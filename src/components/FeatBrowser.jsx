import { useMemo, useState } from "react";

// Mesmo molde do SpellBrowser.jsx/EquipmentBrowser.jsx -- busca + filtro de
// edição, dentro do mesmo modal já usado em todo lugar do site. `excludeNames`
// (opcional) tira os talentos que o personagem já tem, pra não duplicar.
function stripHtml(html) {
  return (html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function excerpt(text, max = 130) {
  const clean = stripHtml(text);
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
}

export function FeatBrowser({ items, excludeNames, onAdd }) {
  const [search, setSearch] = useState("");
  const [rulesFilter, setRulesFilter] = useState("");

  const rulesOptions = useMemo(() => [...new Set(items.map((i) => i.rules).filter(Boolean))].sort(), [items]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter((item) => {
      if (excludeNames?.has(item.name)) return false;
      if (needle && !item.name.toLowerCase().includes(needle)) return false;
      if (rulesFilter && item.rules !== rulesFilter) return false;
      return true;
    });
  }, [items, search, rulesFilter, excludeNames]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 200), [filtered]);

  return (
    <div className="spell-browser">
      <div className="spell-browser-filters">
        <input type="text" placeholder="Buscar talento..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={rulesFilter} onChange={(e) => setRulesFilter(e.target.value)}>
          <option value="">Todas as edições</option>
          {rulesOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <div className="spell-browser-table-wrap">
        <table className="spell-browser-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th className="spell-browser-col-edition">Edição</th>
              <th>Descrição</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => (
              <tr key={`${item.name}-${item.source}-${item.rules ?? ""}`}>
                <td>
                  <button type="button" className="spell-browser-pick" onClick={() => onAdd(item.name)}>
                    {item.name}
                  </button>
                </td>
                <td className="spell-browser-col-edition">
                  <span className={`rules-tag rules-tag-${item.rules}`}>{item.rules}</span>
                </td>
                <td style={{ whiteSpace: "normal" }}>{excerpt(item.description)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="spell-browser-count">
        {sorted.length} talento(s){filtered.length > sorted.length && ` (de ${filtered.length}, refine a busca)`}
      </p>
    </div>
  );
}
