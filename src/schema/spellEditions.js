import spellsData from "../data/content/spells.json";

// A maioria dos livros de terceiros (XGE/TCE/AAG/EGW/GGtR/Fizban's/Strixhaven/
// Humblewood/Acquisitions Inc/Arcana Unleashed/FRHoF/Book of Many Things...)
// nunca ganhou reedição pra outra regra -- a magia continua valendo normal,
// só nasceu num livro de uma edição só. Edição só deve travar de verdade
// quando as DUAS versões existem pro mesmo nome (núcleo do PHB, reescrito de
// propósito entre 2014 e 2024) -- fora isso, tratar como compatível com
// qualquer `rulesMode`, já que não existe alternativa da edição certa pra
// escolher. Achado real: filtro estrito (`spell.rules === rulesMode`) deixava
// 130 magias só-2014 (Air Bubble, Absorb Elements, Chaos Bolt, Booming Blade...)
// e 72 só-2024 completamente invisíveis pra personagem da edição oposta.
function buildDualEditionSpellNames(allSpells) {
  const byName = new Map();
  for (const s of allSpells) {
    if (!byName.has(s.name)) byName.set(s.name, new Set());
    byName.get(s.name).add(s.rules);
  }
  const dual = new Set();
  for (const [name, rulesSet] of byName) if (rulesSet.size > 1) dual.add(name);
  return dual;
}

const DUAL_EDITION_SPELL_NAMES = buildDualEditionSpellNames(spellsData);

export function isSpellRulesCompatible(spell, rulesMode) {
  return spell.rules === rulesMode || !DUAL_EDITION_SPELL_NAMES.has(spell.name);
}
