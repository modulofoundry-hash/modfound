import { useEffect, useState } from "react";
import { subscribeToAllChatMessages, sendChatText } from "../data/chatMessages";
import { ChatMessageCard } from "./ChatPanel";

// Chat geral do site -- ao lado de "Trocar perfil" (ProfileLayout.jsx), visível
// em qualquer perfil. Mostra a MESMA coleção "chatMessages" que a ficha de
// personagem já usa (ChatPanel.jsx), só que combinando TODOS os perfis numa
// linha do tempo só (collection-group query, ver chatMessages.js) -- uma
// rolagem feita clicando na ficha (perícia/atributo/resistência/ataque)
// aparece aqui automaticamente, sem escrita duplicada. Autor aqui é o PERFIL
// atual (não um personagem específico), já que este chat não pertence a uma
// ficha.
export function GlobalChatPanel({ profile }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [input, setInput] = useState("");
  const [sendError, setSendError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const unsubscribe = subscribeToAllChatMessages(setMessages, (err) => setError(err.message));
    return unsubscribe;
  }, [open]);

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
        onClick={() => setOpen((v) => !v)}
        aria-label="Chat"
        title="Chat"
      >
        💬
      </button>

      {open && (
        <div className="global-chat-panel">
          <div className="global-chat-messages">
            {error && <p className="error">Erro ao carregar o chat: {error}</p>}
            {!error && !messages.length && <p className="chat-panel-empty">Nenhuma mensagem ainda.</p>}
            {messages.map((message) => (
              <ChatMessageCard key={message.id} message={message} />
            ))}
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
        </div>
      )}
    </div>
  );
}
