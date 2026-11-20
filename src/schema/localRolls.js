import { rollFormula } from "../utils/rollDice";
import { featName, featRules } from "./character";

// Rolagem de ataque/dano 100% local (sem Foundry) pro chat GERAL do site --
// pedido do usuário (nov/2026): o chat geral precisa ter rolagem própria,
// nunca depender de um GM conectado (diferente do chat individual da ficha,
// que continua só respondendo quando o Foundry estiver aberto).
//
// Escopo combinado com o usuário na mesma conversa, resto fica pendência
// (ver memória `pending_local_roll_class_feat_coverage`):
// - SEM múltiplos ataques (Extra Attack) nem vantagem automática (Reckless
//   Attack etc.) -- 1 clique = 1 ataque, sem vantagem.
// - Ataque Desarmado mecanizado pra Monge/Pugilista (dado escala por nível,
//   ver `unarmedStrikeDie` extraído em generate-site-content.mjs) -- outras
//   classes/feats (Tavern Brawler, Grappler, estilos de luta...) continuam
//   na conta crua (1 + mod de Força) por enquanto.
// - Ataque Furtivo (Ladino) virou ação própria na seção Ações, escalando com
//   o nível (1d6 a cada 2 níveis), sem exigir vantagem/aliado adjacente (são
//   as condições de verdade da regra, fora de escopo por pedido do usuário).

function abilityMod(score) {
  return Math.floor((score - 10) / 2);
}

function fmtSigned(n) {
  if (!n) return "";
  return n > 0 ? `+${n}` : `${n}`;
}

// Toggle persistente na ficha (caixa vermelha) -- pedido do usuário (nov/2026):
// fica ligado enquanto o jogador não trocar de volta pra "normal", não é
// "gasto" depois de 1 rolagem.
export const ADV_MODE = { NORMAL: "normal", ADVANTAGE: "advantage", DISADVANTAGE: "disadvantage" };

// d20 NATURAL com vantagem/desvantagem -- mesma mecânica do Foundry
// (`D20Roll.applyAdvantage`): rola 2d20, fica com o maior (vantagem) ou
// menor (desvantagem); normal continua 1 dado só.
function rollNaturalD20(mode) {
  if (mode === ADV_MODE.ADVANTAGE || mode === ADV_MODE.DISADVANTAGE) {
    const a = rollFormula("1d20").rolls[0];
    const b = rollFormula("1d20").rolls[0];
    return { natural: mode === ADV_MODE.ADVANTAGE ? Math.max(a, b) : Math.min(a, b), rolls: [a, b] };
  }
  return { natural: rollFormula("1d20").rolls[0] };
}

// 1d20+mod -- usado por atributo/perícia/resistência/testes de morte, todos
// a mesma forma. `rolls[0]` continua sendo o d20 NATURAL já escolhido
// (crítico/falha sempre olham esse, nunca o total com mod) -- quem chama
// (toChatD20Result em FoundrySheetView.jsx) depende disso.
export function rollD20(mod, mode = ADV_MODE.NORMAL) {
  const { natural } = rollNaturalD20(mode);
  const formula =
    mode === ADV_MODE.NORMAL
      ? `1d20${fmtSigned(mod)}`
      : `2d20${mode === ADV_MODE.ADVANTAGE ? "kh1" : "kl1"}${fmtSigned(mod)}`;
  return { mod, formula, total: natural + mod, rolls: [natural] };
}

// Acerto (1d20+mod, com vantagem/desvantagem se pedido) + dano (dado+mod,
// NUNCA tem vantagem/desvantagem -- só o ataque) separados -- o chat mostra
// os dois. `damageDice` já pronto tipo "1d8"/"2d6"; dano SEM dado nenhum
// (ataque desarmado de personagem sem Monge/Pugilista) usa o truque
// "1d1+mod" -- 1d1 sempre rola 1, funcionalmente igual a um "1" fixo, sem
// precisar estender `rollFormula` pra aceitar fórmula sem dado nenhum.
export function rollAttack({ attackMod, damageDice, damageMod, damageType, mode = ADV_MODE.NORMAL }) {
  return {
    attack: rollD20(attackMod, mode),
    damage: { ...rollFormula(`${damageDice}${fmtSigned(damageMod)}`), type: damageType },
  };
}

// Teste de Resistência contra a Morte -- d20 fixo vs CD 10, SEM modificador
// nenhum (regra oficial; confirmado lendo `rollDeathSave()` no próprio
// dnd5e.mjs do Foundry -- só soma algo com Diamond Soul do Monge, fora de
// escopo). Reaproveita o mesmo seletor de Vantagem/Desvantagem da ficha.
// `total === natural` sempre (mod fixo 0) -- quem chama compara com 10.
export function rollDeathSaveD20(mode = ADV_MODE.NORMAL) {
  return rollD20(0, mode);
}

