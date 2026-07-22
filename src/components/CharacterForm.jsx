import { useEffect, useMemo, useState } from "react";
import { ALIGNMENTS, createEmptyCharacter } from "../schema/character";
import { useCharacterAppliers } from "../hooks/useCharacterAppliers";
import { AbilitiesInput } from "./AbilitiesInput";
import { SkillsInput } from "./SkillsInput";
import { SensesInput } from "./SensesInput";
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
  // Memoizado (não recriado a cada render) — o OriginPicker re-deriva o match
  // da Raça/Antecedente sempre que `items` muda de referência (ver
  // OriginPicker.jsx), então uma array nova a cada tecla digitada em QUALQUER
  // campo do formulário disparava esse efeito à toa.
  const allRaces = useMemo(() => [...racesData, ...customRaces], [customRaces]);
  const allBackgrounds = useMemo(() => [...backgroundsData, ...customBackgrounds], [customBackgrounds]);
  // Personagem já existente de antes dessa feature não tem `rulesMode`
  // (`undefined`, não "") — filtrar por igualdade estrita contra isso batia
  // com NENHUMA classe (`"2014" === undefined` é sempre falso), esvaziando o
  // seletor de quem já tinha ficha pronta. Sem `rulesMode` escolhido, mostra
  // tudo sem filtrar (mesmo degrau permissivo que o módulo já usa pra Item
  // sem `rules` marcado) — só filtra de verdade depois que o modo é setado.
  // customClasses também entra no filtro — entrada customizada SEM `rules`
  // marcado (sobra de teste antigo duplicando classe oficial) não pode
  // aparecer nas duas edições ao mesmo tempo.
  const allClasses = character.rulesMode
    ? [
        ...classesData.filter((c) => c.rules === character.rulesMode),
        ...customClasses.filter((c) => c.rules === character.rulesMode),
      ]
    : [...classesData, ...customClasses];
  const allFeats = featsData;

  // Guarda o item exato clicado em cada picker (não só o nome) — necessário
  // pro card de descrição certo quando há mais de uma entrada com o mesmo
  // nome (ex: "Human" oficial e "Human [custom]").
  const [raceMatch, setRaceMatchState] = useState(null);
  const [backgroundMatch, setBackgroundMatchState] = useState(null);
  // Guardado aqui (fora do ClassesInput) pelo mesmo motivo do wizard — ver
  // CharacterCreationWizard.jsx: `useState` local no `ClassesInput` se perdia
  // sozinho e corrompia esse rastreamento. Nesta tela (sem navegação por
  // etapas) o componente nunca desmontava de verdade, então o bug não
  // aparecia aqui — mas control ficar no mesmo padrão evita reintroduzir o
  // problema se esta tela ganhar abas/etapas no futuro.
  const [classesMatches, setClassesMatches] = useState({});
  const classMatches = Object.values(classesMatches);

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

  const {
    applySkills,
    applyTools,
    applyLanguages,
    applyLanguageChoices,
    applySize,
    applySenses,
    applySpellChoices,
    applyEquipmentGrants,
    applyAbilityBonus,
  } = useCharacterAppliers(setCharacter, setFeedback);

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
          rules={character.raceRules}
          onChange={(text) => set("race", text)}
          placeholder="Digite pra buscar (ex: Elfo)"
          onApplySkills={applySkills}
          onApplyTools={applyTools}
          onApplyLanguages={applyLanguages}
          onApplyLanguageChoices={applyLanguageChoices}
          onApplyEquipment={applyEquipmentGrants}
          onApplySize={applySize}
          onApplySenses={applySenses}
          onApplySpells={applySpellChoices}
          sizeValue={character.size}
          onMatch={setRaceMatch}
          skillProficiencies={character.skillProficiencies}
          toolProficiencies={character.toolProficiencies}
          languages={character.languages}
        />
        {character.rulesMode === "2014" && raceMatch?.abilityBonus && (
          <AbilityBonusPicker label="Bônus de atributo (Raça)" abilityBonus={raceMatch.abilityBonus} onApply={applyAbilityBonus} />
        )}

        <OriginPicker
          label="Antecedente"
          items={allBackgrounds}
          value={character.background}
          rules={character.backgroundRules}
          onChange={(text) => set("background", text)}
          placeholder="Digite pra buscar (ex: Acólito)"
          onApplySkills={applySkills}
          onApplyTools={applyTools}
          onApplyLanguages={applyLanguages}
          onApplyLanguageChoices={applyLanguageChoices}
          onApplyEquipment={applyEquipmentGrants}
          onApplySpells={applySpellChoices}
          onMatch={setBackgroundMatch}
          skillProficiencies={character.skillProficiencies}
          toolProficiencies={character.toolProficiencies}
          languages={character.languages}
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
          matches={classesMatches}
          onMatchesChange={setClassesMatches}
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
        <SensesInput senses={character.senses} onChange={(senses) => set("senses", senses)} />
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
