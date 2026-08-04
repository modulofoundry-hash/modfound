import { OriginTableBrowser } from "../OriginTableBrowser";
import { WEAPON_MASTERY_TABLE } from "../../utils/weaponMastery";

const COLUMNS = [
  { key: "name", label: "Arma" },
  { key: "mastery", label: "Propriedade de Maestria", render: (item) => item.mastery },
];

function poolFor(slot, proficientKeys) {
  return [...proficientKeys]
    .filter((key) => !slot.melee || WEAPON_MASTERY_TABLE[key]?.melee)
    .map((key) => ({ key, name: WEAPON_MASTERY_TABLE[key]?.label ?? key, mastery: WEAPON_MASTERY_TABLE[key]?.mastery ?? "—" }));
}

// Um card por slot (classe ou talento), com `count` pickers independentes -- mesmo
// esqueleto visual de ChoiceSlotCard (StepEscolhasDeClasse.jsx), só que o pool aqui não
// vem de um JSON de conteúdo, é computado (armas que o personagem já é proficiente, ver
// resolveFixedWeaponProficiency em utils/weaponMastery.js).
function WeaponMasterySlotCard({ slot, proficientKeys, weapons, onPick, onClear }) {
  return (
    <div className="melhoria-slot">
      <h4 className="melhoria-slot-title">
        {slot.className} — Weapon Mastery{slot.melee ? " (corpo-a-corpo)" : ""}
      </h4>
      <div className="melhoria-feat-picker">
        {Array.from({ length: slot.count }, (_, i) => {
          const chosenKey = weapons[i];
          const chosenLabel = chosenKey ? (WEAPON_MASTERY_TABLE[chosenKey]?.label ?? chosenKey) : null;
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
                  items={poolFor(slot, proficientKeys)}
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

// `slots` já vem pronto do wizard principal (weaponMasterySlots). `proficientKeys` (Set)
// já vem pronto também (resolveFixedWeaponProficiency) -- ver comentário lá sobre a
// limitação assumida (escolhas abertas de arma não capturadas hoje).
export function StepMaestriaDeArma({ slots, weaponMasteryChoices, proficientKeys, onPick, onClear }) {
  if (!slots.length) {
    return <p className="field-hint">Nenhuma classe ou talento deste personagem concede Weapon Mastery (2024) ainda.</p>;
  }
  return (
    <div className="wizard-step-maestria-arma">
      {slots.map((slot) => {
        const weapons = weaponMasteryChoices.filter((c) => c.sourceKey === slot.sourceKey).map((c) => c.weaponKey);
        return (
          <WeaponMasterySlotCard
            key={slot.sourceKey}
            slot={slot}
            proficientKeys={proficientKeys}
            weapons={weapons}
            onPick={onPick}
            onClear={onClear}
          />
        );
      })}
    </div>
  );
}
