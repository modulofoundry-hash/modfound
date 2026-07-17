import { SourceItemPicker } from "./SourceItemPicker";
import { EquipmentSlots } from "./EquipmentSlots";
import { ChoicePicker } from "./ChoicePicker";

export function ClassesInput({ classes, classesData, onChange, onApplyEquipment, onApplySkills }) {
  function updateRow(index, patch) {
    onChange(classes.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    onChange([...classes, { name: "", subclass: "", level: 1 }]);
  }

  function removeRow(index) {
    onChange(classes.filter((_, i) => i !== index));
  }

  return (
    <div className="classes-input">
      {classes.map((row, index) => {
        const matched = classesData.find((c) => c.name === row.name);
        const subclassOptions =
          matched?.subclasses.map((s) => ({ name: s.name, source: s.source })) ?? [];

        return (
          <div key={index} className="classes-input-row">
            <div className="list-editor-row">
              <label className="list-editor-field">
                Classe
                <SourceItemPicker
                  items={classesData}
                  value={row.name}
                  onChange={(text) => updateRow(index, { name: text })}
                  placeholder="Ex: Bárbaro"
                />
              </label>
              <label className="list-editor-field">
                Subclasse
                <SourceItemPicker
                  items={subclassOptions}
                  value={row.subclass}
                  onChange={(text) => updateRow(index, { subclass: text })}
                  placeholder={matched ? "Buscar subclasse..." : "Escolha a classe primeiro"}
                />
              </label>
              <label className="list-editor-field">
                Nível
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={row.level}
                  onChange={(event) => updateRow(index, { level: Number(event.target.value) })}
                />
              </label>
              <button type="button" className="list-editor-remove" onClick={() => removeRow(index)}>
                Remover
              </button>
            </div>

            {matched && (
              <div className="origin-suggestions">
                <p>
                  Dado de vida: {matched.hitDie} · Testes de resistência com proficiência:{" "}
                  {matched.savingThrows.join(", ")}
                </p>
                {matched.skillChoice && (
                  <ChoicePicker
                    title="Perícias"
                    count={matched.skillChoice.count}
                    from={matched.skillChoice.from}
                    onAdd={onApplySkills}
                  />
                )}
                <EquipmentSlots slots={matched.equipmentSlots} onAdd={onApplyEquipment} />
              </div>
            )}
          </div>
        );
      })}
      <button type="button" onClick={addRow}>
        Adicionar classe
      </button>
    </div>
  );
}
