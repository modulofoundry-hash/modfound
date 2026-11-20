import { useState } from "react";
import { SourceItemPicker } from "./SourceItemPicker";
import { SpellChoicePicker } from "./SpellChoicePicker";
import { ChoicePicker, TOOLS } from "./ChoicePicker";
import { FeatAbilityBonusPicker } from "./FeatAbilityBonusPicker";
import { SKILLS, featName, featRules } from "../schema/character";

// Pool combinado pro talento Skilled (`mixedProficiencyChoice` — "3 perícias
// OU ferramentas, em qualquer combinação"). Achado nesta auditoria: o campo
// já vem resolvido certo pro MÓDULO (`buildFeatItem.js`), mas o SITE nunca
// tinha picker nenhum pra ele -- escolher Skilled não concedia nada.
const SKILL_OR_TOOL_LABELS = [...SKILLS.map((s) => s.label), ...TOOLS];

// Mesmo padrão de "recapitula o que o item concede" já usado em
// StepPericias.jsx (GrantSummary) e OriginSuggestions.jsx -- faltava aqui:
// um talento com skillChoice/toolChoice (ex: "Musician" concede 3
// instrumentos musicais à escolha) nunca mostrava NENHUM picker, só a magia
// (spellChoices) era tratada. Reaproveita a mesma lógica de "Adicionado"
// (compara com as proficiências já gravadas no personagem) pro botão de
// concessão fixa não continuar dizendo "Adicionar" pra sempre.
export function FeatGrants({
  found,
  skillProficiencies,
  toolProficiencies,
  onApplySkills,
  onApplyTools,
  onApplyAbilityBonus,
  onApplyResistance,
}) {
  if (!found) return null;
  const hasSkills = found.skills?.length > 0 || found.skillChoice;
  const hasTools = found.tools?.length > 0 || found.toolChoice;
  const hasAbilityBonus =
    !!found.abilityBonus && (found.abilityBonus.choice || found.abilityBonus.fixed || typeof found.abilityBonus.points === "number");
  const mixedCount = found.mixedProficiencyChoice?.raw?.[0]?.choose?.[0]?.count;
  const hasMixedProficiency = typeof mixedCount === "number";
  const hasResistanceChoice = !!found.resistanceChoice?.from?.length;
  if (!hasSkills && !hasTools && !hasAbilityBonus && !hasMixedProficiency && !found.resistances?.length && !hasResistanceChoice)
    return null;

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
          <button type="button" disabled={skillsAdded} onClick={() => onApplySkills(found.name, found.skills)}>
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
          onAdd={(labels) => onApplySkills(found.name, labels)}
        />
      )}
      {found.tools?.length > 0 && onApplyTools && (
        <p>
          Ferramentas: {found.tools.join(", ")}{" "}
          <button type="button" disabled={toolsAdded} onClick={() => onApplyTools(found.name, found.tools)}>
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
          onAdd={(labels) => onApplyTools(found.name, labels)}
        />
      )}
      {hasMixedProficiency && onApplySkills && onApplyTools && (
        <ChoicePicker
          key={`${found.name}-mixed`}
          title="Perícias ou Ferramentas"
          count={mixedCount}
          from={SKILL_OR_TOOL_LABELS}
          onAdd={(labels) => {
            const skillLabels = labels.filter((l) => SKILLS.some((s) => s.label === l));
            const toolLabels = labels.filter((l) => !skillLabels.includes(l));
            if (skillLabels.length) onApplySkills(found.name, skillLabels);
            if (toolLabels.length) onApplyTools(found.name, toolLabels);
          }}
        />
      )}
      {hasAbilityBonus && onApplyAbilityBonus && (
        <FeatAbilityBonusPicker
          key={`${found.name}-abilitybonus`}
          label="Bônus de Atributo"
          abilityBonus={found.abilityBonus}
          onApply={(picks) => onApplyAbilityBonus(`feat-${found.name}`, picks)}
        />
      )}
      {found.resistances?.length > 0 && (
        <p>Resistência a Dano: {found.resistances.join(", ")} (automática, sempre ativa).</p>
      )}
      {hasResistanceChoice && onApplyResistance && (
        <ChoicePicker
          key={`${found.name}-resistance`}
          title="Resistência a Dano"
          count={found.resistanceChoice.count ?? 1}
          from={found.resistanceChoice.from}
          onAdd={(labels) => onApplyResistance(found.name, labels)}
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
  onApplyAbilityBonus,
  onApplyResistance,
  onRevertGrants,
  skillProficiencies,
  toolProficiencies,
  maxFeats,
  searchSlots,
}) {
  const [text, setText] = useState("");
  const atLimit = typeof maxFeats === "number" && feats.length >= maxFeats;
  const canSearch = typeof searchSlots !== "number" || searchSlots > 0;

  // `{name, rules}` desde nov/2026 (ver schema/character.js) -- antes só
  // guardava o nome, sem jeito de saber qual EDIÇÃO foi escolhida quando o
  // mesmo nome existe em 2014 e 2024 com mecânica diferente (achado
  // auditando Great Weapon Master/Sharpshooter). Dedup continua por NOME só
  // (um personagem não pode ter as duas edições do mesmo talento).
  function handlePick(nextText, item) {
    setText(nextText);
    if (!item || atLimit || !canSearch) return;
    if (!feats.some((f) => featName(f) === item.name)) onChange([...feats, { name: item.name, rules: item.rules }]);
    setText("");
  }

  // Achado real (set/2026): remover o talento tirava só o nome de
  // `character.feats`, mas a perícia/ferramenta/bônus de atributo que ele
  // tinha concedido (via os botões "Adicionar" acima) ficava grudada pra
  // sempre. `onRevertGrants` desfaz os dois de uma vez.
  function removeFeat(name) {
    onChange(feats.filter((f) => featName(f) !== name));
    onRevertGrants?.(name);
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
        {feats.map((entry) => {
          const name = featName(entry);
          const rules = featRules(entry);
          // Prefere a edição exata que foi escolhida; cai pro nome sozinho
          // só pra entrada ANTIGA (string solta, sem `rules` guardado).
          const found = (rules && items.find((i) => i.name === name && i.rules === rules)) || items.find((i) => i.name === name);
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
                onApplyAbilityBonus={onApplyAbilityBonus}
                onApplyResistance={onApplyResistance}
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
