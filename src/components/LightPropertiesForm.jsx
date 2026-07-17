export function LightPropertiesForm({ light, onChange, onRemove }) {
  function set(key, value) {
    onChange({ ...light, [key]: value });
  }

  function setConfig(key, value) {
    onChange({ ...light, config: { ...light.config, [key]: value } });
  }

  function setConfigNested(group, key, value) {
    onChange({ ...light, config: { ...light.config, [group]: { ...light.config[group], [key]: value } } });
  }

  return (
    <div className="placeable-props">
      <div className="placeable-props-grid">
        <label>
          Posição X
          <input type="number" value={light.x} onChange={(e) => set("x", Number(e.target.value))} />
        </label>
        <label>
          Posição Y
          <input type="number" value={light.y} onChange={(e) => set("y", Number(e.target.value))} />
        </label>
        <label>
          Rotação
          <input type="number" value={light.rotation} onChange={(e) => set("rotation", Number(e.target.value))} />
        </label>
        <label>
          Elevação
          <input type="number" value={light.elevation} onChange={(e) => set("elevation", Number(e.target.value))} />
        </label>
        <label className="skill-expertise">
          <input type="checkbox" checked={light.walls} onChange={(e) => set("walls", e.target.checked)} />
          Bloqueada por paredes
        </label>
        <label className="skill-expertise">
          <input type="checkbox" checked={light.vision} onChange={(e) => set("vision", e.target.checked)} />
          Fornece visão
        </label>
        <label className="skill-expertise">
          <input type="checkbox" checked={light.hidden} onChange={(e) => set("hidden", e.target.checked)} />
          Oculta
        </label>
      </div>

      <div className="placeable-props-grid">
        <label>
          Raio Tênue (dim)
          <input type="number" value={light.config.dim} onChange={(e) => setConfig("dim", Number(e.target.value))} />
        </label>
        <label>
          Raio Brilhante (bright)
          <input
            type="number"
            value={light.config.bright}
            onChange={(e) => setConfig("bright", Number(e.target.value))}
          />
        </label>
        <label>
          Ângulo (360 = todas direções)
          <input type="number" value={light.config.angle} onChange={(e) => setConfig("angle", Number(e.target.value))} />
        </label>
        <label>
          Cor
          <input type="color" value={light.config.color} onChange={(e) => setConfig("color", e.target.value)} />
        </label>
        <label>
          Alpha
          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={light.config.alpha}
            onChange={(e) => setConfig("alpha", Number(e.target.value))}
          />
        </label>
        <label>
          Luminosidade
          <input
            type="number"
            step="0.05"
            min="-1"
            max="1"
            value={light.config.luminosity}
            onChange={(e) => setConfig("luminosity", Number(e.target.value))}
          />
        </label>
        <label>
          Saturação
          <input
            type="number"
            step="0.05"
            min="-1"
            max="1"
            value={light.config.saturation}
            onChange={(e) => setConfig("saturation", Number(e.target.value))}
          />
        </label>
        <label>
          Contraste
          <input
            type="number"
            step="0.05"
            min="-1"
            max="1"
            value={light.config.contrast}
            onChange={(e) => setConfig("contrast", Number(e.target.value))}
          />
        </label>
        <label>
          Sombras
          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={light.config.shadows}
            onChange={(e) => setConfig("shadows", Number(e.target.value))}
          />
        </label>
        <label>
          Atenuação
          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={light.config.attenuation}
            onChange={(e) => setConfig("attenuation", Number(e.target.value))}
          />
        </label>
        <label>
          Prioridade
          <input
            type="number"
            value={light.config.priority}
            onChange={(e) => setConfig("priority", Number(e.target.value))}
          />
        </label>
        <label className="skill-expertise">
          <input
            type="checkbox"
            checked={light.config.negative}
            onChange={(e) => setConfig("negative", e.target.checked)}
          />
          Luz negativa (escurece)
        </label>
      </div>

      <div className="placeable-props-grid">
        <label>
          Escuridão mínima
          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={light.config.darkness.min}
            onChange={(e) => setConfigNested("darkness", "min", Number(e.target.value))}
          />
        </label>
        <label>
          Escuridão máxima
          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={light.config.darkness.max}
            onChange={(e) => setConfigNested("darkness", "max", Number(e.target.value))}
          />
        </label>
        <label>
          Tipo de animação
          <input
            type="text"
            placeholder="Ex: torch, pulse, dome"
            value={light.config.animation.type}
            onChange={(e) => setConfigNested("animation", "type", e.target.value)}
          />
        </label>
        <label>
          Velocidade da animação
          <input
            type="number"
            min="0"
            max="10"
            value={light.config.animation.speed}
            onChange={(e) => setConfigNested("animation", "speed", Number(e.target.value))}
          />
        </label>
        <label>
          Intensidade da animação
          <input
            type="number"
            min="0"
            max="10"
            value={light.config.animation.intensity}
            onChange={(e) => setConfigNested("animation", "intensity", Number(e.target.value))}
          />
        </label>
        <label className="skill-expertise">
          <input
            type="checkbox"
            checked={light.config.animation.reverse}
            onChange={(e) => setConfigNested("animation", "reverse", e.target.checked)}
          />
          Inverter animação
        </label>
      </div>

      <button type="button" className="list-editor-remove" onClick={onRemove}>
        Remover luz
      </button>
    </div>
  );
}
