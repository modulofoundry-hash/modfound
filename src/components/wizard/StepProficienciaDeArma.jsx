import { OriginTableBrowser } from "../OriginTableBrowser";

const COLUMNS = [{ key: "name", label: "Arma" }];

// Mesmo esqueleto visual de WeaponMasterySlotCard (StepMaestriaDeArma.jsx) -- só que
// o pool aqui é TODA arma da categoria resolvida (não "já proficiente").
function WeaponProficiencySlotCard({ slot, onPick, onClear }) {
  return (
    <div className="melhoria-slot">
      <h4 className="melhoria-slot-title">{slot.sourceName} — Proficiência com Arma</h4>
      <div className="melhoria-feat-picker">
        {Array.from({ length: slot.count }, (_, i) => {
          const chosenKey = slot.chosen[i];
          const chosenLabel = chosenKey ? (slot.pool.find((w) => w.key === chosenKey)?.name ?? chosenKey) : null;
          return (
            <div key={i} className="class-choice-pick">
              {chosenLabel && (
                <p className="field-hint">
                  Escolha {i + 1}: <strong>{chosenLabel}</strong>{" "}
                  <button type="button" onClick={() => onClear(slot.sourceKey, i)}>
                    remover
                  </button>
                </p>
              )}
              {!chosenLabel && (
                <OriginTableBrowser
                  items={slot.pool}
                  columns={COLUMNS}
                  value={null}
                  onPick={(item) => onPick(slot.sourceKey, i, item.key)}
                  searchPlaceholder="Buscar arma..."
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// `slots` já vem pronto do wizard principal (weaponProficiencySlots).
export function StepProficienciaDeArma({ slots, weaponProficiencies, onPick, onClear }) {
  if (!slots.length) return null;
  return (
    <div className="wizard-step-proficiencia-arma">
      {slots.map((slot) => (
        <WeaponProficiencySlotCard
          key={slot.sourceKey}
          slot={{ ...slot, chosen: weaponProficiencies.filter((c) => c.sourceKey === slot.sourceKey).map((c) => c.weaponKey) }}
          onPick={onPick}
          onClear={onClear}
        />
      ))}
    </div>
  );
}
