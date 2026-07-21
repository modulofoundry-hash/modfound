import { useState } from "react";
import { SourceItemPicker } from "./SourceItemPicker";
import { EquipmentSlots } from "./EquipmentSlots";
import { ChoicePicker } from "./ChoicePicker";
import { SpellChoicePicker } from "./SpellChoicePicker";
import { SIZE_LABELS } from "../schema/character";

// matched.size vem como string tipo "M" ou "S/M" (raça 2014, "/"-separada) OU
// como array tipo ["S","M"] (raça 2024 — mesmo formato usado em buildRaceItem.js
// no módulo). Chamar .split() direto quebrava com TypeError toda vez que uma
// raça 2024 era escolhida (arrays não têm .split) — achado testando o NPC ao
// vivo, travava o formulário inteiro. sizeToLetters() aceita as duas formas.
function sizeToLetters(size) {
  if (Array.isArray(size)) return size.filter(Boolean);
  if (typeof size === "string") return size.split("/").filter(Boolean);
  return [];
}

// Tamanho fixo: só informa, não precisa de botão — já é aplicado sozinho assim
// que a raça é escolhida (ver handlePick). Escolha: mostra um botão por opção.
function SizeChoice({ sizeString, value, onApply }) {
  const options = sizeToLetters(sizeString);
  if (options.length <= 1) {
    return options.length === 1 ? (
      <p>Tamanho: {SIZE_LABELS[options[0]] ?? options[0]}</p>
    ) : null;
  }
  return (
    <div className="size-choice">
      <p>Tamanho:</p>
      <div className="size-choice-options">
        {options.map((code) => (
          <button
            key={code}
            type="button"
            className={value === code ? "size-choice-selected" : ""}
            onClick={() => onApply(code)}
          >
            {SIZE_LABELS[code] ?? code}
          </button>
        ))}
      </div>
    </div>
  );
}

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
  onApplySize,
  onApplySpells,
  sizeValue,
  onMatch,
}) {
  const [matched, setMatched] = useState(null);

  function handlePick(text, item) {
    onChange(text);
    setMatched(item);
    onMatch?.(item);
    if (onApplySize) {
      const options = sizeToLetters(item?.size);
      // Tamanho fixo (1 opção): aplica sozinho. Sem opção ou várias opções:
      // limpa o que tinha antes até o usuário escolher de novo.
      onApplySize(options.length === 1 ? options[0] : "");
    }
  }

  return (
    <div className="origin-picker">
      <label>
        {label}
        {matched?.rules && (
          <span className={`rules-tag rules-tag-${matched.rules}`}>{matched.rules}</span>
        )}
        <SourceItemPicker items={items} value={value} onChange={handlePick} placeholder={placeholder} />
      </label>

      {matched && (
        <div className="origin-suggestions">
          {onApplySize && matched.size && (
            <SizeChoice sizeString={matched.size} value={sizeValue} onApply={onApplySize} />
          )}
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
          {onApplySpells &&
            matched.spellChoices?.map((choice, index) => (
              <SpellChoicePicker
                key={index}
                title="Magia"
                count={choice.count}
                pool={choice.pool}
                onAdd={onApplySpells}
              />
            ))}
        </div>
      )}
    </div>
  );
}
