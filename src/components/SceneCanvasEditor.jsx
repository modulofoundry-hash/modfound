import { useEffect, useRef, useState } from "react";
import { createLight } from "../schema/light";
import { createWall } from "../schema/wall";
import { WallPropertiesForm } from "./WallPropertiesForm";
import { LightPropertiesForm } from "./LightPropertiesForm";

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 5;

function getSvgPoint(svg, clientX, clientY) {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const transformed = point.matrixTransform(ctm.inverse());
  return { x: Math.round(transformed.x), y: Math.round(transformed.y) };
}

export function SceneCanvasEditor({ scene, onChange }) {
  const svgRef = useRef(null);
  const viewportRef = useRef(null);
  const [tool, setTool] = useState("select");
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [selectedWall, setSelectedWall] = useState(null);
  const [selectedLight, setSelectedLight] = useState(null);
  const [zoom, setZoom] = useState(1);

  // O wheel do React é passive por padrão (preventDefault não funciona nele),
  // então precisa de listener nativo pra impedir o scroll da página ao dar zoom.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    function handleWheel(event) {
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
      setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)));
    }
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  const displayWidth = scene.width * zoom;
  const displayHeight = scene.height * zoom;

  function selectTool(nextTool) {
    setTool(nextTool);
    setDrawingPoints([]);
  }

  function handleSvgClick(event) {
    if (tool === "select") return;
    const point = getSvgPoint(svgRef.current, event.clientX, event.clientY);

    if (tool === "light") {
      onChange({ walls: scene.walls, lights: [...scene.lights, createLight(point.x, point.y)] });
      return;
    }

    if (tool === "wall") {
      if (drawingPoints.length > 0) {
        const last = drawingPoints[drawingPoints.length - 1];
        const wall = createWall([last.x, last.y, point.x, point.y]);
        onChange({ walls: [...scene.walls, wall], lights: scene.lights });
      }
      setDrawingPoints((prev) => [...prev, point]);
    }
  }

  function updateWall(index, wall) {
    const walls = scene.walls.map((w, i) => (i === index ? wall : w));
    onChange({ walls, lights: scene.lights });
  }

  function removeWall(index) {
    onChange({ walls: scene.walls.filter((_, i) => i !== index), lights: scene.lights });
    setSelectedWall(null);
  }

  function updateLight(index, light) {
    const lights = scene.lights.map((l, i) => (i === index ? light : l));
    onChange({ walls: scene.walls, lights });
  }

  function removeLight(index) {
    onChange({ walls: scene.walls, lights: scene.lights.filter((_, i) => i !== index) });
    setSelectedLight(null);
  }

  return (
    <div className="canvas-editor">
      <div className="canvas-toolbar">
        <button
          type="button"
          className={tool === "select" ? "tool-active" : ""}
          onClick={() => selectTool("select")}
        >
          Selecionar
        </button>
        <button type="button" className={tool === "wall" ? "tool-active" : ""} onClick={() => selectTool("wall")}>
          Desenhar Parede
        </button>
        {tool === "wall" && drawingPoints.length > 0 && (
          <button type="button" onClick={() => setDrawingPoints([])}>
            Finalizar parede
          </button>
        )}
        <button type="button" className={tool === "light" ? "tool-active" : ""} onClick={() => selectTool("light")}>
          Colocar Luz
        </button>
        <span className="canvas-zoom-label">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom(1)}>
          Redefinir zoom
        </button>
      </div>

      <div ref={viewportRef} className="canvas-viewport">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${scene.width} ${scene.height}`}
          style={{ width: displayWidth, height: displayHeight, cursor: tool === "select" ? "default" : "crosshair" }}
          className="scene-canvas"
          onClick={handleSvgClick}
        >
          {scene.backgroundUrl ? (
            <image href={scene.backgroundUrl} x="0" y="0" width={scene.width} height={scene.height} />
          ) : (
            <rect x="0" y="0" width={scene.width} height={scene.height} fill="#333" />
          )}

        {scene.walls.map((wall, index) => (
          <line
            key={index}
            x1={wall.c[0]}
            y1={wall.c[1]}
            x2={wall.c[2]}
            y2={wall.c[3]}
            stroke={wall.door !== "none" ? "#e0a030" : "#e03030"}
            strokeWidth={Math.max(scene.width / 400, 3)}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedLight(null);
              setSelectedWall(index);
            }}
          />
        ))}

        {drawingPoints.length > 0 && (
          <polyline
            points={drawingPoints.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#30a0e0"
            strokeDasharray="10,6"
            strokeWidth={Math.max(scene.width / 400, 3)}
          />
        )}

        {scene.lights.map((light, index) => (
          <circle
            key={index}
            cx={light.x}
            cy={light.y}
            r={Math.max(scene.width / 100, 10)}
            fill={light.config.color}
            fillOpacity={0.8}
            stroke="black"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedWall(null);
              setSelectedLight(index);
            }}
          />
        ))}
        </svg>
      </div>

      <div className="placeable-lists">
        <div>
          <h3>Paredes ({scene.walls.length})</h3>
          {scene.walls.map((wall, index) => (
            <div key={index} className="placeable-item">
              <button type="button" onClick={() => setSelectedWall(selectedWall === index ? null : index)}>
                Parede {index + 1}
              </button>
              {selectedWall === index && (
                <WallPropertiesForm
                  wall={wall}
                  onChange={(w) => updateWall(index, w)}
                  onRemove={() => removeWall(index)}
                />
              )}
            </div>
          ))}
        </div>

        <div>
          <h3>Luzes ({scene.lights.length})</h3>
          {scene.lights.map((light, index) => (
            <div key={index} className="placeable-item">
              <button type="button" onClick={() => setSelectedLight(selectedLight === index ? null : index)}>
                Luz {index + 1}
              </button>
              {selectedLight === index && (
                <LightPropertiesForm
                  light={light}
                  onChange={(l) => updateLight(index, l)}
                  onRemove={() => removeLight(index)}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
