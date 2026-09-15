import { useMemo, useState } from "react";
import { OriginTableBrowser } from "../OriginTableBrowser";
import { OriginBookFilter, filterOriginItems, initialOriginFilter } from "../OriginBookFilter";
import { OriginSuggestions } from "../OriginSuggestions";
import { AbilityBonusPicker } from "../AbilityBonusPicker";
import { DescriptionPanel } from "../DescriptionPanel";
import { SourceItemPicker } from "../SourceItemPicker";

const COLUMNS = [
  { key: "name", label: "Nome" },
  {
    key: "skills",
    label: "Perícias",
    render: (item) => item.skills?.join(", ") || (item.skillChoice ? `${item.skillChoice.count} à escolha` : "—"),
    sortValue: (item) => item.skills?.join(", ") ?? "",
  },
  {
    key: "tools",
    label: "Ferramentas",
    render: (item) => item.tools?.join(", ") || (item.toolChoice ? `${item.toolChoice.count} à escolha` : "—"),
    sortValue: (item) => item.tools?.join(", ") ?? "",
  },
  { key: "rules", label: "Edição", render: (item) => item.rules || "—" },
];

// Regra "Customizing Your Origin" (PHB 2024) -- o Talento de Origem concedido
// pelo Antecedente não é travado: o jogador pode manter o padrão ou trocar
// por QUALQUER outro talento de categoria Origem (`subtype === "origin"`, 23
// no banco atual). `effective` já vem calculado pelo pai (override ou
// padrão) -- este componente só cuida da UI de troca em si.
function OriginFeatChoice({ background, effective, featsData, onPick }) {
  const [swapping, setSwapping] = useState(false);
  const [text, setText] = useState("");
  const originFeats = useMemo(() => featsData.filter((f) => f.subtype === "origin"), [featsData]);
  const isDefault = effective === background.originFeat;

  function handlePick(nextText, item) {
    setText(nextText);
    if (!item) return;
    onPick(item.name);
    setText("");
    setSwapping(false);
  }

  return (
    <div className="origin-feat-choice">
      <p>
        Talento de Origem: <strong>{effective}</strong>
        {!isDefault && (
          <span className="field-hint"> (trocado — padrão do antecedente é "{background.originFeat}")</span>
        )}
      </p>
      {!swapping ? (
        <div className="origin-feat-choice-actions">
          <button type="button" onClick={() => setSwapping(true)}>
            Trocar talento de origem
          </button>
          {!isDefault && (
            <button type="button" onClick={() => onPick(background.originFeat)}>
              Reverter pro padrão
            </button>
          )}
        </div>
      ) : (
        <div className="origin-feat-choice-actions">
          <SourceItemPicker items={originFeats} value={text} onChange={handlePick} placeholder="Buscar talento de origem..." />
          <button type="button" onClick={() => setSwapping(false)}>
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

export function StepAntecedente({
  items,
  value,
  selectedRules,
  rulesMode,
  matched,
  onPick,
  appliers,
  featsData,
  originFeatOverride,
  onPickOriginFeat,
}) {
  const [bookFilter, setBookFilter] = useState(() => initialOriginFilter(items));
  const filteredItems = useMemo(() => filterOriginItems(items, bookFilter), [items, bookFilter]);

  return (
    <div className="wizard-step-antecedente">
      <OriginBookFilter
        items={items}
        editions={bookFilter.editions}
        activeSources={bookFilter.activeSources}
        onChangeEditions={(editions) => setBookFilter((prev) => ({ ...prev, editions }))}
        onChangeSources={(activeSources) => setBookFilter((prev) => ({ ...prev, activeSources }))}
      />
      <OriginTableBrowser
        items={filteredItems}
        columns={COLUMNS}
        value={value}
        selectedRules={selectedRules}
        onPick={onPick}
        searchPlaceholder="Buscar antecedente..."
      />
      {/* Feature do antecedente 2014 (nome + texto pronto do livro, ex: Acolyte
          "Shelter of the Faithful") — antecedente 2024 não tem (ver DescriptionPanel.jsx). */}
      <DescriptionPanel cards={[{ title: "Antecedente", item: matched }]} />
      {/* Perícias/Ferramentas/Idiomas/Equipamento concedidos pelo antecedente
          NÃO aparecem aqui de propósito — mesma razão de StepRaca.jsx. */}
      <OriginSuggestions
        matched={matched}
        onApplySpells={appliers.applySpellChoices}
        showSkillsAndTools={false}
        showEquipment={false}
        showLanguages={false}
      />
      {rulesMode === "2024" && matched?.abilityBonus && (
        <AbilityBonusPicker
          // Chave própria (não só `matched.name`) -- essa string colidia com a
          // de `OriginFeatChoice` logo abaixo (as duas usavam `key={matched.name}`),
          // e o React trata isso como key duplicada entre irmãos: ao trocar de
          // antecedente, em vez de desmontar/remontar os dois de forma limpa,
          // ele "duplicava" o filho (aviso real do React no console: "Encountered
          // two children with the same key... may cause children to be
          // duplicated") -- exatamente o sintoma reportado (escolhas antigas
          // acumulando na tela em vez de sumir).
          key={`ability-${matched.name}`}
          label="Bônus de atributo (Antecedente)"
          abilityBonus={matched.abilityBonus}
          onApply={(picks) => appliers.applyAbilityBonusFor("background", picks)}
        />
      )}
      {rulesMode === "2024" && matched?.originFeat && (
        <OriginFeatChoice
          key={`originFeat-${matched.name}`}
          background={matched}
          effective={originFeatOverride || matched.originFeat}
          featsData={featsData}
          onPick={onPickOriginFeat}
        />
      )}
    </div>
  );
}
