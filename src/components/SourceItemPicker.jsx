import { useMemo, useState } from "react";

// Busca com autocompletar sobre uma lista { name, source, ... }. Sempre aceita
// texto livre digitado (não força escolher um item da lista) — se o texto não
// bater com nada, o valor digitado é usado do mesmo jeito.
export function SourceItemPicker({ items, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const needle = (value ?? "").trim().toLowerCase();
    if (!needle) return [];
    return items.filter((item) => item.name.toLowerCase().includes(needle)).slice(0, 20);
  }, [items, value]);

  function selectItem(item) {
    onChange(item.name, item);
    setOpen(false);
  }

  return (
    <div className="source-picker">
      <input
        type="text"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value, null)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && matches.length > 0 && (
        <ul className="source-picker-list">
          {matches.map((item) => (
            <li key={`${item.name}-${item.source}-${item.rules ?? ""}`}>
              <button type="button" onMouseDown={() => selectItem(item)}>
                {item.name}{" "}
                {item.rules && <span className={`rules-tag rules-tag-${item.rules}`}>{item.rules}</span>}
                <span className="source-tag">[{item.source}]</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
