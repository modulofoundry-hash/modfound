import { ClassGridPicker } from "./ClassGridPicker";

// Extraído de ClassesInput.jsx (variant="grid") pra ser reaproveitado pelo
// wizard de Level-Up também -- mesma regra: subclasse só aparece disponível
// quando o nível já alcançou `subclassLevel` da classe (as duas edições
// aparecem juntas no pool, sem filtro de `rulesMode`, ver ClassesInput.jsx).
export function SubclassPicker({ classData, subclassesData, level, value, selectedRules, onPick }) {
  if (!classData) return <p className="field-hint">Escolha a classe primeiro.</p>;
  if ((level ?? 1) < (classData.subclassLevel ?? 1)) {
    return (
      <p className="field-hint">
        Subclasse disponível a partir do nível {classData.subclassLevel} de {classData.name}.
      </p>
    );
  }
  const options = subclassesData.filter((s) => s.parentClass === classData.name);
  return (
    <ClassGridPicker
      items={options}
      value={value}
      selectedRules={selectedRules}
      onPick={onPick}
      emptyMessage="Nenhuma subclasse encontrada pra essa classe."
    />
  );
}
