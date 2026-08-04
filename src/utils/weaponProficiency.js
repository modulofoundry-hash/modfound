// Escolha ABERTA de proficiência com arma (Weapon Master PHB 2014, Hobgoblin VGM
// "Martial Training") — diferente de Weapon Mastery (weaponMastery.js, 2024): aqui a
// escolha dá PROFICIÊNCIA em si, não desbloqueia mastery de uma arma já proficiente.
// Item 1 do plano de ago/2026 -- ver [[project_small_gaps_batch_2026_08]].

// Porta de WEAPON_TABLE_2014 (module/scripts/content/dnd5eCodes.js) -- o site não
// importa código do módulo (apps separados), mesma duplicação já aceita no projeto
// (ver SRD_SPELL_ALIAS em expandedSpellPool.js). Só cobre 2014 porque as duas fontes
// conhecidas hoje (Weapon Master, Hobgoblin) são 2014 -- se um dia aparecer uma fonte
// 2024 equivalente, adiciona WEAPON_TABLE_2024 do mesmo jeito.
const WEAPON_TABLE_2014 = {
  battleaxe: { category: "mar", label: "Battleaxe" },
  blowgun: { category: "mar", label: "Blowgun" },
  club: { category: "sim", label: "Club" },
  dagger: { category: "sim", label: "Dagger" },
  dart: { category: "sim", label: "Dart" },
  flail: { category: "mar", label: "Flail" },
  glaive: { category: "mar", label: "Glaive" },
  greataxe: { category: "mar", label: "Greataxe" },
  greatclub: { category: "sim", label: "Greatclub" },
  greatsword: { category: "mar", label: "Greatsword" },
  halberd: { category: "mar", label: "Halberd" },
  handaxe: { category: "sim", label: "Handaxe" },
  handcrossbow: { category: "mar", label: "Hand Crossbow" },
  heavycrossbow: { category: "mar", label: "Heavy Crossbow" },
  javelin: { category: "sim", label: "Javelin" },
  lance: { category: "mar", label: "Lance" },
  lightcrossbow: { category: "sim", label: "Light Crossbow" },
  lighthammer: { category: "sim", label: "Light Hammer" },
  longbow: { category: "mar", label: "Longbow" },
  longsword: { category: "mar", label: "Longsword" },
  mace: { category: "sim", label: "Mace" },
  maul: { category: "mar", label: "Maul" },
  morningstar: { category: "mar", label: "Morningstar" },
  net: { category: "mar", label: "Net" },
  pike: { category: "mar", label: "Pike" },
  quarterstaff: { category: "sim", label: "Quarterstaff" },
  rapier: { category: "mar", label: "Rapier" },
  scimitar: { category: "mar", label: "Scimitar" },
  shortbow: { category: "sim", label: "Shortbow" },
  shortsword: { category: "mar", label: "Shortsword" },
  sickle: { category: "sim", label: "Sickle" },
  sling: { category: "sim", label: "Sling" },
  spear: { category: "sim", label: "Spear" },
  trident: { category: "mar", label: "Trident" },
  warhammer: { category: "mar", label: "Warhammer" },
  warpick: { category: "mar", label: "War Pick" },
  whip: { category: "mar", label: "Whip" },
};

// Mesma regex de resolveFeatWeaponChoiceCategory (dnd5eCodes.js) -- sintaxe do 5etools,
// "type=simple weapon;martial weapon" (várias categorias na MESMA cláusula, separadas
// por ";"), termina em "|" ou fim da string. Devolve as chaves de arma de TODAS as
// categorias citadas.
const WEAPON_FILTER_CLAUSE_RE = /type=([^|]+)/i;
export function resolveWeaponChoicePool(fromFilter) {
  const clause = WEAPON_FILTER_CLAUSE_RE.exec(fromFilter ?? "")?.[1] ?? "";
  const categories = new Set();
  for (const part of clause.split(";")) {
    const word = part.trim().match(/^(simple|martial) weapon\b/i)?.[1];
    if (word) categories.add(word.toLowerCase() === "simple" ? "sim" : "mar");
  }
  return Object.entries(WEAPON_TABLE_2014)
    .filter(([, entry]) => categories.has(entry.category))
    .map(([key, entry]) => ({ key, name: entry.label }));
}

// Slots de escolha -- mesmo padrão de weaponMasterySlots (weaponMastery.js): 1 card por
// fonte (raça OU talento), cada um com `count` picks independentes. Genérico por design
// (não hardcoded pros 2 nomes conhecidos hoje) -- qualquer raça/talento futuro com
// `weaponChoice` no banco entra automaticamente, sem código novo.
export function weaponProficiencySlots(character, raceData = [], featsData = []) {
  const slots = [];
  const race = raceData.find((r) => r.name === character.race && r.rules === character.raceRules);
  if (race?.weaponChoice) {
    slots.push({ sourceKey: "race", sourceName: race.name, count: race.weaponChoice.count, pool: resolveWeaponChoicePool(race.weaponChoice.fromFilter) });
  }
  for (const featName of character.feats ?? []) {
    const feat = featsData.find((f) => f.name === featName && f.weaponChoice);
    if (!feat) continue;
    slots.push({ sourceKey: `feat:${feat.name}`, sourceName: feat.name, count: feat.weaponChoice.count, pool: resolveWeaponChoicePool(feat.weaponChoice.fromFilter) });
  }
  return slots;
}
