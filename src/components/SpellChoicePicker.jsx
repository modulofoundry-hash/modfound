import { useMemo, useState } from "react";

// Escolha de magia por filtro (ex: Elfo Alto "1 truque de Mago à escolha", Magic Initiate
// "2 truques + 1 magia de nível 1") — `pool` já vem pronto do banco (nomes de magia válidos,
// pré-calculados contra a Lista de Magia por Classe oficial do Foundry, ver
// resolveSpellChoices.js/generate-site-content.mjs), o componente só busca+escolhe dentro
// dele. Sem isso, o jogador teria que adivinhar de cabeça qual magia bate no filtro — o que
// motivou essa feature inteira (ver [[project_out_of_service]] item 4, gap achado testando
// o fluxo completo site→Firestore→módulo→Actor).
//
// DOIS MODOS (achado revisando a pedido do usuário: a etapa "Magias" usava esta busca
// primitiva — só nome, sem nível/escola/tempo, sem ordenar — bem mais pobre que o buscador
// completo já usado no botão "Buscar magia" principal):
// - `onOpenBrowser` PRESENTE (StepMagias.jsx, escolha de subclasse/talento na etapa
//   Magias): abre o MESMO modal `SpellBrowser` completo, restrito a `pool`, mantendo o
//   `title` visível no cabeçalho do modal (qual feature está concedendo a escolha) — a
//   contagem de já-escolhidas vem de `spells` (lista completa do personagem, filtrada por
//   `bonus:true` + nome dentro de `pool`), não de estado local.
// - `onOpenBrowser` AUSENTE (OriginSuggestions.jsx — Raça/Antecedente, FeatsInput.jsx —
//   escolha de magia de um talento na etapa Feats): comportamento ORIGINAL preservado,
//   busca-e-lista própria com acumulação local antes de aplicar em lote (`Adicionar`) —
//   esses dois contextos não têm acesso a um modal compartilhado, mudar exigiria replicar
//   a mesma arquitetura de "picker ativo" em mais 2 lugares, fora do pedido desta rodada.
export function SpellChoicePicker({ pickerKey, title, count, pool, spells, onAdd, onOpenBrowser }) {
  if (onOpenBrowser) {
    const chosen = (spells ?? []).filter((s) => s.bonus && pool.includes(s.name));
    const remaining = count - chosen.length;
    return (
      <div className="spell-choice-picker">
        <p>
          {title} (escolha {count} de {pool.length}): {chosen.length}/{count}
        </p>
        {chosen.length > 0 && (
          <div className="spell-choice-picker-selected">
            {chosen.map((s) => (
              <span key={s.name} className="tag">
                {s.name}
              </span>
            ))}
          </div>
        )}
        <button
          type="button"
          disabled={remaining <= 0}
          onClick={() => onOpenBrowser({ key: pickerKey, title, pool, count, onAdd })}
        >
          Buscar magia
        </button>
      </div>
    );
  }

  return <SpellChoicePickerInline title={title} count={count} pool={pool} onAdd={onAdd} />;
}

// Implementação original (busca-e-lista simples com acumulação local) -- preservada tal e
// qual pros 2 contextos que não abrem o modal compartilhado (ver comentário acima).
function SpellChoicePickerInline({ title, count, pool, onAdd }) {
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
