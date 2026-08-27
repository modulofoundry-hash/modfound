// Animal Enhancement (Simic Hybrid, GGR) — 2 escolhas por PERSONAGEM (não por classe):
// 1 no nível 1 (pool de 3), 1 no nível 5 (pool de 5 = as 2 que sobraram do nível 1 +
// 3 novas). Mecanismo DEDICADO (não `optionalFeatureChoices`/`classChoiceSlots`
// genérico) porque o genérico não sabe excluir do pool do nível 5 a opção já
// escolhida no nível 1 — decisão explícita do usuário (ver plano) de ter exclusão
// REAL em vez da versão permissiva (repetir escolha) ou generalizar o mecanismo
// compartilhado (risco de regressão em Rune Shaper/Metamagia/House Agent).
const RACE_NAME = "Simic Hybrid (GGR)";

const LEVEL1_POOL = ["Manta Glide (GGR)", "Nimble Climber (GGR)", "Underwater Adaptation (GGR)"];
const LEVEL5_NEW = ["Grappling Appendage (GGR)", "Carapace (GGR)", "Acid Spit (GGR)"];

function isSimicHybrid(character) {
  return character.race === RACE_NAME;
}

// Sem filtrar por `c.name` (diferente de outros slot-finders do projeto) --
// a etapa "Nível" do wizard (StepNivel) grava o nível-alvo em
// `classes[0].level` ANTES do jogador chegar na etapa Classe (ela vem
// depois, ver STEP_DEFS), então uma classe ainda sem nome escolhido não pode
// zerar o nível pra essa contagem -- bug real achado ao vivo: personagem
// nível 5 + Simic Hybrid sem Classe escolhida ainda fazia o slot do Nível 5
// nunca aparecer, mesmo com "Nível: 5" já visível no resumo lateral.
function totalCharacterLevel(character) {
  return (character.classes ?? []).reduce((sum, c) => sum + (Number(c.level) || 0), 0);
}

// 1 slot no nível 1 sempre (pool fixo de 3); 1 slot no nível 5 só a partir do nível 5,
// com pool recalculado ao vivo excluindo o nome já escolhido no nível 1 -- é essa
// exclusão que o mecanismo genérico do projeto não sabe fazer entre categorias.
export function animalEnhancementSlots(character) {
  if (!isSimicHybrid(character)) return [];
  const choices = character.animalEnhancementChoices ?? [];
  const level1Name = choices.find((c) => c.slotKey === "level1")?.name;

  const slots = [{ slotKey: "level1", label: "Nível 1", pool: LEVEL1_POOL }];
  if (totalCharacterLevel(character) >= 5) {
    const pool = [...LEVEL1_POOL.filter((name) => name !== level1Name), ...LEVEL5_NEW];
    slots.push({ slotKey: "level5", label: "Nível 5", pool });
  }
  return slots;
}

// Escolhas trazidas de volta via "Enviar pro site" (reverseCharacter.js) --
// `slotKey:"reversed"`, mesma limitação já aceita em weaponMasteryChoices: o
// Foundry só guarda o CONJUNTO de Items concedidos, nenhuma informação de qual
// nível concedeu cada um sobrevive. Mostradas à parte (lista, não picker) em vez
// de forçadas num dos 2 slots normais acima.
export function reversedAnimalEnhancementChoices(character) {
  if (!isSimicHybrid(character)) return [];
  return (character.animalEnhancementChoices ?? []).filter((c) => c.slotKey === "reversed");
}
