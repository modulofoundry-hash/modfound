import { useEffect, useState } from "react";
import { ALIGNMENTS, createEmptyCharacter, SKILLS } from "../schema/character";
import { AbilitiesInput } from "./AbilitiesInput";
import { SkillsInput } from "./SkillsInput";
import { ListEditor } from "./ListEditor";
import { TagListInput } from "./TagListInput";
import { OriginPicker } from "./OriginPicker";
import { ClassesInput } from "./ClassesInput";
import racesData from "../data/srd/races.json";
import backgroundsData from "../data/srd/backgrounds.json";
import classesData from "../data/srd/classes.json";
import { useCustomBackgrounds, useCustomClasses, useCustomRaces } from "../data/customContent";

const CURRENCIES = [
  { key: "pp", label: "Platina" },
  { key: "gp", label: "Ouro" },
  { key: "ep", label: "Electro" },
  { key: "sp", label: "Prata" },
  { key: "cp", label: "Cobre" },
];

const APPEARANCE_FIELDS = [
  { key: "gender", label: "Gênero" },
  { key: "age", label: "Idade" },
  { key: "height", label: "Altura" },
  { key: "weight", label: "Peso" },
  { key: "eyes", label: "Olhos" },
  { key: "hair", label: "Cabelo" },
  { key: "skin", label: "Pele" },
  { key: "faith", label: "Fé" },
];

