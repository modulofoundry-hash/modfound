import { useMemo, useState } from "react";
import { createEmptyCharacter } from "../schema/character";
import { StepSelecionarNiveis } from "./wizard/StepSelecionarNiveis";
import { StepPericias } from "./wizard/StepPericias";
import { StepMelhorias } from "./wizard/StepMelhorias";
import { StepEscolhasDeClasse } from "./wizard/StepEscolhasDeClasse";
import { StepMaestriaDeArma } from "./wizard/StepMaestriaDeArma";
import { StepProficienciaDeArma } from "./wizard/StepProficienciaDeArma";
import { StepAnimalEnhancement } from "./wizard/StepAnimalEnhancement";
import { StepMagias } from "./wizard/StepMagias";
import { SubclassPicker } from "./SubclassPicker";
import { HpRollPicker } from "./HpRollPicker";
import { FoundrySheetView } from "./FoundrySheetView";
import { abilityImprovementSlots, classChoiceSlots } from "./CharacterCreationWizard";
import { weaponMasterySlots, resolveFixedWeaponProficiency } from "../utils/weaponMastery";
import { weaponProficiencySlots } from "../utils/weaponProficiency";
import { animalEnhancementSlots, reversedAnimalEnhancementChoices } from "../utils/animalEnhancement";
import { resolveClassMatches } from "../schema/resolveClassMatches";
import { computeGrantedSpells, computeSubclassSpellChoices, computeFeatSpellChoices } from "../schema/grantedSpells";
import { hasActiveSpellcasting } from "../schema/spellProgression";
import { useCharacterAppliers } from "../hooks/useCharacterAppliers";
import { useAbilityImprovements } from "../hooks/useAbilityImprovements";
import { useClassChoices } from "../hooks/useClassChoices";
import { useWeaponMasteryChoices } from "../hooks/useWeaponMasteryChoices";
import { useWeaponProficiencyChoices } from "../hooks/useWeaponProficiencyChoices";
import { useAnimalEnhancementChoices } from "../hooks/useAnimalEnhancementChoices";
import featsData from "../data/content/feats.json";
import optionalFeaturesData from "../data/content/optionalfeatures.json";
import classesData from "../data/content/classes.json";
import subclassesData from "../data/content/subclasses.json";
import racesData from "../data/content/races.json";
import backgroundsData from "../data/content/backgrounds.json";

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

