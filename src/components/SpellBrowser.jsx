import { useMemo, useState } from "react";

// `spells` vem de site/src/data/content/spells.json (extraído ao vivo do
// compêndio do Foundry, ver shared/schema/README.md). Edição é filtro DURO
// (igual classe) -- `rulesMode` do personagem decide de cara qual metade da
// base entra em jogo, sem alternar dentro do próprio navegador.
const LEVEL_LABEL = (level) => (level === 0 ? "Truque" : `${level}º`);

function compareByColumn(a, b, column) {
  if (column === "level") return a.level - b.level || a.name.localeCompare(b.name);
  return a.name.localeCompare(b.name);
}

// `canAdd` (opcional) — quando devolve `false` pra uma magia, o botão dela
// fica desabilitado em vez de escondido (ex: truque conhecido/magia conhecida
// já bateu o teto do nível atual, ver spellProgression.js). Sem essa prop
// (uso antigo), toda magia continua sempre clicável.
export function SpellBrowser({ spells, rulesMode, onAdd, canAdd }) {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [sort, setSort] = useState({ column: "name", dir: "asc" });

  const editionSpells = useMemo(() => spells.filter((s) => s.rules === rulesMode), [spells, rulesMode]);

  const classOptions = useMemo(() => {
    const set = new Set();
    for (const s of editionSpells) for (const c of s.classes) set.add(c);
    return [...set].sort();
  }, [editionSpells]);

  const schoolOptions = useMemo(() => [...new Set(editionSpells.map((s) => s.school))].sort(), [editionSpells]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return editionSpells.filter((s) => {
      if (needle && !s.name.toLowerCase().includes(needle)) return false;
      if (classFilter && !s.classes.includes(classFilter)) return false;
      if (levelFilter !== "" && s.level !== Number(levelFilter)) return false;
      if (schoolFilter && s.school !== schoolFilter) return false;
      return true;
    });
  }, [editionSpells, search, classFilter, levelFilter, schoolFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered].sort((a, b) => compareByColumn(a, b, sort.column));
    if (sort.dir === "desc") copy.reverse();
    return copy;
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
        <input type="text" placeholder="Buscar magia..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="">Todas as classes</option>
          {classOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
          <option value="">Todos os níveis</option>
          {Array.from({ length: 10 }, (_, level) => (
            <option key={level} value={level}>
              {LEVEL_LABEL(level)}
            </option>
          ))}
        </select>
        <select value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)}>
          <option value="">Todas as escolas</option>
          {schoolOptions.map((s) => (
            <option key={s} value={s}>
              {s}
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
              <th className="spell-browser-col-level">
                <button type="button" onClick={() => toggleSort("level")}>
                  Nível{sortArrow("level")}
                </button>
              </th>
              <th className="spell-browser-col-time">Tempo</th>
              <th className="spell-browser-col-school">Escola</th>
              <th className="spell-browser-col-conc" title="Concentração">
                C.
              </th>
              <th className="spell-browser-col-range">Alcance</th>
              <th className="spell-browser-col-edition">Edição</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((spell) => {
              const disabled = canAdd ? !canAdd(spell) : false;
              return (
              <tr key={spell.name} className={disabled ? "spell-browser-row-disabled" : undefined}>
                <td>
                  <button
                    type="button"
                    className="spell-browser-pick"
                    disabled={disabled}
                    title={disabled ? "Limite de magias conhecidas/truques deste nível já atingido" : undefined}
                    onClick={() => onAdd(spell.name)}
                  >
                    {spell.name}
                  </button>
                </td>
                <td className="spell-browser-col-level">{LEVEL_LABEL(spell.level)}</td>
                <td className="spell-browser-col-time">{spell.time}</td>
                <td className="spell-browser-col-school">{spell.school}</td>
                <td className="spell-browser-col-conc">{spell.concentration ? "●" : ""}</td>
                <td className="spell-browser-col-range">{spell.range}</td>
                <td className="spell-browser-col-edition">
                  <span className={`rules-tag rules-tag-${spell.rules}`}>{spell.rules}</span>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="spell-browser-count">{sorted.length} magia(s)</p>
    </div>
  );
}
