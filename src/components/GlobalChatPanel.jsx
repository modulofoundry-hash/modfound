import { useEffect, useRef, useState } from "react";
import { subscribeToAllChatMessages, sendChatText } from "../data/chatMessages";
import { subscribeToGmPresence, claimGm, releaseGm, heartbeatGm, GM_HEARTBEAT_INTERVAL_MS } from "../data/gmPresence";
import { ChatMessageCard } from "./ChatPanel";

// Chat geral do site -- ao lado de "Trocar perfil" (ProfileLayout.jsx), visível
// em qualquer perfil. Mostra a MESMA coleção "chatMessages" que a ficha de
// personagem já usa (ChatPanel.jsx), só que combinando TODOS os perfis numa
// linha do tempo só (collection-group query, ver chatMessages.js) -- uma
// rolagem feita clicando na ficha (perícia/atributo/resistência/ataque)
// aparece aqui automaticamente, sem escrita duplicada. Autor aqui é o PERFIL
// atual (não um personagem específico), já que este chat não pertence a uma
// ficha.

// Abaixo dessa largura a janela vira o painel fixo de meia-tela (ver
// .global-chat-panel-mobile no CSS, que usa !important pra sobrepor o estilo
// inline de posição/tamanho) -- arrastar/redimensionar só faz sentido com
// mouse/trackpad numa janela grande, não em tela de celular.
const MOBILE_BREAKPOINT = 640;
// Tamanho padrão pedido pelo usuário (print de referência, nov/2026):
// janela grande, ocupando boa parte da tela, não mais um painel pequeno.
const DEFAULT_SIZE = { width: 1040, height: 700 };
const MIN_SIZE = { width: 260, height: 300 };

function isMobileViewport() {
  return typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT;
}

