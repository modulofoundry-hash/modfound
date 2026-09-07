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

// Regra base do PHB 2024 (Capítulo 1, "Languages"): TODO personagem já começa
// sabendo Comum + 2 idiomas à escolha, independente de Raça/Antecedente (que no
// 2024 não concedem mais idioma nenhum sozinhos, diferente do 2014) -- achado
// revisando a pedido do usuário: essa concessão base não existia em lugar
// nenhum do wizard, então um personagem 2024 sem Raça/Antecedente/talento que
// conceda idioma ficava com ZERO idiomas, mesmo tendo direito a 3 (Comum +2)
// só por existir. "Comum" em si é aplicado sozinho (mesmo padrão de idioma
// FIXO de Raça/Antecedente, ver comentário no topo do arquivo) assim que a
// edição 2024 é escolhida na etapa Regras (`handleRulesModeChange`,
// CharacterCreationWizard.jsx) -- aqui só falta a escolha dos +2, e tirado da
// lista pra não competir com o que já está garantido.
function Default2024LanguageChoice({ rulesMode, onApplyChoice }) {
  if (rulesMode !== "2024") return null;
  const pool = LANGUAGES.filter((l) => l !== "Common");
  return (
    <div className="pericias-grant-summary">
      <h4>Padrão do 2024</h4>
      <p>Idiomas: Common</p>
      <ChoicePicker title="Idiomas" count={2} from={pool} onAdd={onApplyChoice} allowCustom />
    </div>
  );
}

export function StepIdiomas({ languages, onChange, raceMatch, backgroundMatch, rulesMode, appliers }) {
  return (
    <div className="wizard-step-idiomas">
      <Default2024LanguageChoice rulesMode={rulesMode} onApplyChoice={appliers.applyLanguageChoices} />
      <LanguageGrantSummary title="Concedido pela Raça" matched={raceMatch} onApplyChoice={appliers.applyLanguageChoices} />
      <LanguageGrantSummary
        title="Concedido pelo Antecedente"
        matched={backgroundMatch}
        onApplyChoice={appliers.applyLanguageChoices}
      />
      <h3>Idiomas</h3>
      <TagListInput
        items={languages}
        options={LANGUAGES}
        onChange={onChange}
        placeholder="Digite o idioma..."
        addLabel="Adicionar idioma"
      />
    </div>
  );
}
