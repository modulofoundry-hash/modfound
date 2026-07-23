import { useState } from "react";
import { ClassGridPicker } from "../ClassGridPicker";

const ALL_LEVELS = Array.from({ length: 20 }, (_, i) => i + 1);

// Nome da(s) feature(s) concedida(s) NESTE nível — prefere a feature da
// SUBCLASSE quando ela contribui algo nesse nível (evita mostrar redundante
// "Martial Archetype, Combat Superiority": a subclasse já é mais específica
// que o placeholder genérico da classe-mãe pro mesmo nível, ver
// content-database.md). Sem subclasse escolhida ainda, só a classe conta —
// inclusive o próprio placeholder ("Martial Archetype"/"Subclass feature"),
// que já avisa "escolha sua subclasse aqui" sozinho.
function featureNamesAtLevel(classData, subclassData, level) {
  const subclassNames = (subclassData?.features ?? []).filter((f) => f.level === level).map((f) => f.name);
  if (subclassNames.length) return subclassNames;
  return (classData?.features ?? []).filter((f) => f.level === level).map((f) => f.name);
}

function ClassLevelTable({ row, index, classData, subclassData, originalLevel, maxAllowed, onSetLevel }) {
  const currentLevel = row.level ?? 0;
  return (
    <div className="levelup-class-table">
      <h4>
        {row.name}
        {row.subclass ? ` — ${row.subclass}` : ""} <span className="field-hint">(atual: nível {originalLevel})</span>
      </h4>
      <table className="levelup-levels-table">
        <thead>
          <tr>
            <th></th>
            <th>Nível</th>
            <th>Features</th>
          </tr>
        </thead>
        <tbody>
          {ALL_LEVELS.map((level) => {
            const attained = level <= originalLevel;
            const checked = level <= currentLevel;
            const disabled = attained || level > maxAllowed;
            const names = featureNamesAtLevel(classData, subclassData, level);
            return (
              <tr key={level} className={attained ? "levelup-row-attained" : ""}>
                <td>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => onSetLevel(index, checked ? level - 1 : level)}
                  />
                </td>
                <td>{level}</td>
                <td>{names.length ? names.join(", ") : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// `classes`/`classMatches`/`originalLevels` são index-alinhados. `maxAllowed`
// por linha é calculado aqui (não recebido de fora) porque depende do total
// corrente de TODAS as classes -- teto de nível 20 somando toda classe do
// personagem, nunca só da linha em questão.
export function StepSelecionarNiveis({ classes, originalLevels, classMatches, addableClasses, onSetLevel, onAddClass }) {
  const [addOpen, setAddOpen] = useState(false);
  const totalLevel = classes.reduce((sum, row) => sum + (row.level ?? 0), 0);

  return (
    <div className="wizard-step-selecionar-niveis">
      <p className={`field-hint${totalLevel >= 20 ? " field-hint-warn" : ""}`}>Nível total do personagem: {totalLevel}/20</p>
      {classes.map((row, index) => {
        const rowLevel = row.level ?? 0;
        const maxAllowed = Math.min(20, 20 - (totalLevel - rowLevel));
        return (
          <ClassLevelTable
            key={index}
            row={row}
            index={index}
            classData={classMatches[index]?.classData}
            subclassData={classMatches[index]?.subclassData}
            originalLevel={originalLevels[index] ?? 0}
            maxAllowed={maxAllowed}
            onSetLevel={onSetLevel}
          />
        );
      })}
      <button type="button" onClick={() => setAddOpen(true)} disabled={totalLevel >= 20}>
        Adicionar classe (multiclasse)
      </button>
      {addOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAddOpen(false);
          }}
        >
          <div className="modal-panel" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Adicionar classe</h3>
              <button type="button" onClick={() => setAddOpen(false)}>
                Fechar
              </button>
            </div>
            <ClassGridPicker
              items={addableClasses}
              value={null}
              onPick={(item) => {
                onAddClass(item);
                setAddOpen(false);
              }}
              renderMeta={(item) => `Dado de vida: ${item.hitDie}`}
              emptyMessage="Nenhuma classe nova disponível (o personagem já tem todas)."
            />
          </div>
        </div>
      )}
    </div>
  );
}
