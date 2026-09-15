import { ABILITY_LABELS } from "../schema/character";
import { ABILITY_IMAGES } from "../data/abilityImages";

// Nome + ilustração de um atributo -- reaproveitado pelos 4 métodos de
// definir atributo (Array/Compra por Pontos/Rolagem/Manual, ver
// StepAtributos.jsx/AbilitiesInput.jsx), todos compartilhando a mesma
// `.abilities-grid`, pra ter a mesma "carta" visual em qualquer método.
export function AbilityIconLabel({ ability }) {
  return (
    <span className="ability-icon-label">
      <img className="ability-icon" src={ABILITY_IMAGES[ability]} alt="" />
      <span className="ability-icon-name">{ABILITY_LABELS[ability]}</span>
    </span>
  );
}
