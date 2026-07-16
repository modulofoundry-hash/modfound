import { useState } from "react";
import { ALIGNMENTS, createEmptyCharacter } from "@shared/schema/character";
import { AbilitiesInput } from "./AbilitiesInput";
import { SkillsInput } from "./SkillsInput";
import { ListEditor } from "./ListEditor";
import { TagListInput } from "./TagListInput";

export function CharacterForm({ initialValue, onSubmit, onCancel }) {
  const [character, setCharacter] = useState(initialValue ?? createEmptyCharacter());

  function set(key, value) {
    setCharacter((prev) => ({ ...prev, [key]: value }));
  }

  function setPersonality(key, value) {
    setCharacter((prev) => ({ ...prev, personality: { ...prev.personality, [key]: value } }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(character);
  }

  return (
    <form className="sheet-form" onSubmit={handleSubmit}>
      <fieldset>
        <legend>Identidade</legend>
        <label>
          Nome
          <input type="text" required value={character.name} onChange={(e) => set("name", e.target.value)} />
        </label>
        <label>
          Link da imagem
          <input type="text" value={character.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} />
        </label>
        <label>
          Raça
          <input type="text" value={character.race} onChange={(e) => set("race", e.target.value)} />
        </label>
        <label>
          Antecedente
          <input
            type="text"
            value={character.background}
            onChange={(e) => set("background", e.target.value)}
          />
        </label>
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
      </fieldset>

      <fieldset>
        <legend>Classes</legend>
        <ListEditor
          items={character.classes}
          onChange={(items) => set("classes", items)}
          addLabel="Adicionar classe"
          fields={[
            { key: "name", label: "Classe" },
            { key: "subclass", label: "Subclasse" },
            { key: "level", label: "Nível", type: "number", default: 1 },
          ]}
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
        <legend>Idiomas</legend>
        <TagListInput
          items={character.languages}
          onChange={(languages) => set("languages", languages)}
          placeholder="Ex: Élfico"
          addLabel="Adicionar idioma"
        />
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
          Traços
          <textarea value={character.personality.traits} onChange={(e) => setPersonality("traits", e.target.value)} />
        </label>
        <label>
          Ideais
          <textarea value={character.personality.ideals} onChange={(e) => setPersonality("ideals", e.target.value)} />
        </label>
        <label>
          Vínculos
          <textarea value={character.personality.bonds} onChange={(e) => setPersonality("bonds", e.target.value)} />
        </label>
        <label>
          Defeitos
          <textarea value={character.personality.flaws} onChange={(e) => setPersonality("flaws", e.target.value)} />
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
