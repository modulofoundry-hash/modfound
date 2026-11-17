import { useParams } from "react-router-dom";
import { ClassGridPicker } from "./ClassGridPicker";

// Extraído de ClassesInput.jsx (variant="grid") pra ser reaproveitado pelo
// wizard de Level-Up também -- mesma regra: subclasse só aparece disponível
// quando o nível já alcançou `subclassLevel` da classe (as duas edições
// aparecem juntas no pool, sem filtro de `rulesMode`, ver ClassesInput.jsx).
export function SubclassPicker({ classData, subclassesData, level, value, selectedRules, onPick }) {
  const { profileId } = useParams();
  if (!classData) return <p className="field-hint">Escolha a classe primeiro.</p>;
  if ((level ?? 1) < (classData.subclassLevel ?? 1)) {
    return (
      <p className="field-hint">
        Subclasse disponível a partir do nível {classData.subclassLevel} de {classData.name}.
      </p>
    );
  }
  // `restrictedToProfile` (campo novo, opcional): homebrew trancado pra só
  // aparecer com um perfil específico ativo (ex: Tecnomancer/Nicolas) --
  // `useParams` funciona aqui porque este componente sempre renderiza dentro
  // da rota `/perfis/:profileId/...`, mesmo sem receber o id via prop.
  const options = subclassesData.filter(
    (s) => s.parentClass === classData.name && (!s.restrictedToProfile || s.restrictedToProfile === profileId),
  );
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
