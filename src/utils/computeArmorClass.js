// Calcula a CA seguindo a regra real (base 10+Destreza / fórmula de armadura / traços
// especiais de classe e raça), pesquisado e catalogado nesta sessão. Dado curado (tabela
// de nome→fórmula), não regex genérico -- mesma filosofia do resto do banco de conteúdo.
// Bladesinging fica de fora de propósito: é bônus de ATIVAÇÃO (bônus action, dura 1
// minuto), não defesa passiva sempre ligada como os outros -- automatizar como "sempre
// ativo" mostraria CA errada na maior parte do tempo.
const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];

function abilityMods(abilities) {
  const mods = {};
  for (const key of ABILITIES) mods[key] = Math.floor(((abilities?.[key] ?? 10) - 10) / 2);
  return mods;
}

// `allowedArmor`: [] = só sem armadura nenhuma; ["light"] = sem armadura OU leve.
// `requiresNoShield`: true = ter escudo equipado desliga o traço inteiro (não só o +2).
const CLASS_AC_OVERRIDES = [
  { className: "Barbarian", level: 1, allowedArmor: [], requiresNoShield: false, value: (m) => 10 + m.dex + m.con },
  { className: "Monk", level: 1, allowedArmor: [], requiresNoShield: true, value: (m) => 10 + m.dex + m.wis },
  { className: "Pugilist", level: 1, allowedArmor: ["light"], requiresNoShield: true, value: (m) => 12 + m.con },
  { subclassName: "Draconic Bloodline", rules: "2014", level: 1, allowedArmor: [], requiresNoShield: false, value: (m) => 13 + m.dex },
  { subclassName: "Draconic Sorcery", rules: "2024", level: 3, allowedArmor: [], requiresNoShield: false, value: (m) => 10 + m.dex + m.cha },
  { subclassName: "College of Dance", rules: "2024", level: 3, allowedArmor: [], requiresNoShield: true, value: (m) => 10 + m.dex + m.cha },
];

// Raças com Armadura Natural -- todas tratadas como "piso" (comparadas contra a fórmula
// de armadura equipada, vence a maior), inclusive Tortle: se o jogador equipar algo
// mesmo assim, não travamos, só comparamos.
const RACE_AC_OVERRIDES = [
  { raceNamePrefix: "Tortle", value: () => 17 },
  { raceNamePrefix: "Lizardfolk", value: (m) => 13 + m.dex },
  { raceNamePrefix: "Locathah", value: (m) => 12 + m.dex },
  { raceNamePrefix: "Loxodon", value: (m) => 12 + m.con },
  { raceNamePrefix: "Bearfolk", value: (m) => 13 + m.dex },
  { raceNamePrefix: "Autognome", value: (m) => 13 + m.dex },
  { raceNamePrefix: "Thri-kreen", value: (m) => 13 + m.dex },
];

// Bônus fixo que soma por cima de qualquer base (armadura, override, ou padrão).
const RACE_AC_ADDONS = [{ raceNamePrefix: "Warforged", value: () => 1 }];

// Bônus fixos concedidos por uma escolha (classChoices) em vez de raça/classe/
// equipamento direto -- mesma tabela curada, só que lida contra `classChoices`
// (achatado por categoria, ver useClassChoices.js). `condition` recebe o
// resultado de `findEquipped` (armadura equipada de verdade, não o override
// racial) porque a regra real ("enquanto vestindo armadura") fala do item
// físico, não da CA final calculada.
const CLASS_CHOICE_AC_BONUSES = [
  // Estilo de Luta "Defense" -- +1 CA enquanto vestindo armadura (qualquer
  // peso). Nome idêntico nas duas edições (2014 optionalfeature / 2024 feat
  // subtype "fightingStyle"); "Defense Style" é o nome órfão que sobrou da
  // extração do 5etools em phb-2024-optionalfeatures.json (o slot 2024 de
  // verdade usa feats.json, mas cobrimos os dois por segurança).
  {
    category: "fightingStyle",
    names: ["Defense", "Defense Style"],
    condition: ({ armor }) => !!armor,
    value: () => 1,
  },
];

// Mesma ideia, mas pra `character.animalEnhancementChoices` (Simic Hybrid --
// mecanismo dedicado, não `classChoices`, ver animalEnhancement.js).
const ANIMAL_ENHANCEMENT_AC_BONUSES = [
  // Carapace -- +1 CA quando NÃO estiver de armadura pesada.
  {
    names: ["Carapace (GGR)"],
    condition: ({ armor }) => !armor || armor.armorType !== "heavy",
    value: () => 1,
  },
];

function matchesName(entryName, characterName) {
  if (!characterName) return false;
  if (entryName && characterName === entryName) return true;
  return false;
}
function matchesPrefix(prefix, characterName) {
  return !!characterName && characterName.startsWith(prefix);
}

function findRaceOverride(character) {
  return RACE_AC_OVERRIDES.find(
    (r) => matchesName(r.raceName, character.race) || (r.raceNamePrefix && matchesPrefix(r.raceNamePrefix, character.race))
  );
}
function findRaceAddon(character) {
  return RACE_AC_ADDONS.find((r) => r.raceNamePrefix && matchesPrefix(r.raceNamePrefix, character.race));
}

function findClassOverride(character) {
  for (const row of character.classes ?? []) {
    for (const rule of CLASS_AC_OVERRIDES) {
      if (rule.rules && rule.rules !== (rule.subclassName ? row.subclassRules : row.rules)) continue;
      if (rule.className && row.name === rule.className && row.level >= rule.level) return rule;
      if (rule.subclassName && row.subclass === rule.subclassName && row.level >= rule.level) return rule;
    }
  }
  return null;
}