export function CharacterForm({ initialValue, onSubmit, onCancel }) {
  const [character, setCharacter] = useState(initialValue ?? createEmptyCharacter());
  const [feedback, setFeedback] = useState(null);

  const customRaces = useCustomRaces();
  const customBackgrounds = useCustomBackgrounds();
  const customClasses = useCustomClasses();
  const allRaces = [...racesData, ...customRaces];
  const allBackgrounds = [...backgroundsData, ...customBackgrounds];
  const allClasses = [...classesData, ...customClasses];

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 2500);
    return () => clearTimeout(timer);
  }, [feedback]);

  function set(key, value) {
    setCharacter((prev) => ({ ...prev, [key]: value }));
  }

  function setNested(group, key, value) {
    setCharacter((prev) => ({ ...prev, [group]: { ...prev[group], [key]: value } }));
  }

  function applySkills(skillLabels) {
    const ids = skillLabels.map((label) => SKILLS.find((s) => s.label === label)?.id).filter(Boolean);
    setCharacter((prev) => ({
      ...prev,
      skillProficiencies: Array.from(new Set([...prev.skillProficiencies, ...ids])),
    }));
    setFeedback(`${skillLabels.join(", ")} adicionado(s) em Perícias`);
  }

  function applyTools(toolLabels) {
    setCharacter((prev) => ({
      ...prev,
      toolProficiencies: Array.from(new Set([...prev.toolProficiencies, ...toolLabels])),
    }));
    setFeedback(`${toolLabels.join(", ")} adicionado(s) em Proficiências em Ferramentas`);
  }

  function applyLanguages(text) {
    setCharacter((prev) => ({ ...prev, languages: [...prev.languages, text] }));
    setFeedback(`"${text}" adicionado em Idiomas`);
  }

  function applyEquipmentGrants(grants) {
    setCharacter((prev) => ({ ...prev, equipment: [...prev.equipment, ...grants] }));
    const labels = grants.map((item) => (item.quantity > 1 ? `${item.quantity}x ${item.name}` : item.name));
    setFeedback(`${labels.join(", ")} adicionado(s) em Equipamento`);
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(character);
  }

  return (
    <form className="sheet-form" onSubmit={handleSubmit}>
      {feedback && <div className="toast">{feedback}</div>}
      <fieldset>
        <legend>Identidade</legend>
        <label>
          Nome
          <input type="text" required value={character.name} onChange={(e) => set("name", e.target.value)} />
        </label>
        <label>
          Link do retrato (ficha)
          <input type="text" value={character.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} />
        </label>
        <label>
          Link do token (mapa)
          <input
            type="text"
            placeholder="Deixe em branco pra usar o mesmo do retrato"
            value={character.tokenImageUrl}
            onChange={(e) => set("tokenImageUrl", e.target.value)}
          />
        </label>

        <OriginPicker
          label="Raça"
          items={allRaces}
          value={character.race}
          onChange={(text) => set("race", text)}
          placeholder="Digite pra buscar (ex: Elfo)"
          onApplySkills={applySkills}
          onApplyTools={applyTools}
          onApplyLanguages={applyLanguages}
          onApplyEquipment={applyEquipmentGrants}
        />

        <OriginPicker
          label="Antecedente"
          items={allBackgrounds}
          value={character.background}
          onChange={(text) => set("background", text)}
          placeholder="Digite pra buscar (ex: Acólito)"
          onApplySkills={applySkills}
          onApplyTools={applyTools}
          onApplyLanguages={applyLanguages}
          onApplyEquipment={applyEquipmentGrants}
        />

        <label>
          Alinhamento
          <select value={character.alignment} onChange={(e) => set("alignment", e.target.value)}>
            <option value="">—</option>
            {ALIGNMENTS.map((alignment) => (
              <option key={alignment} value={alignment}>
                {alignment}
              </option>
            ))}
          </select>
        </label>
        <label className="skill-expertise">
          <input
            type="checkbox"
            checked={character.inspiration}
            onChange={(e) => set("inspiration", e.target.checked)}
          />
          Inspiração
        </label>
      </fieldset>

      <fieldset>
        <legend>Classes</legend>
        <ClassesInput
          classes={character.classes}
          classesData={allClasses}
          onChange={(items) => set("classes", items)}
          onApplyEquipment={applyEquipmentGrants}
          onApplySkills={applySkills}
        />
      </fieldset>

      <fieldset>
        <legend>Atributos</legend>
        <AbilitiesInput abilities={character.abilities} onChange={(abilities) => set("abilities", abilities)} />
      </fieldset>

      <fieldset>
        <legend>Perícias</legend>
        <SkillsInput
          proficiencies={character.skillProficiencies}
          expertise={character.skillExpertise}
          onChange={({ proficiencies, expertise }) => {
            set("skillProficiencies", proficiencies);
            set("skillExpertise", expertise);
          }}
        />
      </fieldset>

      <fieldset>
        <legend>Proficiências em Ferramentas</legend>
        <TagListInput
          items={character.toolProficiencies}
          onChange={(value) => set("toolProficiencies", value)}
          placeholder="Ex: Ferramentas de Ladrão"
          addLabel="Adicionar ferramenta"
        />
      </fieldset>

      <fieldset>
        <legend>Idiomas</legend>
        <TagListInput
          items={character.languages}
          onChange={(languages) => set("languages", languages)}
          placeholder="Ex: Élfico"
          addLabel="Adicionar idioma"
        />
      </fieldset>

      <fieldset>
        <legend>Dinheiro</legend>
        {CURRENCIES.map((currency) => (
          <label key={currency.key}>
            {currency.label}
            <input
              type="number"
              min="0"
              value={character.currency[currency.key]}
              onChange={(e) => setNested("currency", currency.key, Number(e.target.value))}
            />
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Equipamento</legend>
        <ListEditor
          items={character.equipment}
          onChange={(items) => set("equipment", items)}
          addLabel="Adicionar item"
          fields={[
            { key: "name", label: "Item" },
            { key: "quantity", label: "Qtd", type: "number", default: 1 },
          ]}
        />
      </fieldset>

      <fieldset>
        <legend>Feats</legend>
        <TagListInput
          items={character.feats}
          onChange={(feats) => set("feats", feats)}
          placeholder="Ex: Atirador Élite"
          addLabel="Adicionar feat"
        />
      </fieldset>

      <fieldset>
        <legend>Magias</legend>
        <ListEditor
          items={character.spells}
          onChange={(items) => set("spells", items)}
          addLabel="Adicionar magia"
          fields={[
            { key: "name", label: "Magia" },
            { key: "prepared", label: "Preparada", type: "checkbox", default: false },
          ]}
        />
      </fieldset>

      <fieldset>
        <legend>Personalidade</legend>
        <label>
          Traço de Personalidade
          <textarea value={character.personality.trait} onChange={(e) => setNested("personality", "trait", e.target.value)} />
        </label>
        <label>
          Ideal
          <textarea value={character.personality.ideal} onChange={(e) => setNested("personality", "ideal", e.target.value)} />
        </label>
        <label>
          Vínculo
          <textarea value={character.personality.bond} onChange={(e) => setNested("personality", "bond", e.target.value)} />
        </label>
        <label>
          Defeito
          <textarea value={character.personality.flaw} onChange={(e) => setNested("personality", "flaw", e.target.value)} />
        </label>
      </fieldset>

      <fieldset>
        <legend>Aparência</legend>
        {APPEARANCE_FIELDS.map((field) => (
          <label key={field.key}>
            {field.label}
            <input
              type="text"
              value={character.appearance[field.key]}
              onChange={(e) => setNested("appearance", field.key, e.target.value)}
            />
          </label>
        ))}
        <label>
          Descrição física
          <textarea
            value={character.appearance.description}
            onChange={(e) => setNested("appearance", "description", e.target.value)}
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>Notas</legend>
        <textarea value={character.notes} onChange={(e) => set("notes", e.target.value)} />
      </fieldset>

      <div className="sheet-form-actions">
        <button type="submit">Salvar</button>
        <button type="button" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