// Mesmo mecanismo de `abilityImprovementSlots` (CharacterCreationWizard.jsx),
// só que pra Expertise -- níveis vêm de `classData.expertiseLevels` (gerado a
// partir da feature "Expertise" de cada classe, `generate-site-content.mjs`,
// não hardcoded por nome de classe: Bardo/Ladino têm 2 cada, mas o Patrulheiro
// 2024 também ganha no nível 9, achado só por ser orientado a dado).
function expertiseSlots(character, classMatches) {
  const slots = [];
  character.classes.forEach((row, classIndex) => {
    const levels = classMatches[classIndex]?.classData?.expertiseLevels ?? [];
    for (const level of levels) {
      if (level <= (row.level ?? 1)) slots.push({ classIndex, level, className: row.name });
    }
  });
  return slots;
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
      "Se você multiclassou pra uma classe nova, ela concede proficiência em perícias e/ou ferramentas — escolha aqui " +
      "(equipamento inicial NÃO entra: só a primeira classe do personagem concede equipamento de início). " +
      "Se uma classe que você já tinha chegou num nível que concede Expertise, marque aqui também — dobra o bônus de " +
      "proficiência numa perícia em que o personagem já é proficiente.",
    // Aparece OU pra classe ADICIONADA nesta sessão (índice >= originalLevels.length)
    // -- classe que já existia antes já teve essa escolha resolvida na criação/level-up
    // anterior; reabrir aqui de novo deixaria escolher em dobro (skillProficiencies é
    // lista achatada, sem rastreio de origem) -- OU quando alguma classe (nova ou já
    // existente) cruzou um nível novo de Expertise nesta sessão (achado real: a etapa
    // nunca aparecia pra Bardo/Ladino/Patrulheiro subindo dentro da MESMA classe,
    // só multiclasse -- Expertise por nível normal nunca tinha jeito de ser marcada).
    conditional: ({ hasNewClassGrants, hasNewExpertiseSlots }) => hasNewClassGrants || hasNewExpertiseSlots,
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
    key: "proficiencia",
    label: "Proficiência",
    title: "Proficiência com Arma",
    blurb: "Um talento novo (Weapon Master, PHB 2014) liberou proficiência com arma à escolha.",
    conditional: ({ hasNewWeaponProficiencySlots }) => hasNewWeaponProficiencySlots,
  },
  {
    key: "maestria",
    label: "Maestria",
    title: "Weapon Mastery (2024)",
    blurb: "Os níveis novos liberaram mais armas com propriedade de maestria ativa (Fighter/Barbarian) ou o talento Weapon Master.",
    conditional: ({ hasNewWeaponMasterySlots }) => hasNewWeaponMasterySlots,
  },
  {
    key: "animalEnhancement",
    label: "Animal Enhancement",
    title: "Animal Enhancement (Simic Hybrid)",
    blurb: "O nível 5 liberou a segunda escolha de Animal Enhancement (Simic Hybrid, GGR).",
    conditional: ({ hasNewAnimalEnhancementSlots }) => hasNewAnimalEnhancementSlots,
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
    // Mesmo motivo do CharacterCreationWizard: sem isso, uma raça com magia
    // concedida (ex: Erina Spiritfarer) nunca mostrava o aviso de "Concedidas
    // automaticamente" num personagem sem nenhuma classe conjuradora. Terceira
    // condição (`computeSubclassSpellChoices`) é a mesma correção que também
    // faltava pra escolha de magia FIXA de subclasse (ex: Black Magic do
    // Pugilist/Hand of Dread) -- sem `spellcasting` real nem grant nomeável,
    // as duas primeiras condições nunca bastavam pra essa etapa aparecer.
    // Quarta condição (`computeFeatSpellChoices`) é a mesma correção pro caso
    // de um talento com pool de escolha (Magic Initiate etc.) ser trocado por
    // bônus de atributo NESTE level-up.
    conditional: ({ character, classMatches, raceMatch }) =>
      hasActiveSpellcasting(character, classMatches) ||
      computeGrantedSpells({ character, raceMatch, classMatches, featsData, optionalFeaturesData }).length > 0 ||
      computeSubclassSpellChoices(character, classMatches).length > 0 ||
      computeFeatSpellChoices(character, featsData).length > 0,
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
  // Mescla com os padrões (mesmo padrão de CharacterCreationWizard.jsx) --
  // personagem mais antigo que um campo novo do schema (ex: skillExpertise)
  // chega sem essa chave, e `.includes` num array undefined quebra a tela na
  // hora de marcar Expertise (achado real, ver SkillsInput.jsx). Continua
  // clonando fundo (JSON round-trip) depois de mesclar -- o wizard nunca deve
  // mutar `initialCharacter` por referência.
  const [character, setCharacter] = useState(() =>
    JSON.parse(JSON.stringify({ ...createEmptyCharacter(), ...initialCharacter })),
  );
  const [originalLevels] = useState(() => (initialCharacter.classes ?? []).map((c) => c.level ?? 1));
  const [classesMatches, setClassesMatches] = useState(() =>
    resolveClassMatches(initialCharacter.classes, initialCharacter.rulesMode),
  );
  const [stepKey, setStepKey] = useState(STEP_DEFS[0].key);
  const [spellBrowserOpen, setSpellBrowserOpen] = useState(false);

  const allClassesForAdd = character.rulesMode
    ? classesData.filter((c) => c.rules === character.rulesMode)
    : classesData;
  const usedNames = new Set(character.classes.map((c) => c.name).filter(Boolean));
  const addableClasses = allClassesForAdd.filter((c) => !usedNames.has(c.name));

  const appliers = useCharacterAppliers(setCharacter);
  const { setImprovementChoice, moveImprovementChip, unassignImprovementChip, pickImprovementFeat, pruneImprovementsAbove } = useAbilityImprovements(
    character,
    setCharacter,
    appliers.applyAbilityBonus,
  );
  const { setClassChoice, clearClassChoice } = useClassChoices(setCharacter);
  const { setWeaponMasteryChoice, clearWeaponMasteryChoice } = useWeaponMasteryChoices(setCharacter);
  const { setWeaponProficiencyChoice, clearWeaponProficiencyChoice } = useWeaponProficiencyChoices(setCharacter);
  const { setAnimalEnhancementChoice, clearAnimalEnhancementChoice } = useAnimalEnhancementChoices(setCharacter);

  function setLevel(index, level) {
    const clamped = Math.max(0, level);
    // Desmarcar um nível já preenchido (ASI/talento escolhido na etapa
    // Melhorias) precisa desfazer o que já foi aplicado -- senão o bônus de
    // atributo (ou o talento) fica pra sempre em `character.abilities`/
    // `character.feats`, mesmo o card correspondente já tendo sumido da
    // lista de etapas (ver pruneImprovementsAbove em useAbilityImprovements.js).
    pruneImprovementsAbove(index, clamped);
    setCharacter((prev) => ({
      ...prev,
      classes: prev.classes.map((row, i) => (i === index ? { ...row, level: clamped } : row)),
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
  // Level-up nunca troca raça (só a etapa de Criação tem picker de Raça) --
  // resolvido aqui só pro aviso de "Magias Concedidas" (StepMagias) e pra
  // ficha final (FoundrySheetView) saberem o que a raça já concede.
  const raceMatch = useMemo(
    () =>
      racesData.find((r) => r.name === character.race && r.rules === character.raceRules) ??
      racesData.find((r) => r.name === character.race) ??
      null,
    [character.race, character.raceRules],
  );

  // Todo este bloco (que chama cada slot-finder DUAS vezes -- uma pra `character`,
  // outra pra `beforeCharacter` -- só pra saber se algo ficou disponível DE NOVO
  // nesta subida de nível) rodava sem memoização nenhuma, a cada render, mesmo
  // digitando num campo sem nenhuma relação (ex: notas/aparência). Chaveado nos
  // campos mecânicos específicos que cada slot-finder lê (mesmo levantamento feito
  // pro `visibleSteps` de CharacterCreationWizard.jsx, S1 do plano de otimização) --
  // `originalLevels` é `useState` fixado uma vez no mount, nunca muda de verdade,
  // mas entra no array por completude.
  const {
    pendingHp,
    improvementSlots,
    hasNewImprovementSlots,
    expertiseSlotsNow,
    hasNewExpertiseSlots,
    choiceSlots,
    hasNewChoiceSlots,
    weaponMasterySlotsNow,
    hasNewWeaponMasterySlots,
    weaponProficiencySlotsNow,
    hasNewWeaponProficiencySlots,
    animalEnhancementSlotsNow,
    hasNewAnimalEnhancementSlots,
    eligibleSubclassRows,
    newClassGrantsMatches,
    hasNewClassGrants,
  } = useMemo(() => {
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

    const expertiseSlotsNow = expertiseSlots(character, classMatches);
    const hasNewExpertiseSlots = expertiseSlotsNow.length > expertiseSlots(beforeCharacter, classMatches).length;

    const choiceSlots = classChoiceSlots(character, classMatches, featsData, backgroundsData);
    const totalChoiceCount = (slots) => slots.reduce((sum, s) => sum + s.count, 0);
    const hasNewChoiceSlots = totalChoiceCount(choiceSlots) > totalChoiceCount(classChoiceSlots(beforeCharacter, classMatches, featsData, backgroundsData));

    const weaponMasterySlotsNow = weaponMasterySlots(character, classMatches, featsData);
    const hasNewWeaponMasterySlots =
      totalChoiceCount(weaponMasterySlotsNow) > totalChoiceCount(weaponMasterySlots(beforeCharacter, classMatches, featsData));

    const weaponProficiencySlotsNow = weaponProficiencySlots(character, racesData, featsData);
    const hasNewWeaponProficiencySlots =
      totalChoiceCount(weaponProficiencySlotsNow) > totalChoiceCount(weaponProficiencySlots(beforeCharacter, racesData, featsData));

    const animalEnhancementSlotsNow = animalEnhancementSlots(character);
    const hasNewAnimalEnhancementSlots = animalEnhancementSlotsNow.length > animalEnhancementSlots(beforeCharacter).length;

    const pendingHp = [];
    character.classes.forEach((row, index) => {
      const levels = pendingHpLevels(originalLevels[index] ?? 0, row.level ?? 0, index === 0);
      for (const level of levels) pendingHp.push({ classIndex: index, level, className: row.name });
    });

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

    return {
      pendingHp,
      improvementSlots,
      hasNewImprovementSlots,
      expertiseSlotsNow,
      hasNewExpertiseSlots,
      choiceSlots,
      hasNewChoiceSlots,
      weaponMasterySlotsNow,
      hasNewWeaponMasterySlots,
      weaponProficiencySlotsNow,
      hasNewWeaponProficiencySlots,
      animalEnhancementSlotsNow,
      hasNewAnimalEnhancementSlots,
      eligibleSubclassRows,
      newClassGrantsMatches,
      hasNewClassGrants,
    };
  }, [
    character.classes,
    character.abilityImprovements,
    character.feats,
    character.background,
    character.backgroundRules,
    character.classChoices,
    character.weaponMasteryChoices,
    character.weaponProficiencyChoices,
    character.animalEnhancementChoices,
    character.race,
    character.raceRules,
    classMatches,
    originalLevels,
  ]);

  const conditionalCtx = {
    character,
    raceMatch,
    pendingHp,
    hasNewImprovementSlots,
    hasNewExpertiseSlots,
    hasNewChoiceSlots,
    hasNewWeaponMasterySlots,
    hasNewWeaponProficiencySlots,
    hasNewAnimalEnhancementSlots,
    pendingSubclassRows: eligibleSubclassRows,
    classMatches,
    hasNewClassGrants,
  };

  // Só a etapa "magias" lê `character`/`classMatches`/`raceMatch` direto (via
  // hasActiveSpellcasting/computeGrantedSpells) -- as outras só leem os booleans/
  // arrays já derivados acima (que por sua vez já são o resultado memoizado).
  const visibleSteps = useMemo(
    () => STEP_DEFS.filter((step) => !step.conditional || step.conditional(conditionalCtx)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      raceMatch,
      classMatches,
      pendingHp,
      hasNewImprovementSlots,
      hasNewExpertiseSlots,
      hasNewChoiceSlots,
      hasNewWeaponMasterySlots,
      hasNewWeaponProficiencySlots,
      hasNewAnimalEnhancementSlots,
      eligibleSubclassRows,
      hasNewClassGrants,
      character.classes,
      character.abilities,
      character.feats,
      character.classChoices,
      character.rulesMode,
    ],
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
      // Descartar desloca o índice de qualquer classe que vinha DEPOIS dela
      // -- sem reindexar `abilityImprovements`/`weaponMasteryChoices` (que
      // guardam a escolha por `classIndex`/`sourceKey:"class:<index>"`) junto,
      // a escolha de uma classe multiclasse que sobreviveu ficava presa num
      // índice que passa a apontar pra OUTRA classe (bug real achado na
      // revisão: mesmo problema que handleRemoveClass do wizard de Criação já
      // resolve, nunca replicado aqui pro descarte no submit).
      const indexMap = new Map();
      let nextIndex = 0;
      character.classes.forEach((row, i) => {
        if ((row.level ?? 0) > 0) {
          indexMap.set(i, nextIndex);
          nextIndex++;
        }
      });
      const classes = character.classes.filter((row) => (row.level ?? 0) > 0);
      const abilityImprovements = character.abilityImprovements
        .filter((improvement) => indexMap.has(improvement.classIndex))
        .map((improvement) => ({ ...improvement, classIndex: indexMap.get(improvement.classIndex) }));
      const weaponMasteryChoices = (character.weaponMasteryChoices ?? [])
        .map((choice) => {
          const match = /^class:(\d+)$/.exec(choice.sourceKey);
          if (!match) return choice;
          const oldIndex = Number(match[1]);
          if (!indexMap.has(oldIndex)) return null;
          return { ...choice, sourceKey: `class:${indexMap.get(oldIndex)}` };
        })
        .filter(Boolean);
      onSubmit({ ...character, classes, abilityImprovements, weaponMasteryChoices });
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
            expertiseGrants={expertiseSlotsNow}
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
      case "proficiencia":
        return (
          <StepProficienciaDeArma
            slots={weaponProficiencySlotsNow}
            weaponProficiencies={character.weaponProficiencies ?? []}
            onPick={setWeaponProficiencyChoice}
            onClear={clearWeaponProficiencyChoice}
          />
        );
      case "maestria":
        return (
          <StepMaestriaDeArma
            slots={weaponMasterySlotsNow}
            weaponMasteryChoices={character.weaponMasteryChoices ?? []}
            proficientKeys={resolveFixedWeaponProficiency(character, classMatches, racesData)}
            onPick={setWeaponMasteryChoice}
            onClear={clearWeaponMasteryChoice}
          />
        );
      case "animalEnhancement":
        return (
          <StepAnimalEnhancement
            slots={animalEnhancementSlotsNow}
            animalEnhancementChoices={character.animalEnhancementChoices ?? []}
            reversedChoices={reversedAnimalEnhancementChoices(character)}
            optionalFeaturesData={optionalFeaturesData}
            onPick={setAnimalEnhancementChoice}
            onClear={clearAnimalEnhancementChoice}
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
            raceMatch={raceMatch}
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
