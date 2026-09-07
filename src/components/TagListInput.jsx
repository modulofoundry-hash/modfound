const CUSTOM_VALUE = "__custom__";

// `options` (opcional) -- quando presente, cada linha vira uma LISTA DE SELEÇÃO
// (`<select>`) em vez de texto livre, com uma opção "Personalizado" que revela um
// campo de texto pra valor fora da lista (ex: idioma homebrew de campanha). Sem
// `options`, comportamento ORIGINAL preservado (texto livre) -- outros usos deste
// componente (StepPericias.jsx, NpcForm.jsx, FoundrySheetView.jsx) não passam essa
// prop e continuam exatamente iguais. Pedido do usuário: a escolha de idioma "solto"
// (fora do que Raça/Antecedente/regra padrão já concedem) também deve abrir uma
// lista de seleção em vez de exigir digitar o nome de cabeça.
function TagListRow({ value, options, placeholder, onChange }) {
  if (!options) {
    return <input type="text" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />;
  }

  const isCustom = value !== "" && !options.includes(value);
  const selectValue = value === "" ? "" : isCustom ? CUSTOM_VALUE : value;

  return (
    <>
      <select
        value={selectValue}
        onChange={(event) => {
          const next = event.target.value;
          onChange(next === CUSTOM_VALUE ? (isCustom ? value : "") : next);
        }}
      >
        <option value="">Escolha...</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        <option value={CUSTOM_VALUE}>Personalizado...</option>
      </select>
      {selectValue === CUSTOM_VALUE && (
        <input
          type="text"
          value={isCustom ? value : ""}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </>
  );
}

export function TagListInput({ items, options, onChange, placeholder, addLabel = "Adicionar" }) {
  function updateItem(index, value) {
    onChange(items.map((item, i) => (i === index ? value : item)));
  }

  function addItem() {
    onChange([...items, ""]);
  }

  function removeItem(index) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="tag-list">
      {items.map((value, index) => (
        <div className="tag-list-row" key={index}>
          <TagListRow value={value} options={options} placeholder={placeholder} onChange={(next) => updateItem(index, next)} />
          <button type="button" onClick={() => removeItem(index)}>
            Remover
          </button>
        </div>
      ))}
      <button type="button" onClick={addItem}>
        {addLabel}
      </button>
    </div>
  );
}
