import { useState } from "react";
import { SourceItemPicker } from "./SourceItemPicker";
import { SpellChoicePicker } from "./SpellChoicePicker";

// Busca-e-adiciona (não texto livre) — mostra a tag 2014/2024 de cada feat na
// hora de escolher (no dropdown do SourceItemPicker) e também na lista já
// adicionada, pra não perder de vista qual edição é cada um.
export function FeatsInput({ items, feats, onChange, onApplySpells }) {
  const [text, setText] = useState("");

  function handlePick(nextText, item) {
    setText(nextText);
    if (!item) return;
    if (!feats.includes(item.name)) onChange([...feats, item.name]);
    setText("");
  }

  function removeFeat(name) {
    onChange(feats.filter((f) => f !== name));
  }

  return (
    <div className="feats-input">
      <SourceItemPicker items={items} value={text} onChange={handlePick} placeholder="Buscar feat (ex: Skilled)" />
      <ul className="feats-list">
        {feats.map((name) => {
          const found = items.find((i) => i.name === name);
          return (
            <li key={name} className="feats-list-item">
              <div className="feats-list-item-row">
                <span>
                  {name}{" "}
                  {found?.rules && <span className={`rules-tag rules-tag-${found.rules}`}>{found.rules}</span>}
                </span>
                <button type="button" onClick={() => removeFeat(name)}>
                  Remover
                </button>
              </div>
              {onApplySpells &&
                found?.spellChoices?.map((choice, i) => (
                  <SpellChoicePicker
                    key={i}
                    title={`Magia (${name})`}
                    count={choice.count}
                    pool={choice.pool}
                    onAdd={onApplySpells}
                  />
                ))}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
