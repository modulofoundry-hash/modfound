export function ListEditor({ label, items, fields, onChange, addLabel = "Adicionar" }) {
  function updateItem(index, key, value) {
    onChange(items.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  }

  function addItem() {
    const empty = Object.fromEntries(fields.map((f) => [f.key, f.default ?? ""]));
    onChange([...items, empty]);
  }

  function removeItem(index) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="list-editor">
      {label && (
        <div className="list-editor-header">
          <span>{label}</span>
        </div>
      )}
      {items.map((item, index) => (
        <div className="list-editor-row" key={index}>
          {fields.map((field) => (
            <label key={field.key} className="list-editor-field">
              {field.label}
              {field.type === "checkbox" ? (
                <input
                  type="checkbox"
                  checked={!!item[field.key]}
                  onChange={(event) => updateItem(index, field.key, event.target.checked)}
                />
              ) : (
                <input
                  type={field.type ?? "text"}
                  value={item[field.key] ?? ""}
                  onChange={(event) =>
                    updateItem(
                      index,
                      field.key,
                      field.type === "number" ? Number(event.target.value) : event.target.value,
                    )
                  }
                />
              )}
            </label>
          ))}
          <button type="button" className="list-editor-remove" onClick={() => removeItem(index)}>
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
