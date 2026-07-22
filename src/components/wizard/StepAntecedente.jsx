import { OriginTableBrowser } from "../OriginTableBrowser";
import { OriginSuggestions } from "../OriginSuggestions";
import { AbilityBonusPicker } from "../AbilityBonusPicker";

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
  return (
    <div className="wizard-step-antecedente">
      <OriginTableBrowser
        items={items}
        columns={COLUMNS}
        value={value}
        selectedRules={selectedRules}
        onPick={onPick}
        searchPlaceholder="Buscar antecedente..."
      />
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
          label="Bônus de atributo (Antecedente)"
          abilityBonus={matched.abilityBonus}
          onApply={appliers.applyAbilityBonus}
        />
      )}
    </div>
  );
}
