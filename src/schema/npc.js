export const SIZES = [
  { id: "tiny", label: "Miúdo" },
  { id: "sm", label: "Pequeno" },
  { id: "med", label: "Médio" },
  { id: "lg", label: "Grande" },
  { id: "huge", label: "Enorme" },
  { id: "grg", label: "Descomunal" },
];

// `OriginPicker`/`SizeChoice` devolvem a letra crua do banco de conteúdo
// (T/S/M/L/H/G, mesmo formato de `character.size` — ver SIZE_KEY_MAP em
// buildCharacter.js) — mas o <select> de Tamanho do NPC usa as chaves de
// verdade do Foundry (tiny/sm/med/...), igual `system.traits.size` espera.
// Sem traduzir aqui, `npc.size` ficava com "M" solto, que não bate com
// nenhuma <option>, e o navegador mostrava a primeira opção da lista
// ("Miúdo") como se estivesse selecionada — mesma armadilha já corrigida
// antes pro caso de tamanho vazio, agora achada pro caso de tamanho com
// valor errado.
export const SIZE_LETTER_TO_KEY = { T: "tiny", S: "sm", M: "med", L: "lg", H: "huge", G: "grg" };

// Corresponde a CONFIG.DND5E.creatureTypes (dnd5e/module/data/shared/creature-type-field.mjs)
export const CREATURE_TYPES = [
  "aberration",
  "beast",
  "celestial",
  "construct",
  "dragon",
  "elemental",
  "fey",
  "fiend",
  "giant",
  "humanoid",
  "monstrosity",
  "ooze",
  "plant",
  "undead",
];

export function createEmptyNpc() {
  return {
    name: "",
    imageUrl: "",
    tokenImageUrl: "",
    rulesMode: "",
    size: "med",
    race: "",
    raceRules: "",
    type: { value: "", subtype: "", swarm: "", custom: "" },
    alignment: "",
    important: false,
    personality: { ideal: "", bond: "", flaw: "" },
    armorClass: 10,
    hitPoints: { max: 10, formula: "" },
    speed: { walk: 30, fly: 0, swim: 0, climb: 0, burrow: 0, hover: false, units: "ft" },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    savingThrowProficiencies: [],
    skillProficiencies: [],
    skillExpertise: [],
    damageResistances: [],
    damageImmunities: [],
    damageVulnerabilities: [],
    conditionImmunities: [],
    senses: { darkvision: 0, blindsight: 0, tremorsense: 0, truesight: 0, units: "ft", special: "" },
    languages: [],
    challengeRating: "",
    spellcastingAbility: "",
    spells: [],
    traits: [],
    weapons: [],
    actions: [],
    bonusActions: [],
    reactions: [],
    legendaryActionsPerTurn: 0,
    legendaryActions: [],
    legendaryResistances: 0,
    hasLairActions: false,
    lairInitiative: 20,
    notes: "",
  };
}
