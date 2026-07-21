import { useEffect, useState } from "react";
import { ALIGNMENTS, createEmptyCharacter, SKILLS } from "../schema/character";
import { AbilitiesInput } from "./AbilitiesInput";
import { SkillsInput } from "./SkillsInput";
import { ListEditor } from "./ListEditor";
import { TagListInput } from "./TagListInput";
import { OriginPicker } from "./OriginPicker";
import { ClassesInput } from "./ClassesInput";
import { FeatsInput } from "./FeatsInput";
import { AbilityBonusPicker } from "./AbilityBonusPicker";
import { RulesModeToggle } from "./RulesModeToggle";
import { DescriptionPanel } from "./DescriptionPanel";
import { SpellBrowser } from "./SpellBrowser";
import racesData from "../data/content/races.json";
import backgroundsData from "../data/content/backgrounds.json";
import classesData from "../data/content/classes.json";
import subclassesData from "../data/content/subclasses.json";
import featsData from "../data/content/feats.json";
import spellsData from "../data/content/spells.json";
import { useCustomBackgrounds, useCustomClasses, useCustomRaces } from "../data/customContent";

// Classes conjuradoras "de verdade" (concedem magia por padrão nas regras) --
// a seção de Magias só aparece se o personagem tiver alguma dessas. Artificer
// entra mesmo sem lista oficial de magia no compêndio do Foundry (não é
// classe do PHB original, SRD gratuito não inclui a lista dela) -- o filtro
// por classe no navegador de magias fica incompleto só pra ela (ver
// shared/schema/README.md), mas ela continua sendo conjuradora de verdade.
const SPELLCASTING_CLASSES = new Set([
  "Artificer", "Bard", "Cleric", "Druid", "Paladin", "Ranger", "Sorcerer", "Warlock", "Wizard",
]);

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
  // Mescla com os padrões em vez de usar `initialValue` cru — uma ficha salva
  // ANTES de um campo novo existir no schema (ex: `senses`, adicionado depois)
  // não tem essa chave no Firestore, e acessar `character.senses.algo` direto
  // quebra a tela inteira ao abrir pra editar. `createEmptyCharacter()`
  // primeiro garante que todo campo novo tem valor padrão mesmo em ficha antiga.
  const [character, setCharacter] = useState(() => ({ ...createEmptyCharacter(), ...initialValue }));
  const [feedback, setFeedback] = useState(null);
  const [spellBrowserOpen, setSpellBrowserOpen] = useState(false);
  const hasSpellcasting = character.classes.some((entry) => SPELLCASTING_CLASSES.has(entry.name));

  const customRaces = useCustomRaces();
  const customBackgrounds = useCustomBackgrounds();
  const customClasses = useCustomClasses();
  // Raça/antecedente/subclasse/feat mostram as duas edições juntas (com tag) —
  // só CLASSE é filtrada de verdade pelo modo do personagem. Customizado
  // (`Enviar Itens`) não tem `rules` marcado, então nunca é excluído pelo
  // filtro — sempre aparece nos dois modos.
  const allRaces = [...racesData, ...customRaces];
  const allBackgrounds = [...backgroundsData, ...customBackgrounds];
  // Personagem já existente de antes dessa feature não tem `rulesMode`
  // (`undefined`, não "") — filtrar por igualdade estrita contra isso batia
  // com NENHUMA classe (`"2014" === undefined` é sempre falso), esvaziando o
  // seletor de quem já tinha ficha pronta. Sem `rulesMode` escolhido, mostra
  // tudo sem filtrar (mesmo degrau permissivo que o módulo já usa pra Item
  // sem `rules` marcado) — só filtra de verdade depois que o modo é setado.
  const allClasses = character.rulesMode
    ? [...classesData.filter((c) => c.rules === character.rulesMode), ...customClasses]
    : [...classesData, ...customClasses];
  const allFeats = featsData;

  // Guarda o item exato clicado em cada picker (não só o nome) — necessário
  // pro card de descrição certo quando há mais de uma entrada com o mesmo
  // nome (ex: "Human" oficial e "Human [custom]").
  const [raceMatch, setRaceMatchState] = useState(null);
  const [backgroundMatch, setBackgroundMatchState] = useState(null);
  const [classMatches, setClassMatches] = useState([]);

  // Grava também a edição do item clicado (`raceRules`/`backgroundRules`) —
  // sem isso o módulo não sabe qual "Human"/"Life Domain" etc. (mesmo nome,
  // edições diferentes) foi escolhido de verdade na hora de buscar o Item.
  function setRaceMatch(item) {
    setRaceMatchState(item);
    set("raceRules", item?.rules ?? "");
  }
  function setBackgroundMatch(item) {
    setBackgroundMatchState(item);
    set("backgroundRules", item?.rules ?? "");
  }

  const descriptionCards = [
    { title: "Raça", item: raceMatch },
    { title: "Antecedente", item: backgroundMatch },
  ];
  for (const entry of classMatches) {
    descriptionCards.push({ title: "Classe", item: entry?.classData });
    descriptionCards.push({ title: "Subclasse", item: entry?.subclassData });
  }

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

  // O banco guarda idiomas de raça/antecedente como texto solto (ex: "comum,
  // anão"), não lista — sem separar por vírgula aqui, o idioma inteiro virava
  // UMA entrada só em vez de duas, e chegava assim no Actor sincronizado
  // (achado testando com um personagem real, ver shared/schema/README.md).
  function applyLanguages(text) {
    const parts = text.split(",").map((part) => part.trim()).filter(Boolean);
    setCharacter((prev) => ({ ...prev, languages: [...prev.languages, ...parts] }));
    setFeedback(`${parts.join(", ")} adicionado(s) em Idiomas`);
  }

  function applySize(size) {
    set("size", size);
  }

  function applySpellChoices(names) {
    setCharacter((prev) => {
      const existing = new Set(prev.spells.map((s) => s.name));
      const additions = names.filter((name) => !existing.has(name)).map((name) => ({ name, prepared: false }));
      return { ...prev, spells: [...prev.spells, ...additions] };
    });
    setFeedback(`${names.join(", ")} adicionado(s) em Magias`);
  }

  function applyEquipmentGrants(grants) {
    setCharacter((prev) => ({ ...prev, equipment: [...prev.equipment, ...grants] }));
    const labels = grants.map((item) => (item.quantity > 1 ? `${item.quantity}x ${item.name}` : item.name));
    setFeedback(`${labels.join(", ")} adicionado(s) em Equipamento`);
  }

  // Soma o bônus escolhido em cima do que já estiver digitado em Atributos —
  // não existe "atributo base" guardado separado, o campo já é sempre o
  // valor final (mesmo padrão de toda sugestão de OriginPicker: aplica uma
  // vez, o jogador ainda pode ajustar o número à mão depois).
  function applyAbilityBonus(picks) {
    setCharacter((prev) => ({
      ...prev,
      abilities: Object.fromEntries(
        Object.entries(prev.abilities).map(([key, value]) => [key, value + (picks[key] ?? 0)]),
      ),
    }));
    const labels = Object.entries(picks).map(([key, amount]) => `+${amount} ${key.toUpperCase()}`);
    setFeedback(`${labels.join(", ")} aplicado em Atributos`);
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(character);
  }

  return (
    <div className="sheet-layout">
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
        <label>
          Edição das regras
          <RulesModeToggle value={character.rulesMode} onChange={(value) => set("rulesMode", value)} />
        </label>
        <p className="field-hint">
          Só Classe é filtrada pela edição — Raça/Antecedente/Subclasse/Feat mostram as duas
          juntas, marcadas com a tag. Bônus de atributo: em 2014 vem da Raça, em 2024 vem do
          Antecedente — escolher a fonte errada pro modo não dá bônus.
        </p>

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
          onApplySize={applySize}
          onApplySpells={applySpellChoices}
          sizeValue={character.size}
          onMatch={setRaceMatch}
        />
        {character.rulesMode === "2014" && raceMatch?.abilityBonus && (
          <AbilityBonusPicker label="Bônus de atributo (Raça)" abilityBonus={raceMatch.abilityBonus} onApply={applyAbilityBonus} />
        )}

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
          onApplySpells={applySpellChoices}
          onMatch={setBackgroundMatch}
        />
        {character.rulesMode === "2024" && backgroundMatch?.abilityBonus && (
          <AbilityBonusPicker
            label="Bônus de atributo (Antecedente)"
            abilityBonus={backgroundMatch.abilityBonus}
            onApply={applyAbilityBonus}
          />
        )}

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
          subclassesData={subclassesData}
          onChange={(items) => set("classes", items)}
          onApplyEquipment={applyEquipmentGrants}
          onApplySkills={applySkills}
          onApplySpells={applySpellChoices}
          onMatchChange={setClassMatches}
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
        <legend>Sentidos</legend>
        <p className="field-hint">
          O Foundry não deriva isso da Raça sozinho (nem Visão no Escuro tem automação
          no compêndio oficial) — preencha manualmente o que a Raça/Feat conceder.
        </p>
        <label>
          Visão no Escuro
          <input
            type="number"
            value={character.senses.darkvision}
            onChange={(e) => setNested("senses", "darkvision", Number(e.target.value))}
          />
        </label>
        <label>
          Visão Cega
          <input
            type="number"
            value={character.senses.blindsight}
            onChange={(e) => setNested("senses", "blindsight", Number(e.target.value))}
          />
        </label>
        <label>
          Percepção por Tremor
          <input
            type="number"
            value={character.senses.tremorsense}
            onChange={(e) => setNested("senses", "tremorsense", Number(e.target.value))}
          />
        </label>
        <label>
          Visão Verdadeira
          <input
            type="number"
            value={character.senses.truesight}
            onChange={(e) => setNested("senses", "truesight", Number(e.target.value))}
          />
        </label>
        <label>
          Unidade
          <input
            type="text"
            placeholder="ft"
            value={character.senses.units}
            onChange={(e) => setNested("senses", "units", e.target.value)}
          />
        </label>
        <label>
          Sentido especial (texto livre)
          <input
            type="text"
            value={character.senses.special}
            onChange={(e) => setNested("senses", "special", e.target.value)}
          />
        </label>
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
        <FeatsInput
          items={allFeats}
          feats={character.feats}
          onChange={(feats) => set("feats", feats)}
          onApplySpells={applySpellChoices}
        />
      </fieldset>

      {hasSpellcasting && (
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
          <button type="button" onClick={() => setSpellBrowserOpen(true)}>
            Buscar magia
          </button>
        </fieldset>
      )}

      {spellBrowserOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSpellBrowserOpen(false);
          }}
        >
          <div className="modal-panel modal-panel-wide" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Magias</h3>
              <button type="button" onClick={() => setSpellBrowserOpen(false)}>
                Fechar
              </button>
            </div>
            <SpellBrowser
              spells={spellsData}
              rulesMode={character.rulesMode}
              onAdd={(name) => applySpellChoices([name])}
            />
          </div>
        </div>
      )}

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
    <DescriptionPanel cards={descriptionCards} />
    </div>
  );
}