function findEquipped(character, equipmentData) {
  const equippedNames = new Set(
    (character.equipment ?? []).filter((e) => e.equipped && e.name).map((e) => e.name.trim().toLowerCase())
  );
  let armor = null;
  let hasShield = false;
  for (const item of equipmentData ?? []) {
    // `foundryType==="equipment"` cobre TANTO armadura mundana quanto armadura/escudo
    // MÁGICO com CA própria (Armor of Invulnerability, Sentinel Shield etc.) -- o
    // achatamento do catálogo unificado (`flatten-equipment-entry.mjs`) já normaliza
    // os dois pro MESMO formato (`armorType`/`ac`/`dexCap`), então este loop não
    // precisa saber a diferença.
    if (item.foundryType !== "equipment" || !item.armorType) continue;
    if (!equippedNames.has((item.name ?? "").toLowerCase())) continue;
    if (item.armorType === "shield") hasShield = true;
    else armor = item;
  }
  return { armor, hasShield };
}

// Bônus de CA de item mágico "avulso" (soma em cima de QUALQUER armadura, ex: Anel de
// Proteção) -- achado na unificação do banco de equipamento (set/2026): item
// `foundryType:"magicItem"` com `armorBonus` numérico nunca era somado na CA, porque o
// catálogo antigo (110 itens, só arma/armadura de PHB) nunca tinha item mágico algum.
// Sintonia exigida (`requiresAttunement`) só conta se o jogador marcou "Sintonizado"
// no item (`character.equipment[].attuned`, mesmo campo que `StepEquipamento.jsx` já
// usa) -- item que exige sintonia mas não foi sintonizado não concede o bônus.
// LIMITAÇÃO ACEITA: alguns itens mais antigos (ex: "+1 Shield"/"+2 Shield", extraídos
// antes desta unificação pela feature Replicate Magic Item) guardam o bônus como
// Active Effect do Foundry (`mechanical.effects`), não como `armorBonus` plano --
// esses continuam funcionando DENTRO do Foundry, mas não são somados aqui (não dá pra
// interpretar `changes`/fórmula de Active Effect de forma genérica e segura fora do
// Foundry sem risco de inventar um número errado).
function magicAcBonus(character, equipmentData) {
  const equippedByName = new Map(
    (character.equipment ?? []).filter((e) => e.equipped && e.name).map((e) => [e.name.trim().toLowerCase(), e])
  );
  // O MESMO nome de item pode existir mais de 1 vez no catálogo (reimpressão 2014/2024,
  // ex: "Ring of Protection" em DMG e XDMG, ambos armorBonus:1) -- contar cada NOME
  // equipado só 1 vez evita dobrar o bônus quando as duas edições batem no mesmo
  // `character.equipment[].name`, igual `findEquipped` já faz pra armadura (última
  // correspondência substitui, nunca soma duas).
  const countedNames = new Set();
  let bonus = 0;
  for (const item of equipmentData ?? []) {
    if (item.foundryType !== "magicItem" || typeof item.armorBonus !== "number") continue;
    const key = (item.name ?? "").toLowerCase();
    const equipped = equippedByName.get(key);
    if (!equipped || countedNames.has(key)) continue;
    if (item.requiresAttunement && !equipped.attuned) continue;
    countedNames.add(key);
    bonus += item.armorBonus;
  }
  return bonus;
}

function armorFormula(armor, mods) {
  if (!armor) return null;
  const capped = armor.dexCap == null ? mods.dex : Math.min(mods.dex, armor.dexCap);
  return armor.ac + capped;
}

export function computeArmorClass(character, { equipmentData }) {
  const mods = abilityMods(character.abilities);
  const { armor, hasShield } = findEquipped(character, equipmentData);
  const classOverride = findClassOverride(character);
  const raceOverride = findRaceOverride(character);
  const raceAddon = findRaceAddon(character);
  // Escudo sempre soma +2 quando equipado -- a única coisa que `requiresNoShield`
  // afeta é se a fórmula do traço de classe entra como candidata, não o bônus do
  // escudo em si (que continua valendo em cima de base/armadura/raça).
  const classBlockedByShield = !!classOverride?.requiresNoShield && hasShield;

  let base;
  if (armor) {
    base = armorFormula(armor, mods);
    if (raceOverride) base = Math.max(base, raceOverride.value(mods));
    if (classOverride && !classBlockedByShield && classOverride.allowedArmor.includes(armor.armorType)) {
      base = Math.max(base, classOverride.value(mods));
    }
  } else {
    const candidates = [10 + mods.dex];
    if (classOverride && !classBlockedByShield) candidates.push(classOverride.value(mods));
    if (raceOverride) candidates.push(raceOverride.value(mods));
    base = Math.max(...candidates);
  }

  if (hasShield) base += 2;
  if (raceAddon) base += raceAddon.value(mods);

  const equipped = { armor, hasShield };
  const chosenNames = new Set((character.classChoices ?? []).map((c) => c.name));
  for (const bonus of CLASS_CHOICE_AC_BONUSES) {
    if (!bonus.names.some((n) => chosenNames.has(n))) continue;
    if (!bonus.condition(equipped)) continue;
    base += bonus.value(mods);
  }

  const enhancementNames = new Set((character.animalEnhancementChoices ?? []).map((c) => c.name));
  for (const bonus of ANIMAL_ENHANCEMENT_AC_BONUSES) {
    if (!bonus.names.some((n) => enhancementNames.has(n))) continue;
    if (!bonus.condition(equipped)) continue;
    base += bonus.value(mods);
  }

  base += magicAcBonus(character, equipmentData);

  return base;
}
