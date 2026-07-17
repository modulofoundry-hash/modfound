import { useState } from "react";
import equipmentCategories from "../data/srd/equipmentCategories.json";

function OptionRow({ option, onAdd, disabled, chosen }) {
  const categoryIndexes = option.grants
    .map((grant, index) => (grant.type === "category" ? index : null))
    .filter((index) => index !== null);

  const [selections, setSelections] = useState(() => {
    const initial = {};
    for (const index of categoryIndexes) {
      const items = equipmentCategories[option.grants[index].category] ?? [];
      initial[index] = items[0] ?? "";
    }
    return initial;
  });

  function resolveGrants() {
    return option.grants.map((grant, index) =>
      grant.type === "fixed"
        ? { name: grant.name, quantity: grant.quantity }
        : { name: selections[index] || grant.category, quantity: grant.quantity },
    );
  }

  const inactive = disabled && !chosen;

  return (
    <div className={`equipment-option${inactive ? " equipment-option-disabled" : ""}${chosen ? " equipment-option-chosen" : ""}`}>
      <div className="equipment-option-text">
        {option.label && <strong>({option.label}) </strong>}
        {option.grants.map((grant, index) => (
          <span key={index} className="equipment-grant">
            {index > 0 && ", "}
            {grant.type === "category" ? (
              <select
                value={selections[index]}
                disabled={disabled}
                onChange={(event) =>
                  setSelections((prev) => ({ ...prev, [index]: event.target.value }))
                }
              >
                {(equipmentCategories[grant.category] ?? []).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            ) : (
              <span>
                {grant.quantity > 1 ? `${grant.quantity}x ` : ""}
                {grant.name}
              </span>
            )}
          </span>
        ))}
      </div>
      <button type="button" disabled={disabled} onClick={() => onAdd(resolveGrants())}>
        {chosen ? "Adicionado" : "Adicionar"}
      </button>
    </div>
  );
}

export function EquipmentSlots({ slots, onAdd }) {
  const [chosenBySlot, setChosenBySlot] = useState({});

  if (!slots?.length) return null;

  return (
    <div className="equipment-slots">
      {slots.map((slot, slotIndex) => (
        <div key={slotIndex} className="equipment-slot">
          {slot.options.map((option, optionIndex) => {
            const slotChoice = chosenBySlot[slotIndex];
            return (
              <OptionRow
                key={optionIndex}
                option={option}
                chosen={slotChoice === optionIndex}
                disabled={slotChoice !== undefined}
                onAdd={(grants) => {
                  onAdd(grants);
                  setChosenBySlot((prev) => ({ ...prev, [slotIndex]: optionIndex }));
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
