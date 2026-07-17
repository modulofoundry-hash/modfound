import { useState } from "react";
import { SourceItemPicker } from "./SourceItemPicker";
import { EquipmentSlots } from "./EquipmentSlots";
import { ChoicePicker } from "./ChoicePicker";

export function OriginPicker({
  label,
  items,
  value,
  onChange,
  placeholder,
  onApplySkills,
  onApplyTools,
  onApplyLanguages,
  onApplyEquipment,
}) {
  const [matched, setMatched] = useState(null);

  function handlePick(text, item) {
    onChange(text);
    setMatched(item);
  }

  return (
    <div className="origin-picker">
      <label>
        {label}
        <SourceItemPicker items={items} value={value} onChange={handlePick} placeholder={placeholder} />
      </label>

      {matched && (
        <div className="origin-suggestions">
          {matched.skills?.length > 0 && (
            <p>
              Perícias: {matched.skills.join(", ")}{" "}
              <button type="button" onClick={() => onApplySkills(matched.skills)}>
                Adicionar
              </button>
            </p>
          )}
          {matched.skillChoice && (
            <ChoicePicker
              title="Perícias"
              count={matched.skillChoice.count}
              from={matched.skillChoice.from}
              onAdd={onApplySkills}
            />
          )}
          {matched.tools?.length > 0 && (
            <p>
              Ferramentas: {matched.tools.join(", ")}{" "}
              <button type="button" onClick={() => onApplyTools(matched.tools)}>
                Adicionar
              </button>
            </p>
          )}
          {matched.toolChoice && (
            <ChoicePicker
              title="Ferramentas"
              count={matched.toolChoice.count}
              from={matched.toolChoice.from}
              onAdd={onApplyTools}
            />
          )}
          {matched.languages && (
            <p>
              Idiomas: {matched.languages}{" "}
              <button type="button" onClick={() => onApplyLanguages(matched.languages)}>
                Adicionar
              </button>
            </p>
          )}
          {matched.equipmentSlots?.length > 0 && (
            <div>
              <p>Equipamento:</p>
              <EquipmentSlots slots={matched.equipmentSlots} onAdd={onApplyEquipment} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
