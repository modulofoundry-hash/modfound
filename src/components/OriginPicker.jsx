import { useEffect, useState } from "react";
import { SourceItemPicker } from "./SourceItemPicker";
import { OriginSuggestions } from "./OriginSuggestions";
import { deriveDarkvisionFeet } from "../schema/character";

// matched.size vem como string tipo "M" ou "S/M" (raça 2014, "/"-separada) OU
// como array tipo ["S","M"] (raça 2024 — mesmo formato usado em buildRaceItem.js
// no módulo). Chamar .split() direto quebrava com TypeError toda vez que uma
// raça 2024 era escolhida (arrays não têm .split) — achado testando o NPC ao
// vivo, travava o formulário inteiro. sizeToLetters() aceita as duas formas.
function sizeToLetters(size) {
  if (Array.isArray(size)) return size.filter(Boolean);
  if (typeof size === "string") return size.split("/").filter(Boolean);
  return [];
}

export function OriginPicker({
  label,
  items,
  value,
  // Edição do item já salvo (`character.raceRules`/`backgroundRules`) — só
  // usada aqui pra RE-ENCONTRAR o match ao carregar uma ficha já existente
  // (ver useEffect abaixo), desempatando nome repetido entre edição.
  rules,
  onChange,
  placeholder,
  onApplySkills,
  onApplyTools,
  onApplyLanguages,
  onApplyLanguageChoices,
  onApplyEquipment,
  onApplySize,
  onApplySenses,
  onApplySpells,
  sizeValue,
  onMatch,
  skillProficiencies,
  toolProficiencies,
  languages,
}) {
  const [matched, setMatched] = useState(null);

  // `matched` só era preenchido dentro de `handlePick` (clique de verdade no
  // dropdown) — abrir uma ficha JÁ SALVA pra editar nunca disparava isso, então
  // o painel de sugestão (perícia/ferramenta/idioma/equipamento concedido),
  // a tag de edição ao lado do rótulo e o `AbilityBonusPicker` ficavam
  // invisíveis até o usuário re-clicar a Raça/Antecedente já escolhida do
  // zero — achado real revisando um bug de idioma relatado (usuário só via a
  // sugestão de idioma, com o texto ainda quebrado, DEPOIS de reclicar a
  // raça tentando "atualizar" algo). Este efeito re-deriva `matched` a partir
  // do que já está salvo (`value`+`rules`) toda vez que a ficha carrega ou
  // troca de raça/antecedente — sem chamar `onApplySize`/`onApplySenses`
  // (esses só devem rodar num clique de verdade, senão reabrir a ficha
  // sobrescreveria Tamanho/Sentidos já ajustados manualmente depois).
  useEffect(() => {
    if (!value) {
      setMatched(null);
      onMatch?.(null);
      return;
    }
    const found = items.find((item) => item.name === value && item.rules === rules) ?? items.find((item) => item.name === value) ?? null;
    setMatched(found);
    onMatch?.(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, rules, items]);

  function handlePick(text, item) {
    onChange(text);
    setMatched(item);
    onMatch?.(item);
    if (onApplySize) {
      const options = sizeToLetters(item?.size);
      // Tamanho fixo (1 opção): aplica sozinho. Sem opção ou várias opções:
      // limpa o que tinha antes até o usuário escolher de novo.
      onApplySize(options.length === 1 ? options[0] : "");
    }
    // Mesmo automatismo do tamanho — só passado onde esse picker é RAÇA (a
    // única fonte de Visão no Escuro no banco atual); Antecedente não recebe
    // essa prop, então isso não faz nada nesse caso.
    if (onApplySenses) {
      onApplySenses({ darkvision: deriveDarkvisionFeet(item?.traits) });
    }
  }

  return (
    <div className="origin-picker">
      <label>
        {label}
        {matched?.rules && (
          <span className={`rules-tag rules-tag-${matched.rules}`}>{matched.rules}</span>
        )}
        <SourceItemPicker items={items} value={value} onChange={handlePick} placeholder={placeholder} />
      </label>

      <OriginSuggestions
        matched={matched}
        onApplySkills={onApplySkills}
        onApplyTools={onApplyTools}
        onApplyLanguages={onApplyLanguages}
        onApplyLanguageChoices={onApplyLanguageChoices}
        onApplyEquipment={onApplyEquipment}
        onApplySize={onApplySize}
        onApplySpells={onApplySpells}
        sizeValue={sizeValue}
        skillProficiencies={skillProficiencies}
        toolProficiencies={toolProficiencies}
        languages={languages}
      />
    </div>
  );
}
