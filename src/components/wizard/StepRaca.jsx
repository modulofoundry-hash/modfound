import { useMemo, useState } from "react";
import { OriginTableBrowser } from "../OriginTableBrowser";
import { OriginBookFilter, filterOriginItems, initialOriginFilter } from "../OriginBookFilter";
import { OriginSuggestions } from "../OriginSuggestions";
import { DescriptionPanel } from "../DescriptionPanel";
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
  const [bookFilter, setBookFilter] = useState(() => initialOriginFilter(items));
  const filteredItems = useMemo(() => filterOriginItems(items, bookFilter), [items, bookFilter]);

  return (
    <div className="wizard-step-raca">
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
        searchPlaceholder="Buscar raça/espécie..."
      />
      {/* Traits da raça (Darkvision/Fey Ancestry/etc, nome + texto pronto do livro) —
          mostra assim que o jogador seleciona, pedido explícito do usuário pra saber
          "o que essa raça concede" sem precisar abrir a ficha depois. */}
      <DescriptionPanel cards={[{ title: "Raça", item: matched }]} />
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
          key={matched.name}
          label="Bônus de atributo (Raça)"
          abilityBonus={matched.abilityBonus}
          onApply={(picks) => appliers.applyAbilityBonusFor("race", picks)}
        />
      )}
      <SensesInput senses={senses} onChange={onChangeSenses} />
    </div>
  );
}
