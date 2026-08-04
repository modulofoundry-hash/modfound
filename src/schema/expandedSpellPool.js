// Deriva o pool de magias que uma classe/subclasse EXPANDE (`additionalSpells.expanded`
// do 5etools, mesmo `spellGrants.raw` cru que `grantedSpells.js` já lê pra known/prepared/
// innate) -- diferente de `computeGrantedSpells`: aqui a magia NÃO é concedida
// automaticamente, ela só entra no MENU de escolha (Warlock/Sorcerer/Bardo ainda gastam
// um "spell known" nela; Eldritch Knight/Arcane Trickster idem). Confirmado contra o
// mirror do 5etools (varredura completa de data/class/*.json, 2026-08-01) que em NENHUM
// caso catalogado "expanded" é concessão de graça -- por isso fica separado de
// `grantedSpells.js`, não reaproveita a função de lá.

// Mesma limpeza de tags `#c`/`#N` já usada em `grantedSpells.js`/`resolveGrants.js`
// (módulo) -- "#c" marca cantrip, "#N" marca upcast, nenhuma faz parte do nome de verdade.
function cleanSpellName(raw) {
  return raw.split("|")[0].replace(/#c$/, "").replace(/#\d+$/, "").trim();
}

// 17 magias do PHB 2014 têm "nome de mago famoso" na fonte do 5etools mas foram
// RENOMEADAS pro nome genérico na SRD 5.1 -- mesma tabela de `resolveGrants.js` (módulo),
// duplicada aqui porque o site não importa código do módulo (app separado). Sem isso,
// "Evard's Black Tentacles"/"Tasha's Hideous Laughter"/etc nunca batem contra
// `spells.json` (que só tem o nome SRD), mesmo existindo de verdade no compêndio.
const SRD_SPELL_ALIAS = {
  "bigby's hand": "Arcane Hand",
  "drawmij's instant summons": "Instant Summons",
  "evard's black tentacles": "Black Tentacles",
  "leomund's secret chest": "Secret Chest",
  "leomund's tiny hut": "Tiny Hut",
  "melf's acid arrow": "Acid Arrow",
  "mordenkainen's faithful hound": "Faithful Hound",
  "mordenkainen's magnificent mansion": "Magnificent Mansion",
  "mordenkainen's private sanctum": "Private Sanctum",
  "mordenkainen's sword": "Arcane Sword",
  "nystul's magic aura": "Arcanist's Magic Aura",
  "otiluke's freezing sphere": "Freezing Sphere",
  "otiluke's resilient sphere": "Resilient Sphere",
  "otto's irresistible dance": "Irresistible Dance",
  "rary's telepathic bond": "Telepathic Bond",
  "tasha's hideous laughter": "Hideous Laughter",
  "tenser's floating disk": "Floating Disk",
};

// A fonte crua do 5etools sempre usa nome em minúsculo ("faerie fire"), mas
// `spells.json` do site guarda o nome canônico com capitalização de verdade ("Faerie
// Fire") -- resolver contra a lista real (case-insensitive) em vez de tentar reconstruir
// capitalização na mão evita erro em nome composto tipo "Tasha's Hideous Laughter".
// Achado ao vivo: sem isso, o `Set` usado pro filtro do SpellBrowser NUNCA batia com
// `spell.name` (comparação sensível a maiúsculas), silenciosamente inútil. Nome sem
// correspondência (raro -- magia de patron sem entrada no compêndio SRD-only) cai pro
// nome limpo original, só pra não sumir do aviso em texto.
function resolveCanonicalName(raw, spells) {
  const cleaned = cleanSpellName(raw);
  const needle = cleaned.toLowerCase();
  const direct = spells.find((s) => s.name.toLowerCase() === needle)?.name;
  if (direct) return direct;
  const alias = SRD_SPELL_ALIAS[needle];
  if (!alias) return cleaned;
  return spells.find((s) => s.name.toLowerCase() === alias.toLowerCase())?.name ?? cleaned;
}

// Chave de nível dentro de `expanded` vem em 2 formatos: número puro (nível de
// PERSONAGEM ou de CLASSE, dependendo da origem -- ver `computeExpandedSpellPool`) ou
// prefixada com "s" (nível de ESPAÇO DE MAGIA, não nível de personagem). "sN" precisa
// virar "em que nível de personagem essa classe ganha o espaço N pela primeira vez" pra
// poder comparar com `classLevel` do mesmo jeito que as chaves numéricas -- mas a tabela
// certa depende do TIPO de conjurador da classe dona:
// - Warlock (Pact Magic, não escala 1:1 com nível): 1→1, 2→3, 3→5, 4→7, 5→9 -- único caso
//   catalogado nos 8 Patrons (todos usam "sN" com essa tabela).
// - Conjurador "full" comum (tabela padrão de espaços por nível, igual em qualquer
//   classe que a use -- só o Bardo usa "sN" fora do Warlock, "Magical Secrets" 2024,
//   níveis 6-9): 6→11, 7→13, 8→15, 9→17 (mesma tabela de "Spell Slots per Spell Level"
//   de qualquer conjurador pleno, PHB).
const WARLOCK_PACT_SLOT_CHAR_LEVEL = { 1: 1, 2: 3, 3: 5, 4: 7, 5: 9 };
const FULL_CASTER_SLOT_CHAR_LEVEL = { 1: 1, 2: 3, 3: 5, 4: 7, 5: 9, 6: 11, 7: 13, 8: 15, 9: 17 };
function resolveLevelKey(levelKey, className) {
  if (levelKey === "_") return 0;
  if (levelKey.startsWith("s")) {
    const table = className === "Warlock" ? WARLOCK_PACT_SLOT_CHAR_LEVEL : FULL_CASTER_SLOT_CHAR_LEVEL;
    return table[Number(levelKey.slice(1))] ?? 0;
  }
  return Number(levelKey) || 0;
}

// Filtro `"level=1;2;3|class=Cleric;Druid;Wizard"` (ou `"source=EGW"`) -- sintaxe do
// 5etools, `|` separa cláusulas, cada cláusula pode ter vários valores por `;` (achado no
// Bardo 2024 "Magical Secrets", `class=Cleric;Druid;Wizard`). Só as 3 chaves vistas em
// qualquer caso catalogado (level/class/source) são reconhecidas; outras são ignoradas
// (não filtram nada) em vez de derrubar o resultado inteiro.
function parseFilterClauses(filterString) {
  const clauses = {};
  for (const part of (filterString ?? "").split("|")) {
    const [key, value] = part.split("=");
    if (!key || value === undefined) continue;
    clauses[key.trim()] = value.split(";").map((v) => v.trim());
  }
  return clauses;
}

// `spellsData` já vem filtrado pela EDIÇÃO certa (ver computeExpandedSpellPool) -- aqui só
// resta aplicar level/class/source. `source=EGW` (Chronurgy/Graviturgy) hoje sempre
// devolve vazio: `spells.json` do site é extraído AO VIVO do compêndio oficial do Foundry
// (SRD-only, ver SpellBrowser.jsx), nunca das 15 magias de Dunamancia autoradas deste
// projeto -- mesma limitação "compêndio Foundry é SRD-only" já documentada em outros
// pontos do banco, não é bug novo daqui.
function resolveFilterSpells(filterString, spells) {
  const clauses = parseFilterClauses(filterString);
  // `class=` comparado sem diferenciar maiúsculas -- achado ao vivo auditando TODAS as
  // entradas de expanded já capturadas: Divine Soul (XGE) usa "class=cleric" (minúsculo),
  // as demais (Eldritch Knight/Arcane Trickster/Bardo) usam "Wizard"/"Cleric" (capitalizado
  // como em `spells.json`) -- comparação sensível a maiúsculas fazia Divine Soul sempre
  // devolver pool vazio, silenciosamente.
  const classesLower = clauses.class?.map((c) => c.toLowerCase());
  return spells
    .filter((s) => {
      if (clauses.level && !clauses.level.includes(String(s.level))) return false;
      if (classesLower && !s.classes.some((c) => classesLower.includes(c.toLowerCase()))) return false;
      if (clauses.source && !clauses.source.includes(s.source)) return false;
      return true;
    })
    .map((s) => s.name);
}

// `{choose: "..."}` (escolha do JOGADOR em tempo de regra, ex: Bardo 2014 "qualquer magia
// de nível 0-5") não é resolvido pra uma lista -- mesma limitação já documentada em
// `grantedSpells.js`/`resolveGrants.js` (é uma pergunta em aberto, não uma lista fixa nem
// "todas que batem no filtro" como `{all:...}`).
function collectExpandedNames(node, spells, out) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) {
      if (typeof item === "string") out.push(resolveCanonicalName(item, spells));
      else if (item?.all) out.push(...resolveFilterSpells(item.all, spells));
    }
  } else if (typeof node === "object") {
    for (const value of Object.values(node)) collectExpandedNames(value, spells, out);
  }
}

