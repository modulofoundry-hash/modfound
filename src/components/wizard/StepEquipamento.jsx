import { ListEditor } from "../ListEditor";

const CURRENCIES = [
  { key: "pp", label: "Platina" },
  { key: "gp", label: "Ouro" },
  { key: "ep", label: "Electro" },
  { key: "sp", label: "Prata" },
  { key: "cp", label: "Cobre" },
];

export function StepEquipamento({ currency, onChangeCurrency, equipment, onChangeEquipment }) {
  return (
    <div className="wizard-step-equipamento">
      <h3>Dinheiro</h3>
      <div className="currency-grid">
        {CURRENCIES.map((c) => (
          <label key={c.key}>
            {c.label}
            <input
              type="number"
              value={currency[c.key]}
              onChange={(event) => onChangeCurrency({ ...currency, [c.key]: Number(event.target.value) })}
            />
          </label>
        ))}
      </div>
      <h3>Equipamento</h3>
      <ListEditor
        items={equipment}
        onChange={onChangeEquipment}
        addLabel="Adicionar item"
        fields={[
          { key: "name", label: "Item" },
          { key: "quantity", label: "Qtd", type: "number", default: 1 },
        ]}
      />
    </div>
  );
}
