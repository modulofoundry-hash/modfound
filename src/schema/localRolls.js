import { rollFormula } from "../utils/rollDice";

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
export function resolveUnarmedStrikeDie(characterClasses, classMatches) {
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
// duas-mãos nem riders de feat/estilo (pendência). Força por padrão; Destreza
// se a arma for "fin" (acuidade) e Destreza render mod maior.
export function resolveWeaponAttack(character, totalLevel, originalClassMatch, equipmentEntry, mode = ADV_MODE.NORMAL) {
  const prof = 2 + Math.floor(Math.max(totalLevel - 1, 0) / 4);
  const str = abilityMod(character.abilities?.str ?? 10);
  const dex = abilityMod(character.abilities?.dex ?? 10);
  const isFinesse = (equipmentEntry?.properties ?? []).includes("fin");
  const isRanged = parseWeaponType(equipmentEntry?.weaponType)?.ranged;
  const abilityScoreMod = isRanged ? dex : isFinesse ? Math.max(str, dex) : str;
  const proficient = isProficientWithWeapon(character, originalClassMatch, equipmentEntry);
  const attackMod = abilityScoreMod + (proficient ? prof : 0);
  const damage = equipmentEntry?.damage;
  return rollAttack({
    attackMod,
    damageDice: damage ? `${damage.number}d${damage.denomination}` : "1d1",
    damageMod: abilityScoreMod,
    damageType: damage?.type ?? null,
    mode,
  });
}
