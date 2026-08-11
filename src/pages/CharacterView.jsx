import { FoundrySheetView } from "../components/FoundrySheetView";
import { ChatPanel } from "../components/ChatPanel";

// Tela de "ver personagem" — aparece ao clicar no card na lista. Mesmo visual
// estilo Foundry da Confirmação do wizard (FoundrySheetView), reaproveitado sem
// duplicar. A FoundrySheetView agora tem seu próprio toggle "Editar" (como a
// ficha real do Foundry) pra edição rápida in-loco via `onSave`; "Assistente
// completo" continua levando pro wizard de várias etapas, pra mudanças
// estruturais (trocar raça/classe, escolher magias novas etc.) que não fazem
// sentido como campo solto na ficha.
//
// O chat mora AQUI (dentro da ficha aberta), não num painel global -- toda
// mensagem/rolagem já sai falada por ESTE personagem automaticamente, sem
// precisar de um seletor de "falando como". Rola de verdade no Foundry do
// outro lado (ver module/scripts/live/liveRollBridge.js).
export function CharacterView({ character, profileId, onEdit, onLevelUp, onBack, onSave }) {
  return (
    <div>
      <div className="sheet-list-header">
        <button type="button" onClick={onBack}>
          ← Voltar
        </button>
        <button type="button" onClick={onEdit}>
          Assistente completo
        </button>
        <button type="button" onClick={onLevelUp}>
          Subir de Nível
        </button>
      </div>
      <FoundrySheetView character={character} onSave={onSave} profileId={profileId} />
      <ChatPanel profileId={profileId} character={character} />
    </div>
  );
}
