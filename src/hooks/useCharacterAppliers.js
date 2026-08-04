import { SKILLS } from "../schema/character";

// Extraído de CharacterForm.jsx pra ser reaproveitado pelo wizard de criação
// também — mesma lógica, sem duplicar. `setFeedback` é opcional (o wizard
// mostra a escolha aplicada no painel de resumo, não precisa de toast).
export function useCharacterAppliers(setCharacter, setFeedback) {
  function applySkills(skillLabels) {
    const ids = skillLabels.map((label) => SKILLS.find((s) => s.label === label)?.id).filter(Boolean);
    setCharacter((prev) => ({
      ...prev,
      skillProficiencies: Array.from(new Set([...prev.skillProficiencies, ...ids])),
    }));
    setFeedback?.(`${skillLabels.join(", ")} adicionado(s) em Perícias`);
  }

  function applyTools(toolLabels) {
    setCharacter((prev) => ({
      ...prev,
      toolProficiencies: Array.from(new Set([...prev.toolProficiencies, ...toolLabels])),
    }));
    setFeedback?.(`${toolLabels.join(", ")} adicionado(s) em Proficiências em Ferramentas`);
  }

  // O banco guarda idiomas de raça/antecedente como texto solto (ex: "comum,
  // anão"), não lista — sem separar por vírgula aqui, o idioma inteiro virava
  // UMA entrada só em vez de duas (ver shared/schema/README.md).
  function applyLanguages(text) {
    const parts = text.split(",").map((part) => part.trim()).filter(Boolean);
    // Set evita duplicar quando Raça E Antecedente concedem o mesmo idioma
    // fixo (ex: "comum" nos dois) — achado revisando o projeto, mesmo padrão
    // de dedup que applySkills/applyTools/applyLanguageChoices já usam.
    setCharacter((prev) => ({ ...prev, languages: Array.from(new Set([...prev.languages, ...parts])) }));
    setFeedback?.(`${parts.join(", ")} adicionado(s) em Idiomas`);
  }

  // Escolha LIVRE de idioma (Raça/Antecedente com "+N idioma à escolha") —
  // mesmo padrão de applySkills/applyTools (array de rótulos já escolhidos
  // no ChoicePicker), separado de applyLanguages() porque esse recebe o
  // idioma FIXO como texto solto pra separar por vírgula, não uma lista já
  // pronta.
  function applyLanguageChoices(labels) {
    setCharacter((prev) => ({ ...prev, languages: Array.from(new Set([...prev.languages, ...labels])) }));
    setFeedback?.(`${labels.join(", ")} adicionado(s) em Idiomas`);
  }

  function applySize(size) {
    setCharacter((prev) => ({ ...prev, size }));
  }

  // Chamado automaticamente ao escolher Raça (mesmo padrão do applySize) —
  // não é sugestão com botão, entra direto porque o valor já é derivado do
  // traço "Darkvision" da própria raça (ver deriveDarkvisionFeet).
  function applySenses(patch) {
    setCharacter((prev) => ({ ...prev, senses: { ...prev.senses, ...patch } }));
  }

  function applySpellChoices(names) {
    setCharacter((prev) => {
      const existing = new Set(prev.spells.map((s) => s.name));
      const additions = names.filter((name) => !existing.has(name)).map((name) => ({ name, prepared: false }));
      return { ...prev, spells: [...prev.spells, ...additions] };
    });
    setFeedback?.(`${names.join(", ")} adicionado(s) em Magias`);
  }

  // "N po" (peças de ouro) é a única denominação de moeda que aparece como
  // grant FIXO no banco (ex: Sage "10 po") — mesmo padrão que
  // resolveEquipmentSlots.js (módulo) já trata como `currency`, não como Item.
  // Sem esse desvio aqui, a moeda virava um item de "Equipamento" literal
  // chamado "10 po" (achado testando round-trip: no Foundry isso sincronizava
  // como um Item de loot vazio chamado "10 po" em vez do personagem realmente
  // ganhar os 10 po de ouro).
  const MONEY_RE = /^(\d+)\s*po$/i;

  function applyEquipmentGrants(grants) {
    const moneyGrants = grants.filter((item) => MONEY_RE.test(item.name?.trim() ?? ""));
    const itemGrants = grants.filter((item) => !MONEY_RE.test(item.name?.trim() ?? ""));
    const goldAdded = moneyGrants.reduce((sum, item) => sum + Number(MONEY_RE.exec(item.name.trim())[1]), 0);

    setCharacter((prev) => ({
      ...prev,
      equipment: [...prev.equipment, ...itemGrants],
      currency: { ...prev.currency, gp: (prev.currency?.gp ?? 0) + goldAdded },
    }));
    const labels = grants.map((item) => (item.quantity > 1 ? `${item.quantity}x ${item.name}` : item.name));
    setFeedback?.(`${labels.join(", ")} adicionado(s) em Equipamento`);
  }

  // Soma o bônus escolhido em cima do que já estiver em Atributos — não existe
  // "atributo base" guardado separado, o campo já é sempre o valor final.
  function applyAbilityBonus(picks) {
    setCharacter((prev) => ({
      ...prev,
      abilities: Object.fromEntries(
        Object.entries(prev.abilities).map(([key, value]) => [key, value + (picks[key] ?? 0)]),
      ),
    }));
    const labels = Object.entries(picks).map(([key, amount]) => `+${amount} ${key.toUpperCase()}`);
    setFeedback?.(`${labels.join(", ")} aplicado em Atributos`);
  }

  // Versão do bônus de atributo LIGADA a uma fonte (Raça ou Antecedente,
  // `sourceKey` "race"/"background") -- diferente de `applyAbilityBonus`
  // (usada pela Melhoria de Atributo de classe, que já rastreia sua própria
  // escolha em `character.abilityImprovements`), o picker de Raça/Antecedente
  // não tinha NENHUM jeito de saber o que já tinha aplicado. Bug real achado
  // na revisão: clicar "Aplicar" duas vezes dobrava o bônus, e trocar de
  // raça/antecedente no meio do caminho (a busca permite isso livremente)
  // deixava o bônus da escolha ANTERIOR pra sempre nos Atributos, mesmo sem a
  // raça/antecedente mais valer. Reverte o que já estava gravado em
  // `character[sourceKey + "AbilityBonusPicks"]` antes de aplicar o novo --
  // reaplicar o MESMO bônus (clique duplo) vira um no-op líquido, e trocar de
  // fonte reverte a escolha antiga automaticamente.
  function applyAbilityBonusFor(sourceKey, picks) {
    const fieldKey = `${sourceKey}AbilityBonusPicks`;
    setCharacter((prev) => {
      const abilities = { ...prev.abilities };
      const previous = prev[fieldKey];
      if (previous) {
        for (const [key, amount] of Object.entries(previous)) abilities[key] = (abilities[key] ?? 10) - amount;
      }
      for (const [key, amount] of Object.entries(picks)) abilities[key] = (abilities[key] ?? 10) + amount;
      return { ...prev, abilities, [fieldKey]: picks };
    });
    const labels = Object.entries(picks).map(([key, amount]) => `+${amount} ${key.toUpperCase()}`);
    setFeedback?.(`${labels.join(", ")} aplicado em Atributos`);
  }

  // Reverte (sem aplicar nada novo) o bônus gravado em
  // `character[sourceKey + "AbilityBonusPicks"]`, se houver -- chamado ao
  // trocar de Raça/Antecedente (ver pickRace/pickBackground) pra não deixar a
  // escolha anterior grudada.
  function revertAbilityBonusFor(sourceKey) {
    const fieldKey = `${sourceKey}AbilityBonusPicks`;
    setCharacter((prev) => {
      const previous = prev[fieldKey];
      if (!previous) return prev;
      const abilities = { ...prev.abilities };
      for (const [key, amount] of Object.entries(previous)) abilities[key] = (abilities[key] ?? 10) - amount;
      return { ...prev, abilities, [fieldKey]: null };
    });
  }

  return {
    applySkills,
    applyTools,
    applyLanguages,
    applyLanguageChoices,
    applySize,
    applySenses,
    applySpellChoices,
    applyEquipmentGrants,
    applyAbilityBonus,
    applyAbilityBonusFor,
    revertAbilityBonusFor,
  };
}
