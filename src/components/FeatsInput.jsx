import { useState } from "react";
import { SourceItemPicker } from "./SourceItemPicker";
import { SpellChoicePicker } from "./SpellChoicePicker";
import { ChoicePicker } from "./ChoicePicker";
import { SKILLS } from "../schema/character";

// Mesmo padrão de "recapitula o que o item concede" já usado em
// StepPericias.jsx (GrantSummary) e OriginSuggestions.jsx -- faltava aqui:
// um talento com skillChoice/toolChoice (ex: "Musician" concede 3
// instrumentos musicais à escolha) nunca mostrava NENHUM picker, só a magia
// (spellChoices) era tratada. Reaproveita a mesma lógica de "Adicionado"
// (compara com as proficiências já gravadas no personagem) pro botão de
// concessão fixa não continuar dizendo "Adicionar" pra sempre.
function FeatGrants({ found, skillProficiencies, toolProficiencies, onApplySkills, onApplyTools }) {
  if (!found) return null;
  const hasSkills = found.skills?.length > 0 || found.skillChoice;
  const hasTools = found.tools?.length > 0 || found.toolChoice;
  if (!hasSkills && !hasTools) return null;

  const skillsAdded =
    found.skills?.length > 0 &&
    found.skills.every((label) => {
      const id = SKILLS.find((s) => s.label === label)?.id;
      return id && skillProficiencies?.includes(id);
    });
  const toolsAdded = found.tools?.length > 0 && found.tools.every((t) => toolProficiencies?.includes(t));

  return (
    <>
      {found.skills?.length > 0 && onApplySkills && (
        <p>
          Perícias: {found.skills.join(", ")}{" "}
          <button type="button" disabled={skillsAdded} onClick={() => onApplySkills(found.skills)}>
            {skillsAdded ? "Adicionado" : "Adicionar"}
          </button>
        </p>
      )}
      {found.skillChoice && onApplySkills && (
        <ChoicePicker
          key={`${found.name}-skills`}
          title="Perícias"
          count={found.skillChoice.count}
          from={found.skillChoice.from}
          category={found.skillChoice.category}
          onAdd={onApplySkills}
        />
      )}
      {found.tools?.length > 0 && onApplyTools && (
        <p>
          Ferramentas: {found.tools.join(", ")}{" "}
          <button type="button" disabled={toolsAdded} onClick={() => onApplyTools(found.tools)}>
            {toolsAdded ? "Adicionado" : "Adicionar"}
          </button>
        </p>
      )}
      {found.toolChoice && onApplyTools && (
        <ChoicePicker
          key={`${found.name}-tools`}
          title="Ferramentas"
          count={found.toolChoice.count}
          from={found.toolChoice.from}
          category={found.toolChoice.category}
          onAdd={onApplyTools}
        />
      )}
    </>
  );
}

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
export function FeatsInput({
  items,
  feats,
  onChange,
  onApplySpells,
  onApplySkills,
  onApplyTools,
  skillProficiencies,
  toolProficiencies,
  maxFeats,
  searchSlots,
}) {
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
              <FeatGrants
                found={found}
                skillProficiencies={skillProficiencies}
                toolProficiencies={toolProficiencies}
                onApplySkills={onApplySkills}
                onApplyTools={onApplyTools}
              />
              {onApplySpells &&
                found?.spellChoices
                  ?.filter((choice) => choice.pool.length > 0)
                  .map((choice, i) => (
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
