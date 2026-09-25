import { useState } from "react";
import { ListEditor } from "../ListEditor";
import { EquipmentBrowser } from "../EquipmentBrowser";
import equipmentData from "../../data/content/equipment.json";

const CURRENCIES = [
  { key: "pp", label: "Platina" },
  { key: "gp", label: "Ouro" },
  { key: "ep", label: "Electro" },
  { key: "sp", label: "Prata" },
  { key: "cp", label: "Cobre" },
];

export function StepEquipamento({ currency, onChangeCurrency, equipment, onChangeEquipment }) {
  const [browserOpen, setBrowserOpen] = useState(false);

  function addEquipment(item) {
    onChangeEquipment([...equipment, { name: item.name, quantity: 1, equipped: false, attuned: false }]);
    setBrowserOpen(false);
  }

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
        allowAdd={false}
        fields={[
          { key: "name", label: "Item" },
          { key: "quantity", label: "Qtd", type: "number", default: 1 },
          { key: "equipped", label: "Equipado", type: "checkbox", default: false },
          { key: "attuned", label: "Sintonizado", type: "checkbox", default: false },
        ]}
      />
      <button type="button" onClick={() => setBrowserOpen(true)}>
        Adicionar item
      </button>
      {browserOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setBrowserOpen(false);
          }}
        >
          <div className="modal-panel modal-panel-wide" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Equipamento</h3>
              <button type="button" onClick={() => setBrowserOpen(false)}>
                Fechar
              </button>
            </div>
            <EquipmentBrowser items={equipmentData} onAdd={addEquipment} />
          </div>
        </div>
      )}
    </div>
  );
}
