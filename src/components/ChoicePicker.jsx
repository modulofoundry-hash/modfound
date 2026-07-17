import { useState } from "react";

// Escolha de N perícias/ferramentas dentro da própria caixa de sugestão
// (em vez de só listar e mandar o jogador marcar na seção separada).
export function ChoicePicker({ title, count, from, onAdd }) {
  const [selected, setSelected] = useState([]);

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
        {from.map((label) => (
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
