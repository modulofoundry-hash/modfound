import { useState } from "react";

// Ícone "ⓘ" pequeno e circular que alterna (clique, não hover) uma caixa de texto —
// extraído de StepAtributos.jsx (onde já existia só pra explicar o método de geração
// de atributo) pra ser reaproveitado em qualquer outro lugar do site que precise de uma
// explicação curta sem gastar espaço de tela o tempo todo. Clique em vez de hover é de
// propósito: o app (React Native, sem mouse) replica esse MESMO padrão — ver
// app/src/components/InfoTooltip.js — e um toggle ao toque funciona em qualquer
// plataforma, diferente de `title=""`/CSS `:hover`, que não existe em touch.
export function InfoTooltip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="info-tooltip-wrap">
      <button
        type="button"
        className="info-tooltip-btn"
        aria-label="Mais informações"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((v) => !v);
        }}
        onBlur={() => setOpen(false)}
      >
        ⓘ
      </button>
      {/* `<span>`, não `<div>` -- achado ao vivo testando o ícone dentro de StepMagias.jsx:
          o parágrafo "Concedidas automaticamente" (`<p className="field-hint">`) É o
          ancestral direto quando o ícone aparece ali, e HTML não permite `<div>` (ou
          qualquer outro elemento de bloco) dentro de `<p>` -- o navegador fecha o `<p>`
          sozinho no meio, o React detecta divergência e loga erro de hidratação no
          console. `position:absolute` (CSS já existente) tira o elemento do fluxo normal
          de qualquer forma, então troca de tag não muda nada visualmente. */}
      {open && <span className="info-tooltip-box">{text}</span>}
    </span>
  );
}
