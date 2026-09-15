// Pré-requisito real de Optional Feature (Invocação Mística, Disciplina Elemental,
// Runa...) -- `entry.prerequisites.raw`, mesmo dado bruto que o módulo Foundry já lê em
// `resolveGrants.js`/`buildFeatItemData`, nunca antes checado no lado do site (achado
// numa auditoria: o wizard deixava escolher "Thirsting Blade" sem Pacto da Lâmina, ou
// "Witch Sight" no nível 2). `raw` é um array de grupos ALTERNATIVOS (OR entre grupos,
// AND entre as chaves dentro do MESMO grupo) -- na prática quase toda entrada só tem 1
// grupo, mas o formato já vem assim do banco.
//
// Cobre só o que dá pra checar sem alucinar: `level` (nível da classe/subclasse dona) e
// Pacto (`pact` string 2014, ou `optionalfeature` 2024 -- referencia outra Optional
// Feature já escolhida PELO NOME, não só Pacto: "Devouring Blade" exige ter "Thirsting
// Blade" escolhida, não um Pacto). `spell` só quando é NOME FIXO (2014/TCE/XGE); a forma
// 2024 é um FILTRO livre ("qualquer truque de Bruxo que causa dano") -- deixado sem
// enforcement de propósito, mesmo precedente já aceito pro resto do banco (`item` de
// Infusão de Artífice, pré-requisito não-nível de talento) -- ver
// project_eldritch_invocation_audit_2026_09.md.
function cleanFeatureTag(raw) {
  return raw.split("|")[0].trim().toLowerCase();
}

function hasClassChoiceNamed(character, tag) {
  const wanted = cleanFeatureTag(tag);
  return (character.classChoices ?? []).some((c) => c.name?.toLowerCase() === wanted);
}

function meetsLevelRequirement(character, req) {
  const className = req.class?.name;
  const subclassName = req.subclass?.name;
  return (character.classes ?? []).some((c) => {
    if (className && c.name !== className) return false;
    if (subclassName && c.subclass !== subclassName) return false;
    return (c.level ?? 0) >= req.level;
  });
}

function meetsSpellRequirement(character, spellReq) {
  // Filtro livre (objeto, ex: {choose:"level=0|class=Warlock"}) -- não enforçado.
  if (!Array.isArray(spellReq) || spellReq.some((s) => typeof s !== "string")) return true;
  const known = new Set((character.spells ?? []).map((s) => s.name?.toLowerCase()));
  return spellReq.some((raw) => {
    const tag = raw.split("#")[0].split("|")[0].trim().toLowerCase();
    // "hex/curse" (Maddening Hex/Relentless Hex) = qualquer um dos dois nomes.
    return tag.split("/").some((name) => known.has(name.trim()));
  });
}

function meetsPactRequirement(character, pactName) {
  return hasClassChoiceNamed(character, `pact of the ${pactName}`);
}

function meetsGroup(character, group) {
  if (group.level && !meetsLevelRequirement(character, group.level)) return false;
  if (group.pact && !meetsPactRequirement(character, group.pact)) return false;
  if (group.optionalfeature && !group.optionalfeature.every((tag) => hasClassChoiceNamed(character, tag))) return false;
  if (group.spell && !meetsSpellRequirement(character, group.spell)) return false;
  // `item` (Infusão de Artífice) não é checado -- informativo só, mesmo precedente
  // já aceito pro resto do banco.
  return true;
}

export function isOptionalFeatureEligible(entry, character) {
  const raw = entry.prerequisites?.raw;
  if (!raw?.length) return true;
  return raw.some((group) => meetsGroup(character, group));
}
