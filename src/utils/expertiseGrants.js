import { featName, featRules } from "../schema/character";

// Slots de Expertise concedidos por CLASSE (Bardo/Ladino/Patrulheiro 2024, ver
// `classData.expertiseLevels`, gerado a partir da própria feature "Expertise"
// de cada classe -- não hardcoded por nome) + por TALENTO (achado na
// auditoria de talentos, Lote 57, nov/2026: Aberrant Anatomy, Boon of Skill,
// Boon of Terror, Echoing Soul, Prodigy, Skill Expert 2014/2024 -- todos
// concedem "escolha 1 perícia já proficiente pra ganhar Expertise", mesmo
// padrão de classe, só sem nível associado). Era só de classe antes (função
// `expertiseSlots`, só existia dentro de LevelUpWizard.jsx) -- unificado
// aqui pra CharacterCreationWizard reaproveitar também (nunca tinha essa
// contagem na criação, só no level-up).
//
// Puramente INFORMATIVO (mesmo espírito de sempre neste projeto): não aplica
// nada sozinho, só conta quantos slots existem pra UI avisar o jogador —
// quem marca a perícia como Expertise de verdade é o próprio jogador em
// `SkillsInput` (ver StepPericias.jsx).
export function computeExpertiseGrants(character, classMatches, featsData) {
  const slots = [];
  (character.classes ?? []).forEach((row, classIndex) => {
    const levels = classMatches?.[classIndex]?.classData?.expertiseLevels ?? [];
    for (const level of levels) {
      if (level <= (row.level ?? 1)) slots.push({ label: row.name, level });
    }
  });
  for (const entry of character.feats ?? []) {
    const name = featName(entry);
    const rules = featRules(entry);
    const found =
      (rules && featsData.find((f) => f.name === name && f.rules === rules)) ||
      featsData.find((f) => f.name === name);
    const count = found?.expertiseGrant?.count ?? 0;
    for (let i = 0; i < count; i++) slots.push({ label: name, level: null });
  }
  return slots;
}
