// Rótulo de exibição por categoria de `classChoices` (o `name`/mecânica em si continua em
// inglês, igual todo o resto do banco — só o TÍTULO do card/seção é traduzido, mesma
// convenção do resto do wizard). Extraído de StepEscolhasDeClasse.jsx pra ser reaproveitado
// também em FoundrySheetView.jsx (ficha/PDF) sem duplicar a lista.
export const CLASS_CHOICE_CATEGORY_LABELS = {
  fightingStyle: "Estilo de Luta",
  metamagic: "Metamagia",
  landTerrain: "Terreno (Circle of the Land)",
  stormEnvironment: "Ambiente da Tempestade (Storm Herald)",
  eldritchInvocation: "Invocação Mística",
  maneuver: "Manobra (Battle Master)",
  elementalDiscipline: "Disciplina Elemental (Way of the Four Elements)",
  artificerInfusion: "Infusão de Artífice",
  armorModel: "Modelo de Armadura (Armorer)",
  arcaneShot: "Disparo Arcano (Arcane Archer)",
  runeMagic: "Runa",
  houseTools: "Ferramentas de Casa (House Agent)",
  totemSpirit: "Totem Spirit (Path of the Totem Warrior)",
  aspectOfTheBeast: "Aspect of the Beast (Path of the Totem Warrior)",
  totemicAttunement: "Totemic Attunement (Path of the Totem Warrior)",
  // banco usa "rune" (bate com o subtype nativo do dnd5e, CONFIG.DND5E).
  rune: "Runa (Rune Knight)",
  hunterPrey: "Hunter's Prey (Hunter)",
  hunterDefensiveTactics: "Defensive Tactics (Hunter)",
  hunterMultiattack: "Multiattack (Hunter)",
  hunterSuperiorDefense: "Superior Hunter's Defense (Hunter)",
  divineOrder: "Ordem Divina (Divine Order)",
};
