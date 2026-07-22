import { SkillsInput } from "../SkillsInput";
import { TagListInput } from "../TagListInput";
import { ChoicePicker } from "../ChoicePicker";
import { EquipmentSlots } from "../EquipmentSlots";
import { SKILLS } from "../../schema/character";

// Recapitula o que a Raça/Antecedente/Classe concedem de perícia/ferramenta/
// equipamento — pedido do usuário: essas concessões devem aparecer SÓ aqui
// (etapa Perícias), discriminando de onde vêm e quantas dá pra escolher, em
// vez de espalhadas nas etapas de Raça/Antecedente/Classe (removidas de lá,
// ver OriginSuggestions.jsx/ClassesInput.jsx). Equipamento reaproveita o
// mesmo `EquipmentSlots` que já existia, só mudou de lugar.
function GrantSummary({ title, matched, skillProficiencies, toolProficiencies, onApplySkills, onApplyTools, onApplyEquipment }) {
  if (!matched) return null;
  const hasSkills = matched.skills?.length > 0 || matched.skillChoice;
  const hasTools = matched.tools?.length > 0 || matched.toolChoice;
  const hasEquipment = matched.equipmentSlots?.length > 0;
  if (!hasSkills && !hasTools && !hasEquipment) return null;

  // Mesmo automatismo do botão "Adicionado" já usado em OriginSuggestions.jsx
  // — sem isso, o botão de concessão fixa continuava dizendo "Adicionar" pra
  // sempre, mesmo depois de já aplicado.
  const skillsAdded =
    matched.skills?.length > 0 &&
    matched.skills.every((label) => {
      const id = SKILLS.find((s) => s.label === label)?.id;
      return id && skillProficiencies?.includes(id);
    });
  const toolsAdded = matched.tools?.length > 0 && matched.tools.every((t) => toolProficiencies?.includes(t));

  return (
    <div className="pericias-grant-summary">
      <h4>{title}</h4>
      {matched.skills?.length > 0 && (
        <p>
          Perícias: {matched.skills.join(", ")}{" "}
          <button type="button" disabled={skillsAdded} onClick={() => onApplySkills(matched.skills)}>
            {skillsAdded ? "Adicionado" : "Adicionar"}
          </button>
        </p>
      )}
      {matched.skillChoice && (
        <ChoicePicker title="Perícias" count={matched.skillChoice.count} from={matched.skillChoice.from} onAdd={onApplySkills} />
      )}
      {matched.tools?.length > 0 && (
        <p>
          Ferramentas: {matched.tools.join(", ")}{" "}
          <button type="button" disabled={toolsAdded} onClick={() => onApplyTools(matched.tools)}>
            {toolsAdded ? "Adicionado" : "Adicionar"}
          </button>
        </p>
      )}
      {matched.toolChoice && (
        <ChoicePicker title="Ferramentas" count={matched.toolChoice.count} from={matched.toolChoice.from} onAdd={onApplyTools} />
      )}
      {hasEquipment && (
        <div className="pericias-grant-equipment">
          <p>Equipamento:</p>
          <EquipmentSlots slots={matched.equipmentSlots} onAdd={onApplyEquipment} />
        </div>
      )}
    </div>
  );
}

export function StepPericias({
  skillProficiencies,
  skillExpertise,
  onChangeSkills,
  toolProficiencies,
  onChangeTools,
  raceMatch,
  backgroundMatch,
  classMatches,
  appliers,
}) {
  return (
    <div className="wizard-step-pericias">
      <GrantSummary
        title="Concedido pela Raça"
        matched={raceMatch}
        skillProficiencies={skillProficiencies}
        toolProficiencies={toolProficiencies}
        onApplySkills={appliers.applySkills}
        onApplyTools={appliers.applyTools}
        onApplyEquipment={appliers.applyEquipmentGrants}
      />
      <GrantSummary
        title="Concedido pelo Antecedente"
        matched={backgroundMatch}
        skillProficiencies={skillProficiencies}
        toolProficiencies={toolProficiencies}
        onApplySkills={appliers.applySkills}
        onApplyTools={appliers.applyTools}
        onApplyEquipment={appliers.applyEquipmentGrants}
      />
      {classMatches?.map((match, index) => (
        <GrantSummary
          key={index}
          title={`Concedido pela Classe${match?.classData?.name ? ` (${match.classData.name})` : ""}`}
          matched={match?.classData}
          skillProficiencies={skillProficiencies}
          toolProficiencies={toolProficiencies}
          onApplySkills={appliers.applySkills}
          onApplyTools={appliers.applyTools}
          onApplyEquipment={appliers.applyEquipmentGrants}
        />
      ))}

      <h3>Perícias</h3>
      <SkillsInput
        proficiencies={skillProficiencies}
        expertise={skillExpertise}
        onChange={({ proficiencies, expertise }) => onChangeSkills(proficiencies, expertise)}
      />
      <h3>Ferramentas</h3>
      <TagListInput
        items={toolProficiencies}
        onChange={onChangeTools}
        placeholder="Ex: Ferramentas de Ladrão"
        addLabel="Adicionar ferramenta"
      />
    </div>
  );
}
