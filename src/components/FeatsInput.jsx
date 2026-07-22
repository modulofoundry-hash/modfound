import { useState } from "react";
import { SourceItemPicker } from "./SourceItemPicker";
import { SpellChoicePicker } from "./SpellChoicePicker";

// Busca-e-adiciona (não texto livre) — mostra a tag 2014/2024 de cada feat na
// hora de escolher (no dropdown do SourceItemPicker) e também na lista já
// adicionada, pra não perder de vista qual edição é cada um. `maxFeats`
// (opcional) trava o CONTADOR no total de talentos concedidos por
// Raça/Antecedente/Classe. `searchSlots` (opcional, independente de
// `maxFeats`) controla a BUSCA em si — só existe pra talento de ESCOLHA
// LIVRE (hoje, só a Raça concede isso); talento de origem do Antecedente e
// talento trocado por ASI de classe já vêm resolvidos sozinhos e não devem
// reabrir a busca só porque o contador total ainda não bateu o teto (ver
// CharacterCreationWizard.jsx openFeatChoiceSlots). Sem essa prop (uso no
// CharacterForm.jsx antigo), a busca continua sempre livre.
export function FeatsInput({ items, feats, onChange, onApplySpells, maxFeats, searchSlots }) {
  const [text, setText] = useState("");
  const atLimit = typeof maxFeats === "number" && feats.length >= maxFeats;
  const canSearch = typeof searchSlots !== "number" || searchSlots > 0;

  function handlePick(nextText, item) {
    setText(nextText);
    if (!item || atLimit || !canSearch) return;
    if (!feats.includes(item.name)) onChange([...feats, item.name]);
    setText("");
  }

  function removeFeat(name) {
    onChange(feats.filter((f) => f !== name));
  }

  return (
    <div className="feats-input">
      {typeof maxFeats === "number" && (
        <p className={`field-hint${atLimit ? " field-hint-warn" : ""}`}>
          {feats.length}/{maxFeats} talento(s) escolhido(s)
        </p>
      )}
      {!atLimit && canSearch && (
        <SourceItemPicker items={items} value={text} onChange={handlePick} placeholder="Buscar feat (ex: Skilled)" />
      )}
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
