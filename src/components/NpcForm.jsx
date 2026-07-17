import { useState } from "react";
import { ABILITIES, ABILITY_LABELS } from "../schema/character";
import { CREATURE_TYPES, createEmptyNpc, SIZES } from "../schema/npc";
import { AbilitiesInput } from "./AbilitiesInput";
import { SkillsInput } from "./SkillsInput";
import { SavingThrowsInput } from "./SavingThrowsInput";
import { ListEditor } from "./ListEditor";
import { TagListInput } from "./TagListInput";

const ACTION_FIELDS = [
  { key: "name", label: "Nome" },
  { key: "description", label: "Descrição", type: "textarea" },
];

const SPELL_FIELDS = [
  { key: "name", label: "Magia" },
  { key: "prepared", label: "Preparada", type: "checkbox", default: false },
];

export function NpcForm({ initialValue, onSubmit, onCancel }) {
  const [npc, setNpc] = useState(initialValue ?? createEmptyNpc());

  function set(key, value) {
    setNpc((prev) => ({ ...prev, [key]: value }));
  }

  function setNested(group, key, value) {
    setNpc((prev) => ({ ...prev, [group]: { ...prev[group], [key]: value } }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(npc);
  }

  return (
    <form className="sheet-form" onSubmit={handleSubmit}>
      <fieldset>
        <legend>Identidade</legend>
        <label>
          Nome
          <input type="text" required value={npc.name} onChange={(e) => set("name", e.target.value)} />
        </label>
        <label>
          Link do retrato (ficha)
          <input type="text" value={npc.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} />
        </label>
        <label>
          Link do token (mapa)
          <input
            type="text"
            placeholder="Deixe em branco pra usar o mesmo do retrato"
            value={npc.tokenImageUrl}
            onChange={(e) => set("tokenImageUrl", e.target.value)}
          />
        </label>
        <label>
          Tamanho
          <select value={npc.size} onChange={(e) => set("size", e.target.value)}>
            {SIZES.map((size) => (
              <option key={size.id} value={size.id}>
                {size.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select value={npc.type.value} onChange={(e) => setNested("type", "value", e.target.value)}>
            <option value="">Personalizado (usar campo abaixo)</option>
            {CREATURE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo personalizado
          <input
            type="text"
            placeholder="Preencher só se não usou a lista acima"
            value={npc.type.custom}
            onChange={(e) => setNested("type", "custom", e.target.value)}
          />
        </label>
        <label>
          Subtipo
          <input
            type="text"
            placeholder="Ex: goblinoide"
            value={npc.type.subtype}
            onChange={(e) => setNested("type", "subtype", e.target.value)}
          />
        </label>
        <label>
          Enxame (tamanho dos componentes, se for enxame)
          <input
            type="text"
            value={npc.type.swarm}
            onChange={(e) => setNested("type", "swarm", e.target.value)}
          />
        </label>
        <label>
          Alinhamento
          <input type="text" value={npc.alignment} onChange={(e) => set("alignment", e.target.value)} />
        </label>
        <label>
          Nível de Desafio (CR)
          <input
            type="text"
            placeholder="Ex: 1/4, 5"
            value={npc.challengeRating}
            onChange={(e) => set("challengeRating", e.target.value)}
          />
        </label>
        <label className="skill-expertise">
          <input
            type="checkbox"
            checked={npc.important}
            onChange={(e) => set("important", e.target.checked)}
          />
          NPC importante (tem personalidade própria)
        </label>
      </fieldset>

      {npc.important && (
        <fieldset>
          <legend>Personalidade</legend>
          <label>
            Ideal
            <textarea
              value={npc.personality.ideal}
              onChange={(e) => setNested("personality", "ideal", e.target.value)}
            />
          </label>
          <label>
            Vínculo
            <textarea
              value={npc.personality.bond}
              onChange={(e) => setNested("personality", "bond", e.target.value)}
            />
          </label>
          <label>
            Defeito
            <textarea
              value={npc.personality.flaw}
              onChange={(e) => setNested("personality", "flaw", e.target.value)}
            />
          </label>
        </fieldset>
      )}

      <fieldset>
        <legend>Defesa</legend>
        <label>
          Classe de Armadura
          <input type="number" value={npc.armorClass} onChange={(e) => set("armorClass", Number(e.target.value))} />
        </label>
        <label>
          Pontos de Vida (máximo)
          <input
            type="number"
            value={npc.hitPoints.max}
            onChange={(e) => setNested("hitPoints", "max", Number(e.target.value))}
          />
        </label>
        <label>
          Fórmula de PV
          <input
            type="text"
            placeholder="Ex: 6d8+18"
            value={npc.hitPoints.formula}
            onChange={(e) => setNested("hitPoints", "formula", e.target.value)}
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>Deslocamento</legend>
        <label>
          Andando
          <input
            type="number"
            value={npc.speed.walk}
            onChange={(e) => setNested("speed", "walk", Number(e.target.value))}
          />
        </label>
        <label>
          Voando
          <input
            type="number"
            value={npc.speed.fly}
            onChange={(e) => setNested("speed", "fly", Number(e.target.value))}
          />
        </label>
        <label>
          Nadando
          <input
            type="number"
            value={npc.speed.swim}
            onChange={(e) => setNested("speed", "swim", Number(e.target.value))}
          />
        </label>
        <label>
          Escalando
          <input
            type="number"
            value={npc.speed.climb}
            onChange={(e) => setNested("speed", "climb", Number(e.target.value))}
          />
        </label>
        <label>
          Escavando
          <input
            type="number"
            value={npc.speed.burrow}
            onChange={(e) => setNested("speed", "burrow", Number(e.target.value))}
          />
        </label>
        <label>
          Unidade
          <input
            type="text"
            placeholder="ft"
            value={npc.speed.units}
            onChange={(e) => setNested("speed", "units", e.target.value)}
          />
        </label>
        <label className="skill-expertise">
          <input
            type="checkbox"
            checked={npc.speed.hover}
            onChange={(e) => setNested("speed", "hover", e.target.checked)}
          />
          Flutuante (hover)
        </label>
      </fieldset>

      <fieldset>
        <legend>Atributos</legend>
        <AbilitiesInput abilities={npc.abilities} onChange={(abilities) => set("abilities", abilities)} />
      </fieldset>

      <fieldset>
        <legend>Testes de Resistência</legend>
        <SavingThrowsInput
          proficiencies={npc.savingThrowProficiencies}
          onChange={(value) => set("savingThrowProficiencies", value)}
        />
      </fieldset>

      <fieldset>
        <legend>Perícias</legend>
        <SkillsInput
          proficiencies={npc.skillProficiencies}
          expertise={npc.skillExpertise}
          onChange={({ proficiencies, expertise }) => {
            set("skillProficiencies", proficiencies);
            set("skillExpertise", expertise);
          }}
        />
      </fieldset>

      <fieldset>
        <legend>Sentidos</legend>
        <label>
          Visão no Escuro
          <input
            type="number"
            value={npc.senses.darkvision}
            onChange={(e) => setNested("senses", "darkvision", Number(e.target.value))}
          />
        </label>
        <label>
          Visão Cega
          <input
            type="number"
            value={npc.senses.blindsight}
            onChange={(e) => setNested("senses", "blindsight", Number(e.target.value))}
          />
        </label>
        <label>
          Percepção por Tremor
          <input
            type="number"
            value={npc.senses.tremorsense}
            onChange={(e) => setNested("senses", "tremorsense", Number(e.target.value))}
          />
        </label>
        <label>
          Visão Verdadeira
          <input
            type="number"
            value={npc.senses.truesight}
            onChange={(e) => setNested("senses", "truesight", Number(e.target.value))}
          />
        </label>
        <label>
          Unidade
          <input
            type="text"
            placeholder="ft"
            value={npc.senses.units}
            onChange={(e) => setNested("senses", "units", e.target.value)}
          />
        </label>
        <label>
          Sentido especial (texto livre)
          <input
            type="text"
            value={npc.senses.special}
            onChange={(e) => setNested("senses", "special", e.target.value)}
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>Idiomas</legend>
        <TagListInput
          items={npc.languages}
          onChange={(languages) => set("languages", languages)}
          placeholder="Ex: Comum"
          addLabel="Adicionar idioma"
        />
      </fieldset>

      <fieldset>
        <legend>Resistências a Dano</legend>
        <TagListInput
          items={npc.damageResistances}
          onChange={(value) => set("damageResistances", value)}
          placeholder="Ex: fogo"
          addLabel="Adicionar resistência"
        />
      </fieldset>

      <fieldset>
        <legend>Imunidades a Dano</legend>
        <TagListInput
          items={npc.damageImmunities}
          onChange={(value) => set("damageImmunities", value)}
          placeholder="Ex: veneno"
          addLabel="Adicionar imunidade"
        />
      </fieldset>

      <fieldset>
        <legend>Vulnerabilidades a Dano</legend>
        <TagListInput
          items={npc.damageVulnerabilities}
          onChange={(value) => set("damageVulnerabilities", value)}
          placeholder="Ex: radiante"
          addLabel="Adicionar vulnerabilidade"
        />
      </fieldset>

      <fieldset>
        <legend>Imunidades a Condições</legend>
        <TagListInput
          items={npc.conditionImmunities}
          onChange={(value) => set("conditionImmunities", value)}
          placeholder="Ex: amedrontado"
          addLabel="Adicionar imunidade"
        />
      </fieldset>

      <fieldset>
        <legend>Conjuração</legend>
        <label>
          Atributo de conjuração
          <select
            value={npc.spellcastingAbility}
            onChange={(e) => set("spellcastingAbility", e.target.value)}
          >
            <option value="">Não conjura</option>
            {ABILITIES.map((id) => (
              <option key={id} value={id}>
                {ABILITY_LABELS[id]}
              </option>
            ))}
          </select>
        </label>
        <ListEditor
          items={npc.spells}
          onChange={(value) => set("spells", value)}
          addLabel="Adicionar magia"
          fields={SPELL_FIELDS}
        />
      </fieldset>

      <fieldset>
        <legend>Traços</legend>
        <ListEditor items={npc.traits} onChange={(value) => set("traits", value)} addLabel="Adicionar traço" fields={ACTION_FIELDS} />
      </fieldset>

      <fieldset>
        <legend>Ações</legend>
        <ListEditor items={npc.actions} onChange={(value) => set("actions", value)} addLabel="Adicionar ação" fields={ACTION_FIELDS} />
      </fieldset>

      <fieldset>
        <legend>Ações Bônus</legend>
        <ListEditor
          items={npc.bonusActions}
          onChange={(value) => set("bonusActions", value)}
          addLabel="Adicionar ação bônus"
          fields={ACTION_FIELDS}
        />
      </fieldset>

      <fieldset>
        <legend>Reações</legend>
        <ListEditor
          items={npc.reactions}
          onChange={(value) => set("reactions", value)}
          addLabel="Adicionar reação"
          fields={ACTION_FIELDS}
        />
      </fieldset>

      <fieldset>
        <legend>Ações Lendárias</legend>
        <label>
          Quantidade por turno
          <input
            type="number"
            value={npc.legendaryActionsPerTurn}
            onChange={(e) => set("legendaryActionsPerTurn", Number(e.target.value))}
          />
        </label>
        <ListEditor
          items={npc.legendaryActions}
          onChange={(value) => set("legendaryActions", value)}
          addLabel="Adicionar ação lendária"
          fields={ACTION_FIELDS}
        />
      </fieldset>

      <fieldset>
        <legend>Resistência Lendária e Covil</legend>
        <label>
          Resistência Lendária (usos por dia)
          <input
            type="number"
            value={npc.legendaryResistances}
            onChange={(e) => set("legendaryResistances", Number(e.target.value))}
          />
        </label>
        <label className="skill-expertise">
          <input
            type="checkbox"
            checked={npc.hasLairActions}
            onChange={(e) => set("hasLairActions", e.target.checked)}
          />
          Tem Ações de Covil
        </label>
        {npc.hasLairActions && (
          <label>
            Iniciativa das Ações de Covil
            <input
              type="number"
              value={npc.lairInitiative}
              onChange={(e) => set("lairInitiative", Number(e.target.value))}
            />
          </label>
        )}
      </fieldset>

      <fieldset>
        <legend>Notas</legend>
        <textarea value={npc.notes} onChange={(e) => set("notes", e.target.value)} />
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
