// Quantos cantrips/magias conhecidas ("conjurador conhecido": Bardo/Feiticeiro/
// Bruxo/Patrulheiro 2014) ou espaços de preparo ("conjurador preparado": todo
// mundo em 2024 + Clérigo/Druida/Mago/Paladino em 2014) o personagem já tem
// direito no nível atual -- soma de TODAS as classes conjuradoras (sem tentar
// dividir por classe na lista achatada de `character.spells`, mesma
// simplificação que `feats`/`classChoices` já usam). Reaproveitado pelo wizard
// de Criação (etapa Magias) e pelo de Level-Up.
//
// `classData.spellProgression` (banco de conteúdo) só existe quando o Foundry
// já modela a classe com tabela fixa (`cantripsKnown`/`spellsKnown`/
// `maxPrepared`, ver shared/schema/content-database.md). Quando falta
// (conjurador "preparado" 2014 sem tabela: Clérigo/Druida/Mago/Paladino/
// Patrulheiro 2014, Artificiante) o preparo é calculado na hora — mod de
// habilidade + nível cheio/metade, regra real do livro, sem precisar de dado
// novo no banco.
function abilityMod(score) {
  return Math.floor(((score ?? 10) - 10) / 2);
}

function valueAtLevel(table, level) {
  if (!table) return 0;
  const reached = Object.keys(table)
    .map(Number)
    .filter((lvl) => lvl <= level);
  if (!reached.length) return 0;
  return table[Math.max(...reached)] ?? 0;
}

const PROGRESSION_FACTOR = { full: 1, half: 0.5, third: 1 / 3, artificer: 0.5 };

// Divisor real usado pelo próprio motor do Foundry (`DND5E.spellcasting.spell.progression`,
// dnd5e.mjs) pra converter nível de classe em "nível efetivo de conjurador cheio" --
// DIFERENTE de PROGRESSION_FACTOR acima (que é só pra fórmula de PREPARO, não pra nível
// máximo de magia). `third` (Eldritch Knight/Arcane Trickster) e `pact` (Bruxo) não tinham
// nenhum uso antes disso -- achado implementando o teto de nível de magia a pedido do
// usuário (antes, o buscador deixava escolher magia de QUALQUER nível da lista da classe,
// sem checar se o personagem já tinha espaço pra ela).
const PROGRESSION_DIVISOR = { full: 1, half: 2, third: 3, artificer: 2 };

// Comprimento de cada linha de `DND5E.SPELL_SLOT_TABLE` (dnd5e.mjs, conferido ao vivo no
// compêndio instalado) -- só o COMPRIMENTO importa aqui (maior círculo com espaço), não a
// quantidade de espaços em si (este site não rastreia espaço, só nome+preparada). Índice 0
// = nível de personagem 1 (conjurador cheio). Conferido contra Artífice (metade/artificer,
// nível5→2º círculo), Paladino (metade, nível5→2º círculo) e Eldritch Knight (terço,
// nível7→2º círculo) -- bate certinho nos 3 usando `Math.ceil(nível/divisor)` como índice.
const FULL_CASTER_MAX_SPELL_LEVEL = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 9, 9];

// Pact Magic (Bruxo) NÃO usa a tabela acima -- piscina própria e independente (regra real:
// nunca se combina com a piscina principal de outra classe conjuradora), capada no 5º
// círculo pra sempre (`DND5E.pactCastingProgression`, dnd5e.mjs).
const PACT_MAX_SPELL_LEVEL = { 1: 1, 3: 2, 5: 3, 7: 4, 9: 5 };

