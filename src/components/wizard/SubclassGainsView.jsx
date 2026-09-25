import { useState } from "react";

// HTML da descrição -> texto simples (as descrições do banco vêm em HTML).
function htmlToText(html) {
  const div = document.createElement("div");
  div.innerHTML = String(html ?? "").replace(/<\/(p|div|li|h\d)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n");
  return (div.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
}

function shortText(html, max = 200) {
  const text = htmlToText(html).replace(/\s+/g, " ");
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "));
  return `${stop > 60 ? cut.slice(0, stop + 1) : cut.trimEnd()}…`;
}

// Etapa Subclasse do assistente de subida, parte "só leitura": o que a subclasse JÁ escolhida concede em cada nível novo
// da classe — features (clicar abre a descrição inteira), magias sempre preparadas/conhecidas/inatas, lista de magias
// ampliada, escolhas liberadas e conjuração própria. `blocks` vem de `subclassGainBlocks`.
export function SubclassGainsView({ blocks }) {
  const [expanded, setExpanded] = useState({});
  return (
    <div className="levelup-subclass-gains">
      {blocks.map((block) => {
        const key = `${block.classIndex}-${block.level}`;
        return (
          <div key={key} className="levelup-subclass-gain" data-testid={`subclass-gain-${block.className}-${block.level}`}>
            <h5>
              {block.className} nível {block.level} <span className="field-hint">· {block.subclass.name}</span>
            </h5>
            {block.subclass.features.map((feature) => {
              const featureKey = `${key}:${feature.name}`;
              const open = !!expanded[featureKey];
              return (
                <button
                  key={featureKey}
                  type="button"
                  className="levelup-subclass-feature"
                  aria-label={`${open ? "Recolher" : "Ver descrição completa de"} ${feature.name}`}
                  onClick={() => setExpanded((prev) => ({ ...prev, [featureKey]: !prev[featureKey] }))}
                >
                  <strong>{feature.name}</strong>
                  <span>{open ? htmlToText(feature.description) : shortText(feature.description)}</span>
                </button>
              );
            })}
            {block.subclass.sections.map((section) => (
              <p key={`${section.title}:${section.text}`} className="levelup-subclass-section">
                <strong>{section.title}:</strong> {section.text}
              </p>
            ))}
          </div>
        );
      })}
    </div>
  );
}
