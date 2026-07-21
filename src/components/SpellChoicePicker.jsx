import { useMemo, useState } from "react";

// Escolha de magia por filtro (ex: Elfo Alto "1 truque de Mago à escolha", Magic Initiate
// "2 truques + 1 magia de nível 1") — `pool` já vem pronto do banco (nomes de magia válidos,
// pré-calculados contra a Lista de Magia por Classe oficial do Foundry, ver
// resolveSpellChoices.js/generate-site-content.mjs), o componente só busca+escolhe dentro
// dele. Sem isso, o jogador teria que adivinhar de cabeça qual magia bate no filtro — o que
// motivou essa feature inteira (ver [[project_out_of_service]] item 4, gap achado testando
// o fluxo completo site→Firestore→módulo→Actor).
export function SpellChoicePicker({ title, count, pool, onAdd }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState([]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return pool.filter((name) => name.toLowerCase().includes(needle) && !selected.includes(name)).slice(0, 20);
  }, [query, pool, selected]);

  function pick(name) {
    if (selected.length >= count) return;
    setSelected((prev) => [...prev, name]);
    setQuery("");
  }

  function unpick(name) {
    setSelected((prev) => prev.filter((s) => s !== name));
  }

  function apply() {
    onAdd(selected);
    setSelected([]);
  }

  return (
    <div className="spell-choice-picker">
      <p>
        {title} (escolha {count} de {pool.length}):
      </p>
      {selected.length > 0 && (
        <div className="spell-choice-picker-selected">
          {selected.map((name) => (
            <span key={name} className="tag">
              {name}{" "}
              <button type="button" onClick={() => unpick(name)}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar magia..."
        disabled={selected.length >= count}
      />
      {matches.length > 0 && (
        <ul className="spell-choice-picker-list">
          {matches.map((name) => (
            <li key={name}>
              <button type="button" onClick={() => pick(name)}>
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" disabled={selected.length === 0} onClick={apply}>
        Adicionar
      </button>
    </div>
  );
}
