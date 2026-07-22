// Extraído de CharacterForm.jsx (fieldset "Sentidos") pra ser reaproveitado
// no wizard também.
export function SensesInput({ senses, onChange }) {
  function set(key, value) {
    onChange({ ...senses, [key]: value });
  }

  return (
    <div className="senses-input">
      <p className="field-hint">
        Visão no Escuro já vem preenchida sozinha ao escolher a Raça (extraída do traço
        "Darkvision" dela) — ajuste aqui se algum Talento/Antecedente conceder mais.
        Os outros sentidos não têm fonte automática, preencha manualmente o que conceder.
      </p>
      <label>
        <span className="wizard-field-label">Visão no Escuro</span>
        <input type="number" value={senses.darkvision} onChange={(e) => set("darkvision", Number(e.target.value))} />
      </label>
      <label>
        <span className="wizard-field-label">Visão Cega</span>
        <input type="number" value={senses.blindsight} onChange={(e) => set("blindsight", Number(e.target.value))} />
      </label>
      <label>
        <span className="wizard-field-label">Percepção por Tremor</span>
        <input type="number" value={senses.tremorsense} onChange={(e) => set("tremorsense", Number(e.target.value))} />
      </label>
      <label>
        <span className="wizard-field-label">Visão Verdadeira</span>
        <input type="number" value={senses.truesight} onChange={(e) => set("truesight", Number(e.target.value))} />
      </label>
      <label>
        <span className="wizard-field-label">Unidade</span>
        <input type="text" placeholder="ft" value={senses.units} onChange={(e) => set("units", e.target.value)} />
      </label>
      <label>
        <span className="wizard-field-label">Sentido especial (texto livre)</span>
        <input type="text" value={senses.special} onChange={(e) => set("special", e.target.value)} />
      </label>
    </div>
  );
}
