// Deriva a lista de magias que Raça/Feat/Subclasse/Escolha de Classe concedem
// automaticamente ao personagem (`spellGrants`, o mesmo `additionalSpells` cru
// do 5etools que o módulo Foundry já resolve em resolveGrants.js) — usado só
// pra EXIBIR no site (ficha final, e um aviso na própria etapa de Magias).
//
// De propósito, NUNCA escrito em `character.spells`: o Foundry já embute
// essas magias sozinho através do ItemGrant da própria raça/subclasse/feat/
// optional feature (mesmo mecanismo que embute feature automática de classe,
// ver `collectGrantedItemUuids` em module/scripts/actors/advancement.js) toda
// vez que sincroniza. Se o site também jogasse isso em `character.spells`, o
// personagem ganharia a magia DUAS vezes no Foundry (um Item vindo do
// advancement da raça, outro vindo da lista de magias do personagem —
// `buildCharacter.js` não faz nenhuma deduplicação entre os dois hoje).

function cleanSpellName(raw) {
  return raw.split("|")[0].replace(/#c$/, "").trim();
}

// Escolha por FILTRO (ex: `{choose: "level=0|class=Druid"}`, "1 truque de
// Druida à escolha") não é resolvida pra um nome — mesma limitação já
// documentada no lado do módulo (é uma query, não um nome; inventar qual
// magia bate seria alucinar dado). Só nome fixo vira entrada de verdade.
//
// `level` é fixado UMA vez, na chave logo abaixo de known/prepared/innate
// ("_" ou um número de nível) — não é recalculado ao descer mais fundo.
// Bug real encontrado ao vivo: um wrapper `{daily:{"1":[...]}}` (innate com
// limite de 1 uso/dia) tem uma chave numérica "1" que NÃO é nível nenhum, é
// quantidade de usos por dia — tratar toda chave numérica como nível fazia
// Enthrall (Erina Spiritfarer, concedida só a partir do nível 5) aparecer
// como liberada desde o nível 1. Mesma distinção que resolveGrants.js já
// faz no lado do módulo (level fixo no primeiro nível, dailyUses resolvido
// à parte na recursão).
function collectSpellNames(node, out) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) {
      if (typeof item === "string") out.push(cleanSpellName(item));
    }
  } else if (typeof node === "object") {
    for (const value of Object.values(node)) collectSpellNames(value, out);
  }
}

// `raw` pode ter mais de um grupo alternativo na mesma fonte (ex: Divine Soul
// do XGE, "escolha 1 de 5 afinidades") — sem um jeito de saber qual o
// personagem escolheu, cada grupo é tratado como concessão própria (mesma
// simplificação seguida no lado do módulo pra esse caso: melhor mostrar a
// possibilidade do que fingir que não existe).
function grantsFromRaw(raw) {
  const out = [];
  for (const group of raw ?? []) {
    for (const method of ["known", "prepared", "innate"]) {
      const data = group[method];
      if (!data) continue;
      for (const [levelKey, value] of Object.entries(data)) {
        const level = levelKey === "_" ? 0 : Number(levelKey) || 0;
        const names = [];
        collectSpellNames(value, names);
        for (const name of names) out.push({ name, level });
      }
    }
  }
  return out;
}

export function totalCharacterLevel(classes) {
  return (classes ?? []).filter((c) => c.name).reduce((sum, c) => sum + (Number(c.level) || 0), 0);
}

// [{name, level, source, unlocked}] -- `level` é o nível em que a magia é
// liberada (0 = desde o início); `unlocked` já compara com o nível certo pra
// cada fonte (personagem inteiro pra Raça/Feat, só a classe DONA da
// subclasse em caso de multiclasse, sempre liberada pra Escolha de Classe já
// escolhida). `classMatches` aceita tanto array quanto objeto indexado por
// posição (os dois wizards guardam de um jeito diferente).
export function computeGrantedSpells({ character, raceMatch, classMatches, featsData, optionalFeaturesData }) {
  const charLevel = totalCharacterLevel(character.classes);
  const results = [];

  function addFrom(spellGrants, source, level) {
    for (const grant of grantsFromRaw(spellGrants)) {
      results.push({ name: grant.name, level: grant.level, source, unlocked: level >= grant.level });
    }
  }

  if (raceMatch?.spellGrants) addFrom(raceMatch.spellGrants, raceMatch.name, charLevel);

  // `character.feats`/`classChoices` só guardam o NOME (achado ao vivo: mais
  // de uma entrada pode compartilhar nome entre edições, ex: "Gift of the
  // Depths" existe tanto no XGE 2014 quanto reescrita no XPHB 2024, cada uma
  // com `spellGrants` diferente -- um `.find` ingênuo por nome pegava sempre
  // a primeira do arquivo, que podia ser a edição errada). Prioriza a edição
  // do personagem (`character.rulesMode`), com fallback pro primeiro nome
  // igual -- mesmo padrão de desambiguação com fallback já usado pra
  // raceRules/subclassRules em outros pontos do site.
  function findByName(list, name) {
    return list.find((x) => x.name === name && x.rules === character.rulesMode) ?? list.find((x) => x.name === name);
  }

  for (const featName of character.feats ?? []) {
    const feat = findByName(featsData, featName);
    if (feat?.spellGrants) addFrom(feat.spellGrants, feat.name, charLevel);
  }

  Object.values(classMatches ?? {}).forEach((match, index) => {
    const classLevel = character.classes?.[index]?.level ?? 0;
    if (match?.subclassData?.spellGrants) addFrom(match.subclassData.spellGrants, match.subclassData.name, classLevel);
  });

  for (const choice of character.classChoices ?? []) {
    const opt = findByName(optionalFeaturesData, choice.name);
    if (opt?.spellGrants) addFrom(opt.spellGrants, opt.name, 0);
  }

  const seen = new Set();
  return results.filter((entry) => {
    const key = `${entry.name}|${entry.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
