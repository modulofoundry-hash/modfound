import { ABILITIES, ABILITY_LABELS } from "../../schema/character";
import { OriginTableBrowser } from "../OriginTableBrowser";

// Cada opção de bônus de atributo é um "chip" arrastável — "+2 num atributo"
// tem 1 chip de valor 2, "+1 em dois atributos" tem 2 chips de valor 1. Único
// lugar que define isso (CharacterCreationWizard.jsx reaproveita pra
// reverter o efeito quando o slot muda de escolha).
export const CHIP_DEFS = {
  ability2: [{ id: "a", amount: 2 }],
  ability11: [
    { id: "a", amount: 1 },
    { id: "b", amount: 1 },
  ],
};

const CHOICES = [
  { key: "ability2", label: "+2 num atributo" },
  { key: "ability11", label: "+1 em dois atributos" },
  { key: "feat", label: "Pegar um talento" },
];

const FEAT_COLUMNS = [
  { key: "name", label: "Nome" },
  { key: "rules", label: "Edição", render: (item) => item.rules || "—" },
];

// Reaproveita o visual de "arraste o valor pro atributo de destino" já usado
// em StepAtributos (Array Padrão/Rolagem) — aqui os chips SOMAM em cima do
// valor atual em vez de substituir, já que atributo não tem "base" guardada
// separada (o campo já é sempre o valor final, mesmo padrão de
// useCharacterAppliers.applyAbilityBonus).
function AbilityBonusAssign({ choice, assignments, abilities, onMove, onUnassign }) {
  const chips = CHIP_DEFS[choice] ?? [];
  const usedChipIds = new Set(Object.keys(assignments ?? {}));

  function handleDrop(abilityKey, event) {
    event.preventDefault();
    event.stopPropagation();
    const chipId = event.dataTransfer.getData("text/plain");
    const chip = chips.find((c) => c.id === chipId);
    if (chip) onMove(chipId, chip.amount, abilityKey);
  }

  return (
    <div className="ability-assign-pool">
      <div className="ability-pool-values">
        {chips
          .filter((c) => !usedChipIds.has(c.id))
          .map((chip) => (
            <div
              key={chip.id}
              className="ability-pool-chip"
              draggable
              onDragStart={(event) => {
                event.stopPropagation();
                event.dataTransfer.setData("text/plain", chip.id);
                event.dataTransfer.effectAllowed = "move";
              }}
            >
              +{chip.amount}
            </div>
          ))}
        {chips.every((c) => usedChipIds.has(c.id)) && <p className="ability-pool-empty">Bônus já distribuído.</p>}
      </div>
      <div className="abilities-grid">
        {ABILITIES.map((key) => {
          const chipId = Object.keys(assignments ?? {}).find((id) => assignments[id] === key);
          const chip = chips.find((c) => c.id === chipId);
          return (
            <div
              key={key}
              className={`ability-drop-zone${chip ? " ability-drop-zone-filled" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onDrop={(event) => handleDrop(key, event)}
            >
              <span className="ability-drop-zone-label">{ABILITY_LABELS[key]}</span>
              <span className="ability-drop-zone-value">
                {abilities[key]}
                {chip && ` (+${chip.amount})`}
              </span>
              {chip && (
                <button
                  type="button"
                  className="ability-drop-zone-clear"
                  aria-label={`Remover bônus de ${ABILITY_LABELS[key]}`}
                  onClick={() => onUnassign(chipId, chip.amount)}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ImprovementSlotCard({ slot, improvement, abilities, featsData, onSetChoice, onMoveChip, onUnassignChip, onPickFeat }) {
  const choice = improvement?.choice ?? null;

  return (
    <div className="melhoria-slot">
      <h4 className="melhoria-slot-title">
        {slot.className || "Classe"} — Nível {slot.level}
      </h4>
      <div className="ability-method-picker">
        {CHOICES.map((c) => (
          <div key={c.key} className={`ability-method-option${choice === c.key ? " ability-method-option-selected" : ""}`}>
            <button type="button" onClick={() => onSetChoice(slot.classIndex, slot.level, c.key)}>
              {c.label}
            </button>
          </div>
        ))}
      </div>

      {(choice === "ability2" || choice === "ability11") && (
        <AbilityBonusAssign
          choice={choice}
          assignments={improvement?.assignments}
          abilities={abilities}
          onMove={(chipId, amount, abilityKey) => onMoveChip(slot.classIndex, slot.level, chipId, amount, abilityKey)}
          onUnassign={(chipId, amount) => onUnassignChip(slot.classIndex, slot.level, chipId, amount)}
        />
      )}

      {choice === "feat" && (
        <div className="melhoria-feat-picker">
          {improvement?.feat && (
            <p className="field-hint">
              Talento escolhido: <strong>{improvement.feat}</strong>
            </p>
          )}
          <OriginTableBrowser
            items={featsData}
            columns={FEAT_COLUMNS}
            value={improvement?.feat}
            selectedRules={improvement?.featRules}
            onPick={(item) => onPickFeat(slot.classIndex, slot.level, item)}
            searchPlaceholder="Buscar talento..."
          />
        </div>
      )}
    </div>
  );
}

export function StepMelhorias({ slots, abilities, abilityImprovements, featsData, onSetChoice, onMoveChip, onUnassignChip, onPickFeat }) {
  return (
    <div className="wizard-step-melhorias">
      {slots.map((slot) => {
        const improvement = abilityImprovements.find((i) => i.classIndex === slot.classIndex && i.level === slot.level);
        return (
          <ImprovementSlotCard
            key={`${slot.classIndex}-${slot.level}`}
            slot={slot}
            improvement={improvement}
            abilities={abilities}
            featsData={featsData}
            onSetChoice={onSetChoice}
            onMoveChip={onMoveChip}
            onUnassignChip={onUnassignChip}
            onPickFeat={onPickFeat}
          />
        );
      })}
    </div>
  );
}
