import { CHIP_DEFS } from "../components/wizard/StepMelhorias";

// Extraído de CharacterCreationWizard.jsx pra ser reaproveitado pelo wizard de
// Level-Up também -- mesma lógica de Melhoria de Atributo (ASI/Talento), sem
// duplicar. `applyAbilityBonus` (de useCharacterAppliers) soma/subtrai em cima
// do que já estiver em `character.abilities` -- reverter um chip é só aplicar
// o valor negado.
export function useAbilityImprovements(character, setCharacter, applyAbilityBonus) {
  function findImprovement(classIndex, level) {
    return character.abilityImprovements.find((i) => i.classIndex === classIndex && i.level === level);
  }

  // Desfaz o efeito já aplicado de um slot (bônus de atributo somado ou
  // talento adicionado) — chamado sempre ANTES de trocar a escolha daquele
  // slot, pra não deixar sobra.
  function revertImprovement(improvement) {
    if (!improvement) return;
    if (improvement.feat) {
      setCharacter((prev) => ({ ...prev, feats: prev.feats.filter((f) => f !== improvement.feat) }));
    }
    const chips = CHIP_DEFS[improvement.choice] ?? [];
    const negated = {};
    for (const chip of chips) {
      const abilityKey = improvement.assignments?.[chip.id];
      if (abilityKey) negated[abilityKey] = (negated[abilityKey] ?? 0) - chip.amount;
    }
    if (Object.keys(negated).length) applyAbilityBonus(negated);
  }

  function replaceImprovement(classIndex, level, patch) {
    setCharacter((prev) => ({
      ...prev,
      abilityImprovements: [
        ...prev.abilityImprovements.filter((i) => !(i.classIndex === classIndex && i.level === level)),
        { classIndex, level, choice: null, assignments: {}, feat: null, featRules: null, ...patch },
      ],
    }));
  }

  function setImprovementChoice(classIndex, level, choice) {
    revertImprovement(findImprovement(classIndex, level));
    replaceImprovement(classIndex, level, { choice });
  }

  // Arrasta um chip de bônus (+2 ou +1) pra um atributo — troca de destino
  // reverte o chip da posição antiga antes de aplicar na nova.
  function moveImprovementChip(classIndex, level, chipId, chipAmount, abilityKey) {
    const improvement = findImprovement(classIndex, level) ?? { classIndex, level, choice: null, assignments: {}, feat: null };
    const oldAbilityKey = improvement.assignments[chipId];
    if (oldAbilityKey === abilityKey) return;
    // As duas metades do "+1 em dois atributos" não podem cair no mesmo atributo.
    if (Object.entries(improvement.assignments).some(([id, key]) => id !== chipId && key === abilityKey)) return;
    if ((character.abilities[abilityKey] ?? 10) + chipAmount > 20) return;
    const patch = { [abilityKey]: chipAmount };
    if (oldAbilityKey) patch[oldAbilityKey] = (patch[oldAbilityKey] ?? 0) - chipAmount;
    applyAbilityBonus(patch);
    replaceImprovement(classIndex, level, {
      choice: improvement.choice,
      feat: improvement.feat,
      assignments: { ...improvement.assignments, [chipId]: abilityKey },
    });
  }

  function unassignImprovementChip(classIndex, level, chipId, chipAmount) {
    const improvement = findImprovement(classIndex, level);
    const abilityKey = improvement?.assignments?.[chipId];
    if (!abilityKey) return;
    applyAbilityBonus({ [abilityKey]: -chipAmount });
    const assignments = { ...improvement.assignments };
    delete assignments[chipId];
    replaceImprovement(classIndex, level, { choice: improvement.choice, feat: improvement.feat, assignments });
  }

  function pickImprovementFeat(classIndex, level, item) {
    const improvement = findImprovement(classIndex, level) ?? { classIndex, level, choice: "feat", assignments: {}, feat: null };
    if (improvement.feat === item.name) return;
    setCharacter((prev) => {
      let feats = prev.feats;
      if (improvement.feat) feats = feats.filter((f) => f !== improvement.feat);
      if (!feats.includes(item.name)) feats = [...feats, item.name];
      return { ...prev, feats };
    });
    replaceImprovement(classIndex, level, {
      choice: "feat",
      assignments: improvement.assignments,
      feat: item.name,
      featRules: item.rules ?? "",
    });
  }

  return {
    findImprovement,
    revertImprovement,
    setImprovementChoice,
    moveImprovementChip,
    unassignImprovementChip,
    pickImprovementFeat,
  };
}
