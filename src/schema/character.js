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

// "2014" = PHB clássico (raça dá bônus de atributo), "2024" = PHB revisado
// (antecedente dá bônus de atributo). Raça/antecedente/subclasse/feat da
// edição "errada" continuam disponíveis pro personagem (só sem o bônus de
// atributo se for a fonte errada) — só CLASSE é filtrada de verdade por modo.
export const RULES_MODES = [
  { id: "2014", label: "2014 (Player's Handbook clássico)" },
  { id: "2024", label: "2024 (Player's Handbook revisado)" },
];

export const SIZE_LABELS = {
  T: "Minúsculo",
  S: "Pequeno",
  M: "Médio",
  L: "Grande",
  H: "Enorme",
  G: "Descomunal",
};

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
    tokenImageUrl: "",
    rulesMode: "",
    alignment: "",
    race: "",
    // Guarda a edição do item de verdade CLICADO (não dá pra inferir do
    // rulesMode, já que raça/antecedente/subclasse podem ser da edição
    // "errada" de propósito) — sem isso, o módulo não teria como saber qual
    // das duas "Human"/"Life Domain" etc. (mesmo nome, edições diferentes)
    // foi escolhida de verdade na hora de buscar o Item.
    raceRules: "",
    size: "",
    background: "",
    backgroundRules: "",
    // `hpRolls[i]` = escolha de PV do nível i+1 dessa entrada de classe:
    // ausente = média (padrão, retrocompatível — ficha antiga sem esse campo
    // continua igual), "avg" = média escolhida conscientemente, "pending" =
    // jogador pediu rolagem mas o Foundry ainda não rolou, número = já
    // resolvido (rolado de verdade no Foundry, ou lido de volta de lá).
    classes: [{ name: "", subclass: "", subclassRules: "", level: 1, hpRolls: [] }],
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    skillProficiencies: [],
    skillExpertise: [],
    toolProficiencies: [],
    languages: [],
    // O Foundry não deriva sentido nenhum (nem Visão no Escuro de raça)
    // sozinho — mesmo arrastando a raça pelo assistente oficial, o Item de
    // Visão no Escuro não carrega automação nenhuma, é campo manual na ficha
    // (confirmado testando direto no compêndio). Precisa desse campo aqui pro
    // jogador preencher, senão fica sempre 0/vazio no personagem sincronizado.
    senses: { darkvision: 0, blindsight: 0, tremorsense: 0, truesight: 0, units: "ft", special: "" },
    currency: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
    equipment: [],
    feats: [],
    spells: [],
    inspiration: false,
    personality: { trait: "", ideal: "", bond: "", flaw: "" },
    appearance: { gender: "", age: "", height: "", weight: "", eyes: "", hair: "", skin: "", faith: "", description: "" },
    notes: "",
  };
}
