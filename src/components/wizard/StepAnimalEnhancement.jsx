import { OriginTableBrowser } from "../OriginTableBrowser";

const COLUMNS = [
  { key: "name", label: "Opção" },
  {
    key: "description",
    label: "Efeito",
    render: (item) => (item.description || "").replace(/<[^>]+>/g, "").slice(0, 160),
  },
];

// 1 pick por slot (não N como StepMaestriaDeArma/StepEscolhasDeClasse) -- pool já
// vem pronto do slot (`animalEnhancementSlots`, com a exclusão do nível 1 já
// aplicada no pool do nível 5).
function SlotCard({ slot, optionalFeaturesData, chosenName, onPick, onClear }) {
  const pool = slot.pool.map((name) => optionalFeaturesData.find((f) => f.name === name)).filter(Boolean);
  return (
    <div className="melhoria-slot">
      <h4 className="melhoria-slot-title">Animal Enhancement — {slot.label}</h4>
      <div className="melhoria-feat-picker">
        {chosenName && (
          <p className="field-hint">
            Escolhido: <strong>{chosenName}</strong>{" "}
            <button type="button" onClick={() => onClear(slot.slotKey)}>
              remover
            </button>
          </p>
        )}
        {!chosenName && (
          <OriginTableBrowser
            items={pool}
            columns={COLUMNS}
            value={null}
            onPick={(item) => onPick(slot.slotKey, item.name)}
            searchPlaceholder="Buscar opção de Animal Enhancement..."
          />
        )}
      </div>
    </div>
  );
}

// `slots` já vem pronto (animalEnhancementSlots): 1 card sempre (nível 1), mais 1
// a partir do nível 5. `reversedChoices` (reversedAnimalEnhancementChoices) só
// aparece pra ficha que veio de "Enviar pro site" -- o Foundry não guarda em qual
// nível cada Item foi concedido, então fica numa lista à parte, sem picker (só
// remover), em vez de forçada num dos 2 slots normais.
export function StepAnimalEnhancement({ slots, animalEnhancementChoices, reversedChoices, optionalFeaturesData, onPick, onClear }) {
  if (!slots.length && !reversedChoices.length) {
    return <p className="field-hint">Este personagem não é Simic Hybrid (GGR) — sem Animal Enhancement pra escolher.</p>;
  }
  return (
    <div className="wizard-step-animal-enhancement">
      {slots.map((slot) => (
        <SlotCard
          key={slot.slotKey}
          slot={slot}
          optionalFeaturesData={optionalFeaturesData}
          chosenName={animalEnhancementChoices.find((c) => c.slotKey === slot.slotKey)?.name}
          onPick={onPick}
          onClear={onClear}
        />
      ))}
      {reversedChoices.length > 0 && (
        <div className="melhoria-slot">
          <h4 className="melhoria-slot-title">Animal Enhancement — importado do Foundry</h4>
          <p className="field-hint">
            Trazido de volta via "Enviar pro site" — o Foundry não guarda em qual nível cada opção foi escolhida, só o conjunto.
          </p>
          {reversedChoices.map((choice, i) => (
            <p key={`${choice.name}-${i}`} className="field-hint">
              <strong>{choice.name}</strong>{" "}
              <button type="button" onClick={() => onClear("reversed", choice.name)}>
                remover
              </button>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
