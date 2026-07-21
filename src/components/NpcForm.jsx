import { useState } from "react";
import { ABILITIES, ABILITY_LABELS, SKILLS } from "../schema/character";
import { CREATURE_TYPES, createEmptyNpc, SIZE_LETTER_TO_KEY, SIZES } from "../schema/npc";
import { AbilitiesInput } from "./AbilitiesInput";
import { SkillsInput } from "./SkillsInput";
import { SavingThrowsInput } from "./SavingThrowsInput";
import { ListEditor } from "./ListEditor";
import { TagListInput } from "./TagListInput";
import { OriginPicker } from "./OriginPicker";
import { RulesModeToggle } from "./RulesModeToggle";
import racesData from "../data/content/races.json";
import { useCustomRaces } from "../data/customContent";

const ACTION_FIELDS = [
  { key: "name", label: "Nome" },
  { key: "description", label: "Descrição", type: "textarea" },
];

const SPELL_FIELDS = [
  { key: "name", label: "Magia" },
  { key: "prepared", label: "Preparada", type: "checkbox", default: false },
];

// Texto livre (mesmo padrão de "Resistências a Dano" etc) — os 13 tipos de
// dano padrão do 5e que o Foundry reconhece de verdade estão documentados no
// placeholder; ver DAMAGE_TYPE_CODE_PT em module/scripts/actors/buildNpc.js
// pra tradução PT-BR→código na hora de montar o Item.
const WEAPON_FIELDS = [
  { key: "name", label: "Nome" },
  { key: "attackBonus", label: "Bônus de Ataque (ex: +4)" },
  { key: "reach", label: "Alcance corpo a corpo (pés)", type: "number" },
  { key: "rangeNormal", label: "Alcance à distância normal (pés)", type: "number" },
  { key: "rangeLong", label: "Alcance à distância longo (pés)", type: "number" },
  { key: "damageFormula", label: "Dano (ex: 1d6 + 2)" },
  {
    key: "damageType",
    label: "Tipo de dano (ácido/contundente/frio/fogo/força/elétrico/necrótico/perfurante/veneno/psíquico/radiante/cortante/trovejante)",
  },
  { key: "description", label: "Efeito extra (além do dano)", type: "textarea" },
];

export function NpcForm({ initialValue, onSubmit, onCancel }) {
  // Mesma proteção de CharacterForm.jsx: NPC salvo antes de um campo novo
  // existir no schema não tem essa chave — mescla com os padrões pra não
  // quebrar a tela ao abrir pra editar uma ficha antiga.
  const [npc, setNpc] = useState(() => ({ ...createEmptyNpc(), ...initialValue }));
  const customRaces = useCustomRaces();
  const allRaces = [...racesData, ...customRaces];

  function set(key, value) {
    setNpc((prev) => ({ ...prev, [key]: value }));
  }

  function setNested(group, key, value) {
    setNpc((prev) => ({ ...prev, [group]: { ...prev[group], [key]: value } }));
  }

  // Sugestões do OriginPicker (perícia/idioma/tamanho da raça escolhida) — mesmo
  // padrão do CharacterForm, só que aplicando em skillProficiencies/languages/size
  // do NPC em vez dos campos do Personagem. Ferramenta/equipamento não têm campo
  // correspondente no NPC — no-op em vez de omitir a prop, porque o OriginPicker
  // renderiza o botão "Adicionar" sempre que a raça tiver esse dado, mesmo sem
  // callback (deixar undefined quebraria o clique).
  function applySkills(skillLabels) {
    const ids = skillLabels.map((label) => SKILLS.find((s) => s.label === label)?.id).filter(Boolean);
    setNpc((prev) => ({
      ...prev,
      skillProficiencies: Array.from(new Set([...prev.skillProficiencies, ...ids])),
    }));
  }

  // Mesmo tratamento de CharacterForm.jsx: idioma de raça vem como texto solto
  // separado por vírgula ("comum, anão"), precisa virar entradas separadas.
  function applyLanguages(text) {
    const parts = text.split(",").map((part) => part.trim()).filter(Boolean);
    setNpc((prev) => ({ ...prev, languages: [...prev.languages, ...parts] }));
  }

  function applySize(letter) {
    // letter vem crua do banco (T/S/M/L/H/G) — o <select> de Tamanho usa
    // chave de Foundry (tiny/sm/med/...), precisa traduzir (ver SIZE_LETTER_TO_KEY).
    set("size", SIZE_LETTER_TO_KEY[letter] ?? "");
  }

  function applySpellChoices(names) {
    setNpc((prev) => {
      const existing = new Set(prev.spells.map((s) => s.name));
      const additions = names.filter((name) => !existing.has(name)).map((name) => ({ name, prepared: false }));
      return { ...prev, spells: [...prev.spells, ...additions] };
    });
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
          Edição das regras
          <RulesModeToggle value={npc.rulesMode} onChange={(value) => set("rulesMode", value)} />
        </label>
        <OriginPicker
          label="Raça/Espécie"
          items={allRaces}
          value={npc.race}
          onChange={(text) => set("race", text)}
          placeholder="Digite pra buscar (ex: Elfo) — deixe em branco se não se aplica"
          onApplySkills={applySkills}
          onApplyLanguages={applyLanguages}
          onApplyTools={() => {}}
          onApplyEquipment={() => {}}
          onApplySize={applySize}
          onApplySpells={applySpellChoices}
          // SizeChoice compara contra a LETRA crua (T/S/M/...), não a chave de
          // Foundry que npc.size guarda (ver applySize/SIZE_LETTER_TO_KEY) —
          // sem essa tradução reversa, o botão da opção atual nunca aparecia
          // marcado como selecionado.
          sizeValue={Object.entries(SIZE_LETTER_TO_KEY).find(([, key]) => key === npc.size)?.[0] ?? ""}
          onMatch={(item) => set("raceRules", item?.rules ?? "")}
        />
        <label>
          Tamanho
          <select value={npc.size} onChange={(e) => set("size", e.target.value)}>
            {/* raça com tamanho de escolha (ex: "S/M") limpa npc.size pra "" até o
                usuário clicar numa opção acima (ver OriginPicker/SizeChoice) — sem
                essa opção em branco, o <select> mostraria a primeira opção real
                ("Miúdo") como se estivesse selecionada, escondendo que o tamanho
                ainda não foi escolhido de verdade. */}
            {!npc.size && <option value="">(escolha um tamanho)</option>}
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
        <legend>Armas</legend>
        <p className="field-hint">
          Ataques com arma (Mordida, Cimitarra etc) — viram Item de arma de verdade no
          Foundry, com bônus de ataque e dano que rolam sozinhos. Ações que NÃO são
          ataque de arma (Investida Múltipla, sopros, etc) continuam em "Ações" abaixo.
        </p>
        <ListEditor items={npc.weapons} onChange={(value) => set("weapons", value)} addLabel="Adicionar arma" fields={WEAPON_FIELDS} />
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
