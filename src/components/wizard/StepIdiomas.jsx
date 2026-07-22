import { ChoicePicker } from "../ChoicePicker";
import { TagListInput } from "../TagListInput";
import { LANGUAGES } from "../../schema/character";

// Mesmo padrão de GrantSummary de StepPericias.jsx — discrimina de onde vem
// o idioma (Raça/Antecedente) e quantos dá pra escolher livremente, em vez
// de misturar tudo com Perícias/Ferramentas ou deixar escondido dentro da
// etapa de Raça/Antecedente (removido de lá, ver OriginSuggestions.jsx).
function LanguageGrantSummary({ title, matched, languages, onApplyFixed, onApplyChoice }) {
  if (!matched) return null;
  const hasFixed = Boolean(matched.languages?.trim());
  const hasChoice = Boolean(matched.languageChoice);
  if (!hasFixed && !hasChoice) return null;

  const fixedParts = hasFixed ? matched.languages.split(",").map((part) => part.trim()).filter(Boolean) : [];
  const fixedAdded = fixedParts.length > 0 && fixedParts.every((part) => languages.includes(part));

  return (
    <div className="pericias-grant-summary">
      <h4>{title}</h4>
      {hasFixed && (
        <p>
          Idiomas: {matched.languages}{" "}
          <button type="button" disabled={fixedAdded} onClick={() => onApplyFixed(matched.languages)}>
            {fixedAdded ? "Adicionado" : "Adicionar"}
          </button>
        </p>
      )}
      {hasChoice && (
        <ChoicePicker title="Idiomas" count={matched.languageChoice.count} from={LANGUAGES} onAdd={onApplyChoice} allowCustom />
      )}
    </div>
  );
}

export function StepIdiomas({ languages, onChange, raceMatch, backgroundMatch, appliers }) {
  return (
    <div className="wizard-step-idiomas">
      <LanguageGrantSummary
        title="Concedido pela Raça"
        matched={raceMatch}
        languages={languages}
        onApplyFixed={appliers.applyLanguages}
        onApplyChoice={appliers.applyLanguageChoices}
      />
      <LanguageGrantSummary
        title="Concedido pelo Antecedente"
        matched={backgroundMatch}
        languages={languages}
        onApplyFixed={appliers.applyLanguages}
        onApplyChoice={appliers.applyLanguageChoices}
      />
      <h3>Idiomas</h3>
      <TagListInput items={languages} onChange={onChange} placeholder="Ex: Élfico" addLabel="Adicionar idioma" />
    </div>
  );
}
