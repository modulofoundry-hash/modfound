export function TagListInput({ items, onChange, placeholder, addLabel = "Adicionar" }) {
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
          <input
            type="text"
            value={value}
            placeholder={placeholder}
            onChange={(event) => updateItem(index, event.target.value)}
          />
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