function expandedFromRaw(raw, spells, className) {
  const out = [];
  for (const group of raw ?? []) {
    if (!group.expanded) continue;
    for (const [levelKey, value] of Object.entries(group.expanded)) {
      const level = resolveLevelKey(levelKey, className);
      const names = [];
      collectExpandedNames(value, spells, names);
      for (const name of new Set(names)) out.push({ name, level });
    }
  }
  return out;
}

// [{name, level, source, className, unlocked}] -- `level` é o nível em que a magia entra
// no menu de escolha (0 = desde o início); `unlocked` compara com o nível da CLASSE dona
// da origem (subclasse OU a própria classe, caso "Magical Secrets" do Bardo 2024 -- único
// hoje que expande em nível de CLASSE, não de subclasse). `source` é o nome de exibição
// (subclasse ou classe, pro aviso em texto); `className` é sempre o nome da CLASSE (pro
// SpellBrowser saber em qual filtro de classe a magia deve aparecer também, ver
// StepMagias.jsx). `classMatches` aceita array ou objeto indexado por posição, mesmo
// padrão de `computeGrantedSpells`.
export function computeExpandedSpellPool({ character, classMatches, spellsData }) {
  const editionSpells = spellsData.filter((s) => s.rules === character.rulesMode);
  const results = [];

  Object.values(classMatches ?? {}).forEach((match, index) => {
    const classLevel = character.classes?.[index]?.level ?? 0;
    const className = match?.classData?.name;
    // `classData.spellGrants`/`subclassData.spellGrants` já vêm como o array `raw` direto
    // (não `{raw:[...]}`) -- mesma convenção de `grantedSpells.js` (`s.spellGrants` usado
    // direto em `grantsFromRaw`), achado ao vivo: minha 1ª versão chamava `.raw` de novo
    // em cima de um array, sempre devolvendo `undefined` (silenciosamente vazio).
    if (match?.classData?.spellGrants) {
      for (const entry of expandedFromRaw(match.classData.spellGrants, editionSpells, className)) {
        results.push({ ...entry, source: match.classData.name, className, unlocked: classLevel >= entry.level });
      }
    }
    if (match?.subclassData?.spellGrants) {
      for (const entry of expandedFromRaw(match.subclassData.spellGrants, editionSpells, className)) {
        results.push({ ...entry, source: match.subclassData.name, className, unlocked: classLevel >= entry.level });
      }
    }
  });

  const seen = new Set();
  return results.filter((entry) => {
    const key = `${entry.name}|${entry.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