// Procura, entre as classes do personagem (na ordem gravada), a primeira com
// `classData.unarmedStrikeDie` (hoje só Monge e Pugilista têm isso extraído)
// e devolve o dado certo pro NÍVEL atual naquela classe -- `progression` tem
// só os níveis de quebra (1/5/11/17), pega o maior que já foi alcançado.
function resolveClassUnarmedStrikeDie(characterClasses, classMatches) {
  for (let i = 0; i < (characterClasses ?? []).length; i++) {
    const classData = classMatches?.[i]?.classData;
    const die = classData?.unarmedStrikeDie;
    if (!die) continue;
    const classLevel = characterClasses[i].level ?? 1;
    const breakpoint = Object.keys(die.progression)
      .map(Number)
      .filter((lvl) => lvl <= classLevel)
      .sort((a, b) => b - a)[0];
    if (breakpoint == null) continue;
    const { number, faces } = die.progression[String(breakpoint)];
    return { number, faces, className: classData.name, classLevel };
  }
  return null;
}

function dieAverage({ number, faces }) {
  return (number * (faces + 1)) / 2;
}

// Tavern Brawler (2014 "seu ataque desarmado usa 1d4"; 2024 "Enhanced Unarmed
// Strike", mesmo 1d4+FOR trocando o dano normal) -- caso-exemplo literal que o
// usuário deu no início desta auditoria pra explicar a regra de mecanização
// ("adição de dano flat ou dados deve ser mecanizado"). Igual nas duas
// edições pro que importa aqui (substituir o dado-base do Desarmado por 1d4),
// então não precisa de `rules` pra desambiguar. Fica de fora de propósito: o
// reroll de 1 (2024 "Damage Rerolls") -- mesma exclusão de Savage Attacker/
// Lucky (reroll não é "adição"); empurrão e proficiência com arma
// improvisada não são dado/dano.
const TAVERN_BRAWLER_DIE = { number: 1, faces: 4, className: "Tavern Brawler", classLevel: null };

// Combina o dado de CLASSE (Monge/Pugilista) com o de Tavern Brawler, se o
// personagem tiver os dois -- usa o de MAIOR média (ex: Pugilist nível 1 tem
// 1d8, sempre melhor que o 1d4 do talento; um não-conjurador marcial comum
// com só Tavern Brawler usa o 1d4). Decisão de julgamento própria (a regra
// oficial não cobre "e se tiver os dois" explicitamente) -- documentado como
// tal, não uma leitura literal do livro.
export function resolveUnarmedStrikeDie(characterClasses, classMatches, feats) {
  const classDie = resolveClassUnarmedStrikeDie(characterClasses, classMatches);
  const hasTavernBrawler = (feats ?? []).some((f) => featName(f) === "Tavern Brawler");
  if (!hasTavernBrawler) return classDie;
  if (!classDie || dieAverage(TAVERN_BRAWLER_DIE) > dieAverage(classDie)) return TAVERN_BRAWLER_DIE;
  return classDie;
}

// Monge 2024 (Dexterous Attacks) usa o melhor entre Força e Destreza pro
// Ataque Desarmado; Pugilista e a conta crua (sem classe nenhuma) usam só
// Força. Único "escolha de habilidade" que entrou nesta rodada -- os outros
// riders do Pugilista (Moxie, Haymaker etc.) ficam pendência.
export function unarmedStrikeAbilityMod(character, matchedClassName) {
  const str = abilityMod(character.abilities?.str ?? 10);
  if (matchedClassName === "Monk") {
    const dex = abilityMod(character.abilities?.dex ?? 10);
    return Math.max(str, dex);
  }
  return str;
}

// Ladino -- 1d6 a cada 2 níveis (regra oficial), devolve null se não tiver
// nível nenhum de Ladino.
export function resolveSneakAttackDice(characterClasses, classMatches) {
  for (let i = 0; i < (characterClasses ?? []).length; i++) {
    if (classMatches?.[i]?.classData?.name !== "Rogue") continue;
    const classLevel = characterClasses[i].level ?? 1;
    return { number: Math.ceil(classLevel / 2), faces: 6, classLevel };
  }
  return null;
}

const WEAPON_CATEGORY_BY_TYPE = { s: "simple", m: "martial" };

// "martialM"/"simpleR" (equipment.json) -> {category:"martial"|"simple", ranged:bool}.
function parseWeaponType(weaponType) {
  if (!weaponType) return null;
  return {
    category: WEAPON_CATEGORY_BY_TYPE[weaponType[0]] ?? null,
    ranged: weaponType[weaponType.length - 1] === "R",
  };
}

// Exportado -- quem decide se um ataque com arma é corpo-a-corpo (pra saber
// se `resolveRaceMeleeBonusDamage` abaixo se aplica) precisa do mesmo
// cálculo que `resolveWeaponAttack` já faz por dentro.
export function isRangedWeapon(equipmentEntry) {
  return !!parseWeaponType(equipmentEntry?.weaponType)?.ranged;
}

