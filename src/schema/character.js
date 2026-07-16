export const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];

export const ABILITY_LABELS = {
  str: "Força",
  dex: "Destreza",
  con: "Constituição",
  int: "Inteligência",
  wis: "Sabedoria",
  cha: "Carisma",
};

export const SKILLS = [
  { id: "acr", label: "Acrobacia", ability: "dex" },
  { id: "ani", label: "Adestrar Animais", ability: "wis" },
  { id: "arc", label: "Arcanismo", ability: "int" },
  { id: "ath", label: "Atletismo", ability: "str" },
  { id: "dec", label: "Enganação", ability: "cha" },
  { id: "his", label: "História", ability: "int" },
  { id: "ins", label: "Intuição", ability: "wis" },
  { id: "itm", label: "Intimidação", ability: "cha" },
  { id: "inv", label: "Investigação", ability: "int" },
  { id: "med", label: "Medicina", ability: "wis" },
  { id: "nat", label: "Natureza", ability: "int" },
  { id: "prc", label: "Percepção", ability: "wis" },
  { id: "prf", label: "Atuação", ability: "cha" },
  { id: "per", label: "Persuasão", ability: "cha" },
  { id: "rel", label: "Religião", ability: "int" },
  { id: "slt", label: "Prestidigitação", ability: "dex" },
  { id: "ste", label: "Furtividade", ability: "dex" },
  { id: "sur", label: "Sobrevivência", ability: "wis" },
];

export const ALIGNMENTS = [
  "Leal e Bom",
  "Neutro e Bom",
  "Caótico e Bom",
  "Leal e Neutro",
  "Neutro",
  "Caótico e Neutro",
  "Leal e Mau",
  "Neutro e Mau",
  "Caótico e Mau",
];

export function createEmptyCharacter() {
  return {
    name: "",
    imageUrl: "",
    alignment: "",
    race: "",
    background: "",
    classes: [{ name: "", subclass: "", level: 1 }],
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    skillProficiencies: [],
    skillExpertise: [],
    languages: [],
    equipment: [],
    feats: [],
    spells: [],
    personality: { traits: "", ideals: "", bonds: "", flaws: "" },
    notes: "",
  };
}
