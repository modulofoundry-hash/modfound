import { ChoicePicker } from "./ChoicePicker";
import { EquipmentSlots } from "./EquipmentSlots";
import { SpellChoicePicker } from "./SpellChoicePicker";
import { SIZE_LABELS, SKILLS, LANGUAGES } from "../schema/character";

// matched.size vem como string tipo "M" ou "S/M" (raça 2014, "/"-separada) OU
// como array tipo ["S","M"] (raça 2024, mesmo formato de buildRaceItem.js no
// módulo). sizeToLetters() aceita as duas formas (ver OriginPicker.jsx).
function sizeToLetters(size) {
  if (Array.isArray(size)) return size.filter(Boolean);
  if (typeof size === "string") return size.split("/").filter(Boolean);
  return [];
}

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

// Painel de "o que essa raça/antecedente concede, clique pra aplicar" —
// extraído de OriginPicker.jsx pra ser reaproveitado pela tabela do wizard
// também, sem duplicar a lógica.
export function OriginSuggestions({
  matched,
  onApplySkills,
  onApplyTools,
  onApplyLanguages,
  onApplyLanguageChoices,
  onApplyEquipment,
  onApplySize,
  onApplySpells,
  sizeValue,
  // Estado atual do personagem — só pra saber se a concessão fixa já foi
  // aplicada e trocar o botão pra "Adicionado"/desativado (mesmo padrão que
  // `EquipmentSlots.jsx` já usa pro equipamento, achado real: sem isso o
  // botão continuava dizendo "Adicionar" pra sempre, mesmo depois de
  // clicado, dando a entender que nada tinha acontecido).
  skillProficiencies = [],
  toolProficiencies = [],
  languages = [],
  // O wizard tira Perícias/Ferramentas/Idiomas/Equipamento daqui de propósito
  // (pedido do usuário: essas concessões só devem aparecer nas etapas
  // dedicadas — Perícias e Idiomas — discriminando de onde vêm e quantas dá
  // pra escolher, ver StepPericias.jsx/StepIdiomas.jsx). O formulário antigo
  // (`CharacterForm.jsx`/`NpcForm.jsx`, sem essas etapas separadas) continua
  // mostrando tudo aqui mesmo, então o padrão fica `true` por retrocompatibilidade.
  showSkillsAndTools = true,
  showEquipment = true,
  showLanguages = true,
}) {
  if (!matched) return null;

  const skillsAdded =
    matched.skills?.length > 0 &&
    matched.skills.every((label) => {
      const id = SKILLS.find((s) => s.label === label)?.id;
      return id && skillProficiencies.includes(id);
    });
  const toolsAdded = matched.tools?.length > 0 && matched.tools.every((t) => toolProficiencies.includes(t));
  // Idioma vem como texto solto ("comum, anão") — mesmo split de applyLanguages().
  const languageParts = matched.languages ? matched.languages.split(",").map((part) => part.trim()).filter(Boolean) : [];
  const languagesAdded = languageParts.length > 0 && languageParts.every((part) => languages.includes(part));

  return (
    <div className="origin-suggestions">
      {onApplySize && matched.size && (
        <SizeChoice sizeString={matched.size} value={sizeValue} onApply={onApplySize} />
      )}
      {showSkillsAndTools && matched.skills?.length > 0 && (
        <p>
          Perícias: {matched.skills.join(", ")}{" "}
          <button type="button" disabled={skillsAdded} onClick={() => onApplySkills(matched.skills)}>
            {skillsAdded ? "Adicionado" : "Adicionar"}
          </button>
        </p>
      )}
      {showSkillsAndTools && matched.skillChoice && (
        <ChoicePicker title="Perícias" count={matched.skillChoice.count} from={matched.skillChoice.from} onAdd={onApplySkills} />
      )}
      {showSkillsAndTools && matched.tools?.length > 0 && (
        <p>
          Ferramentas: {matched.tools.join(", ")}{" "}
          <button type="button" disabled={toolsAdded} onClick={() => onApplyTools(matched.tools)}>
            {toolsAdded ? "Adicionado" : "Adicionar"}
          </button>
        </p>
      )}
      {showSkillsAndTools && matched.toolChoice && (
        <ChoicePicker title="Ferramentas" count={matched.toolChoice.count} from={matched.toolChoice.from} onAdd={onApplyTools} />
      )}
      {showLanguages && matched.languages && (
        <p>
          Idiomas: {matched.languages}{" "}
          <button type="button" disabled={languagesAdded} onClick={() => onApplyLanguages(matched.languages)}>
            {languagesAdded ? "Adicionado" : "Adicionar"}
          </button>
        </p>
      )}
      {showLanguages && matched.languageChoice && (
        <ChoicePicker title="Idiomas" count={matched.languageChoice.count} from={LANGUAGES} onAdd={onApplyLanguageChoices} allowCustom />
      )}
      {showEquipment && matched.equipmentSlots?.length > 0 && (
        <div>
          <p>Equipamento:</p>
          <EquipmentSlots slots={matched.equipmentSlots} onAdd={onApplyEquipment} />
        </div>
      )}
      {onApplySpells &&
        matched.spellChoices?.map((choice, index) => (
          <SpellChoicePicker key={index} title="Magia" count={choice.count} pool={choice.pool} onAdd={onApplySpells} />
        ))}
    </div>
  );
}
