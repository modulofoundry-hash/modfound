import { useMemo, useState } from "react";
import { StepSelecionarNiveis } from "./wizard/StepSelecionarNiveis";
import { StepPericias } from "./wizard/StepPericias";
import { StepMelhorias } from "./wizard/StepMelhorias";
import { StepEscolhasDeClasse } from "./wizard/StepEscolhasDeClasse";
import { StepMagias } from "./wizard/StepMagias";
import { SubclassPicker } from "./SubclassPicker";
import { HpRollPicker } from "./HpRollPicker";
import { FoundrySheetView } from "./FoundrySheetView";
import { abilityImprovementSlots, classChoiceSlots } from "./CharacterCreationWizard";
import { resolveClassMatches } from "../schema/resolveClassMatches";
import { useCharacterAppliers } from "../hooks/useCharacterAppliers";
import { useAbilityImprovements } from "../hooks/useAbilityImprovements";
import { useClassChoices } from "../hooks/useClassChoices";
import { useCustomClasses } from "../data/customContent";
import featsData from "../data/content/feats.json";
import optionalFeaturesData from "../data/content/optionalfeatures.json";
import classesData from "../data/content/classes.json";
import subclassesData from "../data/content/subclasses.json";

// Níveis de PV ainda pendentes de escolha (média/rolagem) nesta subida —
// classe ORIGINAL (index 0, já tinha nível ≥1 antes) só precisa escolher a
// partir do nível seguinte ao que já tinha (nível 1 dela já foi resolvido
// como PV máximo faz tempo); qualquer outra classe multiclasse — já existente
// ou adicionada NESTA sessão de level-up — precisa escolher desde o nível
// 1 dela, se esse nível ainda não tinha sido "vivido" antes.
function pendingHpLevels(originalLevel, newLevel, isOriginalClass) {
  const start = isOriginalClass ? Math.max(originalLevel + 1, 2) : originalLevel + 1;
  const levels = [];
  for (let lvl = start; lvl <= newLevel; lvl++) levels.push(lvl);
  return levels;
}

const STEP_DEFS = [
  {
    key: "niveis",
    label: "Níveis",
    title: "Selecionar Níveis",
    blurb:
      "Marque até que nível cada classe deve subir (níveis já alcançados aparecem travados). " +
      "Dá pra multiclassar adicionando uma classe nova. O nível total do personagem nunca passa de 20.",
  },
  {
    key: "pericias",
    label: "Perícias",
    title: "Perícias e Ferramentas",
    blurb:
      "A classe nova que você acabou de multiclassar concede proficiência em perícias e/ou ferramentas — escolha aqui. " +
      "Equipamento inicial NÃO entra: pelas regras de multiclasse, só a primeira classe do personagem concede equipamento de início.",
    // Só aparece pra classe ADICIONADA nesta sessão (índice >= originalLevels.length)
    // -- classe que já existia antes já teve essa escolha resolvida na criação/level-up
    // anterior; reabrir aqui de novo deixaria escolher em dobro (skillProficiencies é
    // lista achatada, sem rastreio de origem).
    conditional: ({ hasNewClassGrants }) => hasNewClassGrants,
  },
  {
    key: "pv",
    label: "PV",
    title: "Pontos de Vida",
    blurb: "Escolha média ou rolagem pra cada nível novo.",
    conditional: ({ pendingHp }) => pendingHp.length > 0,
  },
  {
    key: "melhorias",
    label: "Melhorias",
    title: "Melhoria de Atributo / Talento",
    blurb: "Os níveis novos liberaram Melhoria de Atributo ou Talento — escolha abaixo.",
    conditional: ({ hasNewImprovementSlots }) => hasNewImprovementSlots,
  },
  {
    key: "escolhas",
    label: "Escolhas de Classe",
    title: "Escolhas de Classe",
    blurb: "Estilo de Luta, Metamagia, Invocações, Manobras ou Infusões liberadas pelos níveis novos.",
    conditional: ({ hasNewChoiceSlots }) => hasNewChoiceSlots,
  },
  {
    key: "subclasse",
    label: "Subclasse",
    title: "Subclasse",
    blurb: "Algum nível novo liberou a escolha de subclasse.",
    conditional: ({ pendingSubclassRows }) => pendingSubclassRows.length > 0,
  },
  {
    key: "magias",
    label: "Magias",
    title: "Magias",
    blurb: "Truques/magias conhecidas ou espaço de preparo novos com o nível.",
    conditional: ({ classMatches }) => Object.values(classMatches).some((m) => m?.classData?.spellcasting),
  },
  {
    key: "confirmacao",
    label: "Confirmação",
    title: "Confirmação",
    blurb:
      'Revise antes de concluir. A ficha de ANTES do level-up é preservada como um card à parte, marcado "Original" — ' +
      "esta aqui é a que segue em frente.",
  },
];

