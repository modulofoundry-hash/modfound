import { DIRECTIONS, DOOR_STATES, DOOR_TYPES, SENSE_TYPES } from "../schema/wall";

export function WallPropertiesForm({ wall, onChange, onRemove }) {
  function set(key, value) {
    onChange({ ...wall, [key]: value });
  }

  function setThreshold(key, value) {
    onChange({ ...wall, threshold: { ...wall.threshold, [key]: value } });
  }

  return (
    <div className="placeable-props">
      <div className="placeable-props-grid">
        <label>
          Luz
          <select value={wall.light} onChange={(e) => set("light", e.target.value)}>
            {SENSE_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Visão
          <select value={wall.sight} onChange={(e) => set("sight", e.target.value)}>
            {SENSE_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Som
          <select value={wall.sound} onChange={(e) => set("sound", e.target.value)}>
            {SENSE_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Movimento
          <select value={wall.move} onChange={(e) => set("move", e.target.value)}>
            {SENSE_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Direção
          <select value={wall.dir} onChange={(e) => set("dir", e.target.value)}>
            {DIRECTIONS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Porta
          <select value={wall.door} onChange={(e) => set("door", e.target.value)}>
            {DOOR_TYPES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        {wall.door !== "none" && (
          <label>
            Estado da porta
            <select value={wall.ds} onChange={(e) => set("ds", e.target.value)}>
              {DOOR_STATES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="placeable-props-grid">
        <label className="skill-expertise">
          <input
            type="checkbox"
            checked={wall.threshold.attenuation}
            onChange={(e) => setThreshold("attenuation", e.target.checked)}
          />
          Atenuação de proximidade
        </label>
        <label>
          Limite de luz (distância)
          <input
            type="number"
            value={wall.threshold.light ?? ""}
            onChange={(e) => setThreshold("light", e.target.value === "" ? null : Number(e.target.value))}
          />
        </label>
        <label>
          Limite de visão (distância)
          <input
            type="number"
            value={wall.threshold.sight ?? ""}
            onChange={(e) => setThreshold("sight", e.target.value === "" ? null : Number(e.target.value))}
          />
        </label>
        <label>
          Limite de som (distância)
          <input
            type="number"
            value={wall.threshold.sound ?? ""}
            onChange={(e) => setThreshold("sound", e.target.value === "" ? null : Number(e.target.value))}
          />
        </label>
      </div>

      <button type="button" className="list-editor-remove" onClick={onRemove}>
        Remover parede
      </button>
    </div>
  );
}