export function spellProgressionForCharacter(character, classMatches) {
  let cantripsKnown = 0;
  let spellsKnown = 0;
  let hasKnownCap = false;
  let maxPrepared = 0;
  let hasPreparedCap = false;
  // Nível efetivo COMBINADO (regra real de multiclasse: cada classe conjuradora soma
  // nível/divisor arredondado pra cima, e um ÚNICO valor combinado indexa a tabela de
  // espaços -- não um lookup por classe separado, senão um personagem Mago3/Paladino4
  // pareceria ter só o nível de magia da classe mais alta, não o combinado de verdade).
  // Sempre arredonda pra CIMA (`Math.ceil`) mesmo em multiclasse -- a regra real varia
  // por edição aqui (2014 arredonda pra baixo em multiclasse, 2024 pra cima), e o motor
  // do Foundry só força "sempre pra cima" quando é uma ÚNICA classe conjuradora; usar
  // sempre pra cima é uma simplificação aceita (super-estima um pouco multiclasse 2014,
  // nunca BLOQUEIA uma escolha válida por engano -- mesmo espírito de outras
  // simplificações já aceitas neste arquivo, ver comentário do topo).
  let combinedEffectiveLevel = 0;
  let pactSpellLevel = 0;

  function accumulate(spellcasting, prog, level) {
    if (!spellcasting) return;
    cantripsKnown += valueAtLevel(prog.cantripsKnown, level);

    if (prog.spellsKnown) {
      spellsKnown += valueAtLevel(prog.spellsKnown, level);
      hasKnownCap = true;
    } else if (prog.maxPrepared) {
      maxPrepared += valueAtLevel(prog.maxPrepared, level);
      hasPreparedCap = true;
    } else {
      // Conjurador "preparado" sem tabela fixa (2014 Clérigo/Druida/Mago/
      // Paladino/Patrulheiro, Artificiante nas duas edições) — fórmula real:
      // mod de habilidade + nível cheio/metade (mínimo 1).
      const factor = PROGRESSION_FACTOR[spellcasting.progression] ?? 1;
      const mod = abilityMod(character.abilities?.[spellcasting.ability]);
      maxPrepared += Math.max(1, Math.floor(level * factor) + mod);
      hasPreparedCap = true;
    }

    if (spellcasting.progression === "pact") {
      pactSpellLevel = Math.max(pactSpellLevel, valueAtLevel(PACT_MAX_SPELL_LEVEL, level));
    } else {
      const divisor = PROGRESSION_DIVISOR[spellcasting.progression] ?? 1;
      combinedEffectiveLevel += Math.ceil(level / divisor);
    }
  }

  (character.classes ?? []).forEach((row, index) => {
    const match = classMatches[index];
    const level = row.level ?? 1;
    accumulate(match?.classData?.spellcasting, match?.classData?.spellProgression ?? {}, level);
    // Conjurador que só existe na SUBCLASSE, não na classe base (Eldritch Knight/Arcane
    // Trickster -- Fighter/Rogue não têm `spellcasting` nenhum) -- achado a pedido do
    // usuário: antes disso, essas magias já apareciam certinho pro jogador escolher
    // (`bonusEligibility`/`expandedSpellPool.js`, mecanismo separado), mas SEM teto
    // nenhum de quantas ele podia escolher, porque este loop nunca olhava pra
    // `subclassData`, só `classData`.
    accumulate(match?.subclassData?.spellcasting, match?.subclassData?.spellProgression ?? {}, level);
  });

  const cappedCombined = Math.min(20, combinedEffectiveLevel);
  const nonPactMaxLevel = cappedCombined >= 1 ? (FULL_CASTER_MAX_SPELL_LEVEL[cappedCombined - 1] ?? 9) : 0;

  return {
    cantripsKnown,
    spellsKnown: hasKnownCap ? spellsKnown : null,
    maxPrepared: hasPreparedCap ? maxPrepared : null,
    // Maior círculo de magia que o personagem já tem espaço pra conjurar, somando
    // TODAS as fontes -- usado só pra travar o buscador (não deixar escolher magia de
    // círculo acima do que já dá pra conjurar), nunca pra calcular quantidade de espaço.
    maxSpellLevel: Math.max(nonPactMaxLevel, pactSpellLevel),
  };
}

// Cruza o nome da magia com o catálogo do site pra saber se é truque (nível 0)
// -- `character.spells[]` não guarda o nível, só nome + preparada.
export function isCantripName(name, spellsData) {
  return spellsData.some((s) => s.name === name && s.level === 0);
}

// Se o personagem JÁ tem algum truque/magia conhecida/espaço de preparo no
// nível atual — diferente de só checar se alguma classe tem o campo
// `spellcasting` (que existe pra Patrulheiro/Paladino/Artificiante mesmo
// ANTES do nível em que eles começam a conjurar de verdade, já que o campo
// descreve a progressão inteira da classe, não o nível atual). Usado pra
// decidir se a etapa "Magias" deve aparecer -- sem isso, um Patrulheiro/
// Paladino nível 1 mostrava a etapa vazia (Truques 0/0, Preparadas 0/0),
// sem nada pra fazer nela (achado na revisão completa do projeto).
export function hasActiveSpellcasting(character, classMatches) {
  const caps = spellProgressionForCharacter(character, classMatches);
  return caps.cantripsKnown > 0 || (caps.spellsKnown ?? 0) > 0 || (caps.maxPrepared ?? 0) > 0;
}
