import { useEffect, useRef } from "react";
import { SceneCanvasEditor } from "./SceneCanvasEditor";

export function ScenePreviewEditor({ scene, onChange, open, onOpen, onClose }) {
  // Só fecha se o mousedown E o mouseup caírem no próprio backdrop — evita fechar
  // quando um drag (ex: redimensionar o painel) termina "fora" dele.
  const mouseDownOnBackdrop = useRef(false);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <>
      <div className="scene-preview">
        {scene.backgroundUrl ? (
          <img src={scene.backgroundUrl} alt="" className="scene-preview-image" />
        ) : (
          <div className="scene-preview-placeholder">Sem imagem</div>
        )}
        <button type="button" className="scene-preview-edit-btn" onClick={onOpen}>
          Editar paredes e luzes
        </button>
      </div>
      <p className="scene-preview-caption">
        {scene.walls.length} parede(s), {scene.lights.length} luz(es)
      </p>

      {open && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            mouseDownOnBackdrop.current = event.target === event.currentTarget;
          }}
          onClick={(event) => {
            if (mouseDownOnBackdrop.current && event.target === event.currentTarget) onClose();
          }}
        >
          <div className="modal-panel modal-panel-wide" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Paredes e Luzes</h3>
              <button type="button" onClick={onClose}>
                Fechar
              </button>
            </div>
            <SceneCanvasEditor scene={scene} onChange={onChange} />
          </div>
        </div>
      )}
    </>
  );
}
