// Rolagem de dado LOCAL, no navegador -- primeira do site que não passa pelo
// `liveRollBridge`/Foundry ao vivo (ver plano "Tela de Magias", set/2026).
// Motivo: dano/cura/CD de magia sem ataque (Thunderwave etc.) não precisa de
// um Actor real pra fazer sentido, e o app já usa exatamente esse padrão
// (`app/src/dice/mechanics.js` + `useRollLog`) -- reaproveitar a mesma ideia
// mantém a experiência igual nos dois lados e não trava se o Foundry estiver
// offline. Só entende fórmulas simples "NdM+B"/"NdM-B" (o único formato que
// `spellDamageFormula`/`spellHealFormula` produzem) -- não é um parser de
// fórmula genérico.
export function rollFormula(formula) {
  const match = String(formula ?? "").trim().match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) return null;
  const [, nStr, dStr, bonusStr] = match;
  const n = Number(nStr);
  const die = Number(dStr);
  const bonus = bonusStr ? Number(bonusStr) : 0;
  const rolls = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * die));
  const total = rolls.reduce((sum, r) => sum + r, 0) + bonus;
  return { formula, rolls, bonus, total };
}