export function GlobalChatPanel({ profile }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [input, setInput] = useState("");
  const [sendError, setSendError] = useState(null);
  const [gm, setGm] = useState(null); // null = ninguém é GM agora
  const [gmError, setGmError] = useState(null);
  const isGm = gm?.heldByProfileId === profile.id;

  // Assina sempre (não só com `open`) -- o botão de GM e o filtro de
  // sussurro já precisam saber quem é GM mesmo com o painel fechado.
  useEffect(() => {
    const unsubscribe = subscribeToGmPresence(setGm, (err) => setGmError(err.message));
    return unsubscribe;
  }, []);

  // Sinal de vida só enquanto EU for o GM -- `heartbeatGm` confere a posse
  // de novo antes de escrever, então nunca "rouba" o cargo de volta se
  // outra aba já assumiu nesse meio tempo.
  useEffect(() => {
    if (!isGm) return;
    const interval = setInterval(() => heartbeatGm(profile.id), GM_HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isGm, profile.id]);

  async function toggleGm() {
    setGmError(null);
    try {
      if (isGm) await releaseGm(profile.id);
      else await claimGm(profile.id, profile.name);
    } catch (err) {
      setGmError(err.message);
    }
  }

  // Posição/tamanho da janela flutuante (desktop) -- `pos` só é definido na
  // hora de abrir (perto do ícone), nunca antes, porque depende de
  // `getBoundingClientRect()` do próprio botão.
  const [pos, setPos] = useState(null);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const dragState = useRef(null);
  const resizeState = useRef(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const unsubscribe = subscribeToAllChatMessages(setMessages, (err) => setError(err.message));
    return unsubscribe;
  }, [open]);

  // Atalho: Enter em qualquer lugar da página abre o chat geral, desde que
  // nenhum campo de texto esteja focado (chat individual, o próprio campo
  // deste chat, edição de PV/ficha etc.) -- senão confirmar qualquer outro
  // campo com Enter abriria a janela sem querer.
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key !== "Enter" || open) return;
      const active = document.activeElement;
      const tag = active?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || active?.isContentEditable) return;
      openPanel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, size]);

  function openPanel() {
    // Janela grande demais pra ancorar embaixo do ícone (ficaria cortada) --
    // abre centralizada horizontalmente, perto do topo da tela. Só importa
    // no desktop; a versão mobile ignora `pos` (CSS força a posição com
    // !important).
    const left = Math.max(8, Math.min((window.innerWidth - size.width) / 2, window.innerWidth - size.width - 8));
    const top = Math.max(8, Math.min(80, window.innerHeight - size.height - 8));
    setPos({ top, left });
    setOpen(true);
  }

  function onDragPointerDown(event) {
    if (isMobileViewport()) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPos: pos,
    };
  }

  function onDragPointerMove(event) {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    // Mantém a janela INTEIRA dentro da tela (não só uma lasca visível) --
    // senão o botão "X" (canto oposto ao ponto arrastado) pode sair da
    // viewport e ficar impossível de clicar.
    setPos({
      left: Math.max(0, Math.min(drag.startPos.left + dx, window.innerWidth - size.width)),
      top: Math.max(0, Math.min(drag.startPos.top + dy, window.innerHeight - size.height)),
    });
  }

  function onDragPointerUp(event) {
    if (dragState.current?.pointerId === event.pointerId) dragState.current = null;
  }

  function onResizePointerDown(event) {
    if (isMobileViewport()) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startSize: size,
    };
  }

  function onResizePointerMove(event) {
    const resize = resizeState.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    const dx = event.clientX - resize.startX;
    const dy = event.clientY - resize.startY;
    // Teto = não deixar crescer além da borda da tela a partir da posição
    // atual (`pos`), senão o canto oposto ao que está sendo arrastado (onde
    // fica o "X") sai da viewport.
    const maxWidth = window.innerWidth - (pos?.left ?? 0) - 8;
    const maxHeight = window.innerHeight - (pos?.top ?? 0) - 8;
    setSize({
      width: Math.min(maxWidth, Math.max(MIN_SIZE.width, resize.startSize.width + dx)),
      height: Math.min(maxHeight, Math.max(MIN_SIZE.height, resize.startSize.height + dy)),
    });
  }

  function onResizePointerUp(event) {
    if (resizeState.current?.pointerId === event.pointerId) resizeState.current = null;
  }

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setSendError(null);
    try {
      await sendChatText(profile.id, { sourceId: profile.id, authorName: profile.name, text });
    } catch (err) {
      setSendError(err.message);
    }
  }

  return (
    <div className="global-chat">
      <button
        type="button"
        className="global-chat-toggle"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-label="Chat"
        title="Chat"
      >
        💬
      </button>

      {open && (
        <div
          className="global-chat-panel"
          style={pos ? { top: pos.top, left: pos.left, width: size.width, height: size.height } : undefined}
        >
          <div
            className="global-chat-panel-titlebar"
            onPointerDown={onDragPointerDown}
            onPointerMove={onDragPointerMove}
            onPointerUp={onDragPointerUp}
          >
            <span>Chat</span>
            <button
              type="button"
              className={`global-chat-gm-toggle${isGm ? " is-gm" : ""}`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={toggleGm}
              disabled={!!gm && !isGm}
              title={
                isGm
                  ? "Você é o GM -- clique pra abrir mão do cargo"
                  : gm
                    ? `${gm.heldByName} é o GM agora`
                    : "Ninguém é GM agora -- clique pra assumir"
              }
            >
              {isGm ? "GM: você" : gm ? `GM: ${gm.heldByName}` : "Virar GM"}
            </button>
            <button
              type="button"
              className="global-chat-panel-close"
              // `stopPropagation` aqui -- o `pointerdown` deste botão, sem isso,
              // sobe por bubbling até o `onDragPointerDown` da barra de título
              // (é filho dela), cujo `preventDefault()` suprime o `click`
              // sintético do navegador antes dele disparar.
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => setOpen(false)}
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>

          <div className="global-chat-messages">
            {error && <p className="error">Erro ao carregar o chat: {error}</p>}
            {gmError && <p className="error chat-command-error">{gmError}</p>}
            {/* Sussurro só é filtro VISUAL (ver sendLocalRoll/chatMessages.js) --
                quem não é GM simplesmente não vê a mensagem renderizada aqui,
                mas ela continua gravada no Firestore igual qualquer outra. */}
            {(() => {
              const visible = messages.filter((m) => m.visibility !== "whisper" || isGm);
              if (!error && !visible.length) return <p className="chat-panel-empty">Nenhuma mensagem ainda.</p>;
              return visible.map((message) => <ChatMessageCard key={message.id} message={message} />);
            })()}
          </div>

          {sendError && <p className="error chat-command-error">{sendError}</p>}
          <div className="chat-input-row">
            <input
              type="text"
              value={input}
              placeholder="Mensagem"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSend();
              }}
            />
            <button type="button" onClick={handleSend}>
              Enviar
            </button>
          </div>

          <div
            className="global-chat-panel-resize-handle"
            onPointerDown={onResizePointerDown}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
          />
        </div>
      )}
    </div>
  );
}
