import { useMemo, useState } from "react";
import { OriginTableBrowser } from "../OriginTableBrowser";
import { OriginBookFilter, filterOriginItems, initialOriginFilter } from "../OriginBookFilter";
import { OriginSuggestions } from "../OriginSuggestions";
import { AbilityBonusPicker } from "../AbilityBonusPicker";
import { DescriptionPanel } from "../DescriptionPanel";

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

export function StepAntecedente({ items, value, selectedRules, rulesMode, matched, onPick, appliers }) {
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
          key={matched.name}
          label="Bônus de atributo (Antecedente)"
          abilityBonus={matched.abilityBonus}
          onApply={(picks) => appliers.applyAbilityBonusFor("background", picks)}
        />
      )}
    </div>
  );
}
