import { ChoicePicker } from "../ChoicePicker";
import { TagListInput } from "../TagListInput";
import { LANGUAGES } from "../../schema/character";

// Mesmo padrão de GrantSummary de StepPericias.jsx — discrimina de onde vem
// o idioma (Raça/Antecedente) e quantos dá pra escolher livremente, em vez
// de misturar tudo com Perícias/Ferramentas ou deixar escondido dentro da
// etapa de Raça/Antecedente (removido de lá, ver OriginSuggestions.jsx).
//
// Idioma FIXO (`matched.languages`) já entra sozinho em `pickRace`/
// `pickBackground` (CharacterCreationWizard.jsx) assim que a Raça/Antecedente
// é escolhida -- não é sugestão com botão como Perícia/Ferramenta/Equipamento,
// é concessão garantida (pedido do usuário: idioma de raça/antecedente não
// pode depender do jogador lembrar de clicar em "Adicionar"). Aqui só mostra
// o que já foi concedido, sem ação nenhuma. Escolha LIVRE de idioma
// (`languageChoice`) continua precisando do ChoicePicker -- essa sim é uma
// decisão do jogador, não dá pra automatizar.
function LanguageGrantSummary({ title, matched, onApplyChoice }) {
  if (!matched) return null;
  const hasFixed = Boolean(matched.languages?.trim());
  const hasChoice = Boolean(matched.languageChoice);
  if (!hasFixed && !hasChoice) return null;

  return (
    <div className="pericias-grant-summary">
      <h4>{title}</h4>
      {hasFixed && <p>Idiomas: {matched.languages}</p>}
      {hasChoice && (
        <ChoicePicker title="Idiomas" count={matched.languageChoice.count} from={LANGUAGES} onAdd={onApplyChoice} allowCustom />
      )}
    </div>
  );
}

export function StepIdiomas({ languages, onChange, raceMatch, backgroundMatch, appliers }) {
  return (
    <div className="wizard-step-idiomas">
      <LanguageGrantSummary title="Concedido pela Raça" matched={raceMatch} onApplyChoice={appliers.applyLanguageChoices} />
      <LanguageGrantSummary
        title="Concedido pelo Antecedente"
        matched={backgroundMatch}
        onApplyChoice={appliers.applyLanguageChoices}
      />
      <h3>Idiomas</h3>
      <TagListInput items={languages} onChange={onChange} placeholder="Ex: Élfico" addLabel="Adicionar idioma" />
    </div>
  );
}
