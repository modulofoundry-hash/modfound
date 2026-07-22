import { OriginTableBrowser } from "../OriginTableBrowser";
import { OriginSuggestions } from "../OriginSuggestions";
import { AbilityBonusPicker } from "../AbilityBonusPicker";
import { SensesInput } from "../SensesInput";
import { SIZE_LABELS } from "../../schema/character";

// Mesmo formato aceito em OriginPicker.jsx: string "M"/"S/M" (raça 2014) ou
// array ["S","M"] (raça 2024).
function formatSize(size) {
  const letters = Array.isArray(size) ? size : typeof size === "string" ? size.split("/").filter(Boolean) : [];
  if (!letters.length) return "—";
  return letters.map((code) => SIZE_LABELS[code] ?? code).join(" ou ");
}

const COLUMNS = [
  { key: "name", label: "Nome" },
  { key: "size", label: "Tamanho", render: (item) => formatSize(item.size), sortValue: (item) => formatSize(item.size) },
  { key: "speed", label: "Velocidade", render: (item) => (item.speed ? `${item.speed} pés` : "—"), sortValue: (item) => item.speed ?? 0 },
  { key: "languages", label: "Idiomas", render: (item) => item.languages || "—" },
  { key: "rules", label: "Edição", render: (item) => item.rules || "—" },
];

export function StepRaca({ items, value, selectedRules, rulesMode, matched, onPick, sizeValue, senses, onChangeSenses, appliers }) {
  return (
    <div className="wizard-step-raca">
      <OriginTableBrowser
        items={items}
        columns={COLUMNS}
        value={value}
        selectedRules={selectedRules}
        onPick={onPick}
        searchPlaceholder="Buscar raça/espécie..."
      />
      {/* Perícias/Ferramentas/Idiomas/Equipamento concedidos pela raça NÃO
          aparecem aqui de propósito — pedido do usuário: só nas etapas
          dedicadas (Perícias/Idiomas), discriminando de onde e quantas dá
          pra escolher (ver StepPericias.jsx/StepIdiomas.jsx). */}
      <OriginSuggestions
        matched={matched}
        onApplySize={appliers.applySize}
        onApplySpells={appliers.applySpellChoices}
        sizeValue={sizeValue}
        showSkillsAndTools={false}
        showEquipment={false}
        showLanguages={false}
      />
      {rulesMode === "2014" && matched?.abilityBonus && (
        <AbilityBonusPicker
          label="Bônus de atributo (Raça)"
          abilityBonus={matched.abilityBonus}
          onApply={appliers.applyAbilityBonus}
        />
      )}
      <SensesInput senses={senses} onChange={onChangeSenses} />
    </div>
  );
}