export function isHeavyWeapon(equipmentEntry) {
  return !!equipmentEntry?.properties?.includes("hvy");
}

// Ataque Poderoso (-5 no ataque / +10 no dano), opcional por ataque --
// Great Weapon Master (arma corpo-a-corpo PESADA) ou Sharpshooter (arma à
// DISTÂNCIA), só a versão 2014 dos dois (auditoria de talentos, nov/2026:
// confirmado contra o RAW real que GWM 2024 virou "Heavy Weapon Mastery"
// -- dano extra = bônus de proficiência, SEMPRE, sem penalidade nenhuma --
// e Sharpshooter 2024 perdeu o bônus de dano por completo, mecânica
// totalmente diferente das de 2014). Precisa de `character.feats` guardando
// `{name, rules}` (ver schema/character.js) pra saber QUAL edição o
// personagem tem -- sem isso, não dava pra saber se a regra -5/+10 de fato
// se aplica.
export function canPowerAttack(character, equipmentEntry) {
  const has2014Feat = (name) =>
    (character.feats ?? []).some((f) => featName(f) === name && featRules(f) === "2014");
  if (isRangedWeapon(equipmentEntry)) return has2014Feat("Sharpshooter");
  return isHeavyWeapon(equipmentEntry) && has2014Feat("Great Weapon Master");
}

// Dano extra em QUALQUER ataque corpo-a-corpo bem sucedido, vindo de um
// traço de raça (ex: Erina/Spiritfarer "Quills", estruturado em
// `meleeDamageOnHit` -- ver generate-site-content.mjs). Não é escolha do
// jogador nem recurso limitado -- dispara sempre que o ataque É corpo-a-corpo
// (o site não simula distância/posição em cena, então assume "dentro de
// alcance" sempre que a rolagem não é de arma à distância). `isRanged` vem
// `false` pro Ataque Desarmado (sempre corpo-a-corpo) e de `isRangedWeapon`
// pra arma equipada.
export function resolveRaceMeleeBonusDamage(raceMatch, isRanged) {
  const rider = raceMatch?.meleeDamageOnHit;
  if (!rider || isRanged) return null;
  return { ...rollFormula(rider.dice), type: rider.type, label: rider.label };
}

// Proficiente se a CATEGORIA (simples/marcial) estiver entre as proficiências
// de arma da classe original (mesma fonte que a caixa "Armas" da aba
// Detalhes já usa), OU se a arma específica estiver em
// `character.weaponProficiencies` (concedida por raça/talento).
export function isProficientWithWeapon(character, originalClassMatch, equipmentEntry) {
  const parsed = parseWeaponType(equipmentEntry?.weaponType);
  const categoryProficient = !!parsed && (originalClassMatch?.weapons ?? []).includes(parsed.category);
  const namedProficient = (character.weaponProficiencies ?? []).includes(equipmentEntry?.baseItem);
  return categoryProficient || namedProficient;
}

// Acerto+dano de uma arma equipada -- SEM maestria 2024, crítico, versátil/
// duas-mãos nem riders de feat/estilo (pendência, exceto o toggle -5/+10
// abaixo). Força por padrão; Destreza se a arma for "fin" (acuidade) e
// Destreza render mod maior. `powerAttack` (nov/2026) -- Ataque Poderoso de
// GWM/Sharpshooter 2014, já validado por `canPowerAttack` pelo chamador
// (não reconfere aqui o tipo de arma/talento, confia no toggle já filtrado
// na UI) -- dobra direto em `attackMod`/`damageMod`, mesma fórmula final
// que o Foundry mostraria (ex: "2d6+13" em vez de "2d6+3").
export function resolveWeaponAttack(character, totalLevel, originalClassMatch, equipmentEntry, mode = ADV_MODE.NORMAL, powerAttack = false) {
  const prof = 2 + Math.floor(Math.max(totalLevel - 1, 0) / 4);
  const str = abilityMod(character.abilities?.str ?? 10);
  const dex = abilityMod(character.abilities?.dex ?? 10);
  const isFinesse = (equipmentEntry?.properties ?? []).includes("fin");
  const isRanged = parseWeaponType(equipmentEntry?.weaponType)?.ranged;
  const abilityScoreMod = isRanged ? dex : isFinesse ? Math.max(str, dex) : str;
  const proficient = isProficientWithWeapon(character, originalClassMatch, equipmentEntry);
  const attackMod = abilityScoreMod + (proficient ? prof : 0) - (powerAttack ? 5 : 0);
  const damageMod = abilityScoreMod + (powerAttack ? 10 : 0);
  const damage = equipmentEntry?.damage;
  return rollAttack({
    attackMod,
    damageDice: damage ? `${damage.number}d${damage.denomination}` : "1d1",
    damageMod,
    damageType: damage?.type ?? null,
    mode,
  });
}
