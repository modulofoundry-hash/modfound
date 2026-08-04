// Weapon Mastery (2024, XPHB p.213-214) — tabela arma -> categoria/alcance/propriedade
// de maestria. Porta reduzida de WEAPON_TABLE_2024 + WEAPON_MASTERY_2024
// (module/scripts/content/dnd5eCodes.js) — o site é um app React separado, não importa
// código do módulo, só reaproveita os MESMOS dados (extraídos do mirror do 5etools). Só
// existe na edição 2024 — não faz sentido pra personagem 2014.
export const WEAPON_MASTERY_TABLE = {
  club: { category: "sim", melee: true, label: "Club", mastery: "Slow" },
  dagger: { category: "sim", melee: true, label: "Dagger", mastery: "Nick" },
  greatclub: { category: "sim", melee: true, label: "Greatclub", mastery: "Push" },
  handaxe: { category: "sim", melee: true, label: "Handaxe", mastery: "Vex" },
  javelin: { category: "sim", melee: true, label: "Javelin", mastery: "Slow" },
  lighthammer: { category: "sim", melee: true, label: "Light Hammer", mastery: "Nick" },
  mace: { category: "sim", melee: true, label: "Mace", mastery: "Sap" },
  quarterstaff: { category: "sim", melee: true, label: "Quarterstaff", mastery: "Topple" },
  sickle: { category: "sim", melee: true, label: "Sickle", mastery: "Nick" },
  spear: { category: "sim", melee: true, label: "Spear", mastery: "Sap" },
  dart: { category: "sim", melee: false, label: "Dart", mastery: "Vex" },
  lightcrossbow: { category: "sim", melee: false, label: "Light Crossbow", mastery: "Slow" },
  shortbow: { category: "sim", melee: false, label: "Shortbow", mastery: "Vex" },
  sling: { category: "sim", melee: false, label: "Sling", mastery: "Slow" },
  battleaxe: { category: "mar", melee: true, label: "Battleaxe", mastery: "Topple" },
  flail: { category: "mar", melee: true, label: "Flail", mastery: "Sap" },
  glaive: { category: "mar", melee: true, label: "Glaive", mastery: "Graze" },
  greataxe: { category: "mar", melee: true, label: "Greataxe", mastery: "Cleave" },
  greatsword: { category: "mar", melee: true, label: "Greatsword", mastery: "Graze" },
  halberd: { category: "mar", melee: true, label: "Halberd", mastery: "Cleave" },
  lance: { category: "mar", melee: true, label: "Lance", mastery: "Topple" },
  longsword: { category: "mar", melee: true, label: "Longsword", mastery: "Sap" },
  maul: { category: "mar", melee: true, label: "Maul", mastery: "Topple" },
  morningstar: { category: "mar", melee: true, label: "Morningstar", mastery: "Sap" },
  pike: { category: "mar", melee: true, label: "Pike", mastery: "Push" },
  rapier: { category: "mar", melee: true, label: "Rapier", mastery: "Vex" },
  scimitar: { category: "mar", melee: true, label: "Scimitar", mastery: "Nick" },
  shortsword: { category: "mar", melee: true, label: "Shortsword", mastery: "Vex" },
  trident: { category: "mar", melee: true, label: "Trident", mastery: "Topple" },
  warhammer: { category: "mar", melee: true, label: "Warhammer", mastery: "Push" },
  warpick: { category: "mar", melee: true, label: "War Pick", mastery: "Sap" },
  whip: { category: "mar", melee: true, label: "Whip", mastery: "Slow" },
  blowgun: { category: "mar", melee: false, label: "Blowgun", mastery: "Vex" },
  handcrossbow: { category: "mar", melee: false, label: "Hand Crossbow", mastery: "Vex" },
  heavycrossbow: { category: "mar", melee: false, label: "Heavy Crossbow", mastery: "Push" },
  longbow: { category: "mar", melee: false, label: "Longbow", mastery: "Slow" },
  musket: { category: "mar", melee: false, label: "Musket", mastery: "Slow" },
  pistol: { category: "mar", melee: false, label: "Pistol", mastery: "Vex" },
};

