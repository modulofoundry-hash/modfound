import { useState } from "react";
import { createEmptyScene, FOG_EXPLORATION_MODES } from "../schema/scene";
import { ScenePreviewEditor } from "./ScenePreviewEditor";

export function SceneForm({ initialValue, onSubmit, onCancel }) {
  // Mesma proteção de CharacterForm.jsx: cena salva antes de um campo novo
  // existir no schema não tem essa chave — mescla com os padrões pra não
  // quebrar a tela ao abrir pra editar uma cena antiga.
  const [scene, setScene] = useState(() => ({ ...createEmptyScene(), ...initialValue }));
  const [editorOpen, setEditorOpen] = useState(false);

  function set(key, value) {
    setScene((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(scene);
  }

  return (
    <form className="sheet-form" onSubmit={handleSubmit}>
      <fieldset>
        <legend>Basics</legend>
        <label>
          Scene Name
          <input type="text" required value={scene.name} onChange={(e) => set("name", e.target.value)} />
        </label>
        <label>
          Link da imagem de fundo
          <input
            type="text"
            value={scene.backgroundUrl}
            onChange={(e) => set("backgroundUrl", e.target.value)}
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>Grid</legend>
        <label>
          Scene Dimensions — Largura (px)
          <input type="number" value={scene.width} onChange={(e) => set("width", Number(e.target.value))} />
        </label>
        <label>
          Scene Dimensions — Altura (px)
          <input type="number" value={scene.height} onChange={(e) => set("height", Number(e.target.value))} />
        </label>
        <label>
          Tamanho do grid (px por quadrado)
          <input
            type="number"
            value={scene.gridSize}
            onChange={(e) => set("gridSize", Number(e.target.value))}
          />
        </label>
        <label>
          Distância do grid
          <input
            type="number"
            value={scene.gridDistance}
            onChange={(e) => set("gridDistance", Number(e.target.value))}
          />
        </label>
        <label>
          Unidade do grid
          <input
            type="text"
            placeholder="Ex: ft"
            value={scene.gridUnits}
            onChange={(e) => set("gridUnits", e.target.value)}
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>Visibility</legend>
        <label className="skill-expertise">
          <input
            type="checkbox"
            checked={scene.tokenVision}
            onChange={(e) => set("tokenVision", e.target.checked)}
          />
          Token Vision
        </label>
        <label className="skill-expertise">
          <input
            type="checkbox"
            checked={scene.globalLight}
            onChange={(e) => set("globalLight", e.target.checked)}
          />
          Global Illumination — Enabled
        </label>
        <label>
          Fog of War
          <select value={scene.fogExploration} onChange={(e) => set("fogExploration", e.target.value)}>
            {FOG_EXPLORATION_MODES.map((mode) => (
              <option key={mode.key} value={mode.key}>
                {mode.label}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      <fieldset>
        <legend>Paredes e Luzes</legend>
        <ScenePreviewEditor
          scene={scene}
          onChange={(patch) => setScene((prev) => ({ ...prev, ...patch }))}
          open={editorOpen}
          onOpen={() => setEditorOpen(true)}
          onClose={() => setEditorOpen(false)}
        />
      </fieldset>

      <div className="sheet-form-actions">
        <button type="submit">Salvar</button>
        <button type="button" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
