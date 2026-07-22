import { ALIGNMENTS } from "../../schema/character";

const APPEARANCE_FIELDS = [
  { key: "gender", label: "Gênero" },
  { key: "age", label: "Idade" },
  { key: "height", label: "Altura" },
  { key: "weight", label: "Peso" },
  { key: "eyes", label: "Olhos" },
  { key: "hair", label: "Cabelo" },
  { key: "skin", label: "Pele" },
  { key: "faith", label: "Fé" },
];

export function StepIdentidade({ character, set, setNested }) {
  return (
    <div className="wizard-step-identidade">
      <label>
        <span className="wizard-field-label">Nome</span>
        <input type="text" value={character.name} onChange={(e) => set("name", e.target.value)} />
      </label>
      <label>
        <span className="wizard-field-label">Link do retrato (ficha)</span>
        <input type="text" value={character.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} />
      </label>
      <label>
        <span className="wizard-field-label">Link do token (mapa)</span>
        <input
          type="text"
          placeholder="Deixe em branco pra usar o mesmo do retrato"
          value={character.tokenImageUrl}
          onChange={(e) => set("tokenImageUrl", e.target.value)}
        />
      </label>
      <label>
        <span className="wizard-field-label">Alinhamento</span>
        <select value={character.alignment} onChange={(e) => set("alignment", e.target.value)}>
          <option value="">—</option>
          {ALIGNMENTS.map((alignment) => (
            <option key={alignment} value={alignment}>
              {alignment}
            </option>
          ))}
        </select>
      </label>

      <h3>Personalidade</h3>
      <label>
        <span className="wizard-field-label">Traço de Personalidade</span>
        <textarea value={character.personality.trait} onChange={(e) => setNested("personality", "trait", e.target.value)} />
      </label>
      <label>
        <span className="wizard-field-label">Ideal</span>
        <textarea value={character.personality.ideal} onChange={(e) => setNested("personality", "ideal", e.target.value)} />
      </label>
      <label>
        <span className="wizard-field-label">Vínculo</span>
        <textarea value={character.personality.bond} onChange={(e) => setNested("personality", "bond", e.target.value)} />
      </label>
      <label>
        <span className="wizard-field-label">Defeito</span>
        <textarea value={character.personality.flaw} onChange={(e) => setNested("personality", "flaw", e.target.value)} />
      </label>

      <h3>Aparência</h3>
      {APPEARANCE_FIELDS.map((field) => (
        <label key={field.key}>
          <span className="wizard-field-label">{field.label}</span>
          <input
            type="text"
            value={character.appearance[field.key]}
            onChange={(e) => setNested("appearance", field.key, e.target.value)}
          />
        </label>
      ))}
      <label>
        <span className="wizard-field-label">Descrição física</span>
        <textarea
          value={character.appearance.description}
          onChange={(e) => setNested("appearance", "description", e.target.value)}
        />
      </label>

      <h3>Notas</h3>
      <label>
        <span className="wizard-field-label">Notas</span>
        <textarea value={character.notes} onChange={(e) => set("notes", e.target.value)} />
      </label>
    </div>
  );
}