export function LevelUpWizard({ initialCharacter, onSubmit, onCancel }) {
  const [character, setCharacter] = useState(() => JSON.parse(JSON.stringify(initialCharacter)));
  const [originalLevels] = useState(() => (initialCharacter.classes ?? []).map((c) => c.level ?? 1));
  const [classesMatches, setClassesMatches] = useState(() => resolveClassMatches(initialCharacter.classes));
  const [stepKey, setStepKey] = useState(STEP_DEFS[0].key);
  const [spellBrowserOpen, setSpellBrowserOpen] = useState(false);

  const customClasses = useCustomClasses();
  const allClassesForAdd = character.rulesMode
    ? [...classesData.filter((c) => c.rules === character.rulesMode), ...customClasses.filter((c) => c.rules === character.rulesMode)]
    : [...classesData, ...customClasses];
  const usedNames = new Set(character.classes.map((c) => c.name).filter(Boolean));
  const addableClasses = allClassesForAdd.filter((c) => !usedNames.has(c.name));

  const appliers = useCharacterAppliers(setCharacter);
  const { setImprovementChoice, moveImprovementChip, unassignImprovementChip, pickImprovementFeat } = useAbilityImprovements(
    character,
    setCharacter,
    appliers.applyAbilityBonus,
  );
  const { setClassChoice, clearClassChoice } = useClassChoices(setCharacter);

  function setLevel(index, level) {
    setCharacter((prev) => ({
      ...prev,
      classes: prev.classes.map((row, i) => (i === index ? { ...row, level: Math.max(0, level) } : row)),
    }));
  }

  function addClass(item) {
    const newIndex = character.classes.length;
    setCharacter((prev) => ({
      ...prev,
      classes: [...prev.classes, { name: item.name, rules: item.rules ?? "", subclass: "", subclassRules: "", level: 0, hpRolls: [] }],
    }));
    setClassesMatches((prev) => ({ ...prev, [newIndex]: { classData: item, subclassData: null } }));
  }

  function setHpRoll(index, level, mode) {
    setCharacter((prev) => {
      const row = prev.classes[index];
      const hpRolls = Array.from({ length: Math.max((row.hpRolls ?? []).length, level) }, (_, i) => row.hpRolls?.[i] ?? null);
      hpRolls[level - 1] = mode;
      return { ...prev, classes: prev.classes.map((r, i) => (i === index ? { ...r, hpRolls } : r)) };
    });
  }

  function pickSubclass(index, item) {
    setCharacter((prev) => ({
      ...prev,
      classes: prev.classes.map((row, i) => (i === index ? { ...row, subclass: item.name, subclassRules: item.rules ?? "" } : row)),
    }));
    setClassesMatches((prev) => ({ ...prev, [index]: { ...prev[index], subclassData: item } }));
  }

  const classMatches = classesMatches;

  const pendingHp = [];
  character.classes.forEach((row, index) => {
    const levels = pendingHpLevels(originalLevels[index] ?? 0, row.level ?? 0, index === 0);
    for (const level of levels) pendingHp.push({ classIndex: index, level, className: row.name });
  });

  // A PRESENÇA de cada etapa (aba visível) precisa depender só do NÍVEL
  // (antes vs depois), nunca de quanto já foi respondido -- checar "ainda
  // falta escolher algo" fazia a aba sumir no exato instante que o jogador
  // começava a preencher (ex: clicar "+2 num atributo" sem ainda arrastar o
  // chip já contava como "resolvido", escondendo a aba Melhorias e jogando o
  // wizard de volta pra etapa 1 no meio da escolha -- achado testando ao
  // vivo). `beforeCharacter` congela os níveis originais (sem tocar
  // `abilityImprovements`/`classChoices`) só pra essa comparação.
  const beforeCharacter = { ...character, classes: character.classes.map((row, i) => ({ ...row, level: originalLevels[i] ?? 0 })) };

  const improvementSlots = abilityImprovementSlots(character, classMatches);
  const hasNewImprovementSlots = improvementSlots.length > abilityImprovementSlots(beforeCharacter, classMatches).length;

  const choiceSlots = classChoiceSlots(character, classMatches);
  const totalChoiceCount = (slots) => slots.reduce((sum, s) => sum + s.count, 0);
  const hasNewChoiceSlots = totalChoiceCount(choiceSlots) > totalChoiceCount(classChoiceSlots(beforeCharacter, classMatches));

  // Mesma ideia -- baseado só em `row.level` (nunca muda ao ESCOLHER a
  // subclasse), não em `!row.subclass` (que sumiria a aba assim que a
  // primeira classe elegível fosse resolvida, mesmo com outra ainda
  // pendente). O corpo da etapa mostra o picker pra toda classe elegível,
  // já escolhida ou não -- mesmo padrão de "sempre mostra, se autocura" do
  // resto do wizard (o picker já destaca a seleção atual sozinho).
  const eligibleSubclassRows = character.classes
    .map((row, index) => ({ row, index }))
    .filter(({ row, index }) => (row.level ?? 0) >= (classMatches[index]?.classData?.subclassLevel ?? Infinity));

  // Índice >= originalLevels.length = classe que não existia antes desta
  // sessão (entrou via "Adicionar classe"). Só ela pode ter concessão de
  // perícia/ferramenta ainda em aberto -- uma classe que já existia teve
  // isso resolvido na criação (ou num level-up anterior). EQUIPAMENTO fica
  // de fora de propósito (`equipmentSlots` removido do classData copiado) --
  // achado testando ao vivo: pelas regras de multiclasse, só a PRIMEIRA
  // classe do personagem concede equipamento inicial; mostrar o picker de
  // equipamento pra classe multiclassada deixava escolher uma 2ª arma/mochila
  // que a regra não concede, e pior, duplicava item que o personagem já
  // possuía (ex: já tinha "Shortbow" antes, ganhava outro "Shortbow" do
  // equipmentSlots do Ladino) -- sem esse corte, `equipment` acumulava cópia
  // sobre cópia a cada classe nova adicionada num level-up.
  // `classMatches` aqui é OBJETO indexado por posição (não array, ver
  // `const classMatches = classesMatches` acima) -- StepPericias espera
  // array, por isso o `character.classes.map` (não `classMatches.map`).
  const newClassGrantsMatches = character.classes.map((_, index) => {
    if (index < originalLevels.length) return null;
    const match = classMatches[index];
    if (!match?.classData) return match;
    return { ...match, classData: { ...match.classData, equipmentSlots: [] } };
  });
  const hasNewClassGrants = newClassGrantsMatches.some((match) => {
    const cd = match?.classData;
    return cd && (cd.skillChoice || cd.toolChoice || cd.skills?.length > 0 || cd.tools?.length > 0);
  });

  const conditionalCtx = {
    pendingHp,
    hasNewImprovementSlots,
    hasNewChoiceSlots,
    pendingSubclassRows: eligibleSubclassRows,
    classMatches,
    hasNewClassGrants,
  };

  const visibleSteps = useMemo(
    () => STEP_DEFS.filter((step) => !step.conditional || step.conditional(conditionalCtx)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [character, classesMatches],
  );

  const stepIndex = Math.max(
    0,
    visibleSteps.findIndex((s) => s.key === stepKey),
  );
  const step = visibleSteps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === visibleSteps.length - 1;

  function goTo(index) {
    const clamped = Math.min(Math.max(index, 0), visibleSteps.length - 1);
    setStepKey(visibleSteps[clamped].key);
  }
  function goBack() {
    goTo(stepIndex - 1);
  }
  function goNext() {
    if (isLast) {
      // Classe adicionada nesta sessão mas nunca marcada (ficou em nível 0)
      // não faz sentido entrar na ficha final -- descarta antes de submeter.
      const classes = character.classes.filter((row) => (row.level ?? 0) > 0);
      onSubmit({ ...character, classes });
      return;
    }
    goTo(stepIndex + 1);
  }

  function renderStepBody() {
    switch (step.key) {
      case "niveis":
        return (
          <StepSelecionarNiveis
            classes={character.classes}
            originalLevels={originalLevels}
            classMatches={classMatches}
            addableClasses={addableClasses}
            onSetLevel={setLevel}
            onAddClass={addClass}
          />
        );
      case "pericias":
        return (
          <StepPericias
            skillProficiencies={character.skillProficiencies}
            skillExpertise={character.skillExpertise}
            onChangeSkills={(proficiencies, expertise) =>
              setCharacter((prev) => ({ ...prev, skillProficiencies: proficiencies, skillExpertise: expertise }))
            }
            toolProficiencies={character.toolProficiencies}
            onChangeTools={(tools) => setCharacter((prev) => ({ ...prev, toolProficiencies: tools }))}
            raceMatch={null}
            backgroundMatch={null}
            classMatches={newClassGrantsMatches}
            appliers={appliers}
          />
        );
      case "pv": {
        const byClass = new Map();
        for (const entry of pendingHp) {
          if (!byClass.has(entry.classIndex)) byClass.set(entry.classIndex, []);
          byClass.get(entry.classIndex).push(entry);
        }
        return (
          <div className="wizard-step-pv">
            {[...byClass.entries()].map(([classIndex, entries]) => (
              <div key={classIndex} className="levelup-hp-block">
                <h4>{entries[0].className}</h4>
                {entries.map(({ level }) => (
                  <HpRollPicker
                    key={level}
                    level={level}
                    value={character.classes[classIndex]?.hpRolls?.[level - 1]}
                    onChange={(mode) => setHpRoll(classIndex, level, mode)}
                  />
                ))}
              </div>
            ))}
          </div>
        );
      }
      case "melhorias":
        return (
          <StepMelhorias
            slots={improvementSlots}
            abilities={character.abilities}
            abilityImprovements={character.abilityImprovements}
            featsData={featsData}
            onSetChoice={setImprovementChoice}
            onMoveChip={moveImprovementChip}
            onUnassignChip={unassignImprovementChip}
            onPickFeat={pickImprovementFeat}
          />
        );
      case "escolhas":
        return (
          <StepEscolhasDeClasse
            slots={choiceSlots}
            classChoices={character.classChoices}
            rulesMode={character.rulesMode}
            optionalFeaturesData={optionalFeaturesData}
            featsData={featsData}
            onPick={setClassChoice}
            onClear={clearClassChoice}
          />
        );
      case "subclasse":
        return (
          <div className="wizard-step-subclasse">
            {eligibleSubclassRows.map(({ row, index }) => (
              <div key={index} className="levelup-subclass-block">
                <h4>{row.name}</h4>
                <SubclassPicker
                  classData={classMatches[index]?.classData}
                  subclassesData={subclassesData}
                  level={row.level}
                  value={row.subclass}
                  selectedRules={row.subclassRules}
                  onPick={(item) => pickSubclass(index, item)}
                />
              </div>
            ))}
          </div>
        );
      case "magias":
        return (
          <StepMagias
            character={character}
            classMatches={classMatches}
            spells={character.spells}
            onChangeSpells={(spells) => setCharacter((prev) => ({ ...prev, spells }))}
            browserOpen={spellBrowserOpen}
            onToggleBrowser={setSpellBrowserOpen}
          />
        );
      case "confirmacao":
        return <FoundrySheetView character={character} />;
      default:
        return null;
    }
  }

  return (
    <div className="wizard">
      <aside className="wizard-summary">
        <h3>Level-Up</h3>
        <dl className="wizard-summary-list">
          <div className="wizard-summary-row">
            <dt>Personagem</dt>
            <dd>{character.name || "—"}</dd>
          </div>
          <div className="wizard-summary-row">
            <dt>Classes</dt>
            <dd>
              {character.classes
                .filter((c) => c.name)
                .map((c) => `${c.name} ${c.level}`)
                .join(" / ") || "—"}
            </dd>
          </div>
        </dl>
      </aside>
      <div className="wizard-main">
        <ol className="wizard-progress">
          {visibleSteps.map((s, index) => (
            <li key={s.key} className={index === stepIndex ? "wizard-progress-current" : index < stepIndex ? "wizard-progress-done" : ""}>
              <button type="button" onClick={() => goTo(index)}>
                {s.label}
              </button>
            </li>
          ))}
        </ol>

        <h2>{step.title}</h2>
        <p className="wizard-blurb">{step.blurb}</p>

        <div className="wizard-step-body">{renderStepBody()}</div>

        <div className="wizard-nav">
          <button type="button" onClick={onCancel}>
            Cancelar
          </button>
          <div className="wizard-nav-right">
            <button type="button" onClick={goBack} disabled={isFirst}>
              Voltar
            </button>
            <button type="button" onClick={goNext}>
              {isLast ? "Concluir Level-Up" : "Próximo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
