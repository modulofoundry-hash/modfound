import { FoundrySheetView } from "../components/FoundrySheetView";

// Tela de "ver personagem" — aparece ao clicar no card na lista, antes de
// entrar no modo de edição. Mesmo visual estilo Foundry da Confirmação do
// wizard (FoundrySheetView), reaproveitado sem duplicar.
export function CharacterView({ character, onEdit, onBack }) {
  return (
    <div>
      <div className="sheet-list-header">
        <button type="button" onClick={onBack}>
          ← Voltar
        </button>
        <button type="button" onClick={onEdit}>
          Editar
        </button>
      </div>
      <FoundrySheetView character={character} />
    </div>
  );
}