// Resolve uma palavra do campo `weapons` de classe/raça (categoria "simple"/"martial"
// inteira, ou nome específico tipo "hand crossbow") em chaves de WEAPON_MASTERY_TABLE.
// Frase de filtro tipo "Martial weapons that have the Light property" (Monk 2024) não
// bate em nada aqui e devolve [] de propósito -- nenhuma classe que usa esse formato
// concede Weapon Mastery, então não precisa resolver o filtro de propriedade no site.
function resolveWeaponWord(word) {
  const w = word?.toLowerCase().trim();
  if (!w) return [];
  if (w === "simple") return Object.keys(WEAPON_MASTERY_TABLE).filter((k) => WEAPON_MASTERY_TABLE[k].category === "sim");
  if (w === "martial") return Object.keys(WEAPON_MASTERY_TABLE).filter((k) => WEAPON_MASTERY_TABLE[k].category === "mar");
  const key = w.replace(/\s+/g, "");
  return WEAPON_MASTERY_TABLE[key] ? [key] : [];
}

// Concessões FIXAS de arma (categoria inteira ou nome específico) de classe + raça do
// personagem -- pool de onde a escolha de Weapon Mastery pode vir. NÃO inclui escolhas
// ABERTAS de arma (Weapon Master 2014, Hobgoblin) porque o site não captura qual arma foi
// escolhida nelas hoje (decisão documentada, ver `phb-2014-feats.json`/
// `volos-guide-to-monsters-races-3.json`), nem concessões fixas de antecedente/talento
// (raras -- ex: Gunner/TCE -- e não propagadas pro JSON do site hoje). Na prática isso só
// afeta quem NÃO tem proficiência de categoria inteira já: as 5 classes que concedem
// Weapon Mastery (Fighter/Barbarian/Paladin/Ranger/Rogue) sempre concedem "simple"+
// "martial" completo no 2024, então o pool delas nunca é afetado por essa limitação.
export function resolveFixedWeaponProficiency(character, classMatches, raceData) {
  const keys = new Set();
  (character.classes ?? []).forEach((row, i) => {
    for (const w of classMatches?.[i]?.classData?.weapons ?? []) {
      for (const key of resolveWeaponWord(w)) keys.add(key);
    }
  });
  const race = raceData?.find((r) => r.name === character.race && r.rules === character.raceRules);
  for (const w of race?.weapons ?? []) {
    for (const key of resolveWeaponWord(w)) keys.add(key);
  }
  return keys;
}

// Slots de escolha de Weapon Mastery -- mesmo padrão de classChoiceSlots
// (CharacterCreationWizard.jsx): 1 "card" por classe/talento, cada um com `count` picks
// independentes. Progressão de classe já vem pronta em `classData.weaponMastery`
// (ScaleValue "weapon-mastery" extraído, gateada pelo nível DA CLASSE); talento Weapon
// Master é fixo (`feat.weaponMasteryChoice`), gateado pelo nível TOTAL do personagem (é
// talento, não classe -- mesmo padrão já usado em `categoryCountsForFeats`).
export function weaponMasterySlots(character, classMatches, featsData = []) {
  const slots = [];
  character.classes.forEach((row, classIndex) => {
    const wm = classMatches[classIndex]?.classData?.weaponMastery;
    if (!wm) return;
    const level = Number(row.level) || 1;
    const reached = Object.keys(wm.progression)
      .map(Number)
      .filter((lvl) => lvl <= level);
    if (!reached.length) return;
    const count = wm.progression[Math.max(...reached)];
    if (!count) return;
    slots.push({ sourceKey: `class:${classIndex}`, classIndex, className: row.name, count, melee: !!wm.melee });
  });

  const totalLevel = (character.classes ?? []).filter((c) => c.name).reduce((sum, c) => sum + (Number(c.level) || 0), 0);
  for (const featName of character.feats ?? []) {
    const feat = featsData.find((f) => f.name === featName && f.weaponMasteryChoice);
    if (!feat) continue;
    if (totalLevel < (feat.weaponMasteryChoice.level ?? 1)) continue;
    slots.push({ sourceKey: "feat", classIndex: "feat", className: feat.name, count: feat.weaponMasteryChoice.count, melee: false });
  }

  // Escolhas trazidas de volta via "Enviar pro site" (reverseCharacter.js, Item 2 do
  // plano de ago/2026) chegam com `sourceKey:"reversed"` -- o Foundry só guarda o
  // resultado achatado, sem saber de qual classe/talento cada arma veio, então não dá
  // pra encaixar nos slots normais acima. Sem este card extra, essas escolhas ficariam
  // gravadas em `character.weaponMasteryChoices` mas invisíveis no wizard (nenhum slot
  // real bate com `sourceKey:"reversed"`) -- o jogador não conseguiria nem ver nem editar.
  const reversedCount = (character.weaponMasteryChoices ?? []).filter((c) => c.sourceKey === "reversed").length;
  if (reversedCount) {
    slots.push({ sourceKey: "reversed", classIndex: "reversed", className: "Maestria importada do Foundry", count: reversedCount, melee: false });
  }
  return slots;
}
