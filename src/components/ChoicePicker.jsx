import { useState } from "react";
import { SKILLS } from "../schema/character";

// `from` normalmente é array de rótulo (perícia/ferramenta) — mas o banco também usa
// o texto-sentinela "qualquer perícia"/"qualquer perícia à escolha" (ex: Bardo,
// Humano Variante, Custom Lineage) pra dizer "todas as 18", mesmo padrão que o
// módulo já trata em `resolveSkillPool()` (dnd5eCodes.js). Sem tratar isso aqui,
// `from.map` quebrava a página INTEIRA assim que Bardo era escolhido como classe
// (achado testando ao vivo). Ferramenta não tem esse sentinela na base hoje — string
// não reconhecida vira lista vazia (não quebra, só não sugere nada) em vez de invenção.
function resolveChoicePool(from) {
  if (Array.isArray(from)) return from;
  if (typeof from === "string" && from.toLowerCase().includes("qualquer")) return SKILLS.map((s) => s.label);
  return [];
}

// Escolha de N perícias/ferramentas dentro da própria caixa de sugestão
// (em vez de só listar e mandar o jogador marcar na seção separada).
export function ChoicePicker({ title, count, from, onAdd }) {
  const [selected, setSelected] = useState([]);
  const options = resolveChoicePool(from);

  function toggle(label) {
    setSelected((prev) => {
      if (prev.includes(label)) return prev.filter((s) => s !== label);
      if (prev.length >= count) return prev;
      return [...prev, label];
    });
  }

  return (
    <div className="choice-picker">
      <p>
        {title} (escolha {count}):
      </p>
      <div className="choice-picker-options">
        {options.map((label) => (
          <label key={label} className="choice-picker-option">
            <input
              type="checkbox"
              checked={selected.includes(label)}
              disabled={!selected.includes(label) && selected.length >= count}
              onChange={() => toggle(label)}
            />
            {label}
          </label>
        ))}
      </div>
      <button type="button" disabled={selected.length === 0} onClick={() => onAdd(selected)}>
        Adicionar
      </button>
    </div>
  );
}
