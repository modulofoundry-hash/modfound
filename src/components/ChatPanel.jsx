import { useEffect, useRef, useState } from "react";
import { subscribeToChatMessages, sendChatText, sendRollRequest } from "../data/chatMessages";
import { ABILITIES, ABILITY_LABELS, SKILLS } from "../schema/character";

// Comandos estilo Foundry (`/prc`, `/save des`, `/atk Espada Longa`, `/roll 2d6+3`)
// e clique nos botões de atalho fazem a MESMA coisa: escrevem um `rollRequest`
// pendente no Firestore. Quem resolve de verdade (rola o dado, posta no chat
// do Foundry) é o cliente do GM, ver module/scripts/live/liveRollBridge.js —
// aqui só escrevemos o pedido e mostramos o resultado quando ele voltar.
function parseCommand(raw) {
  const body = raw.slice(1).trim();
  if (!body) return null;
  const [head, ...rest] = body.split(/\s+/);
  const headLower = head.toLowerCase();
  const argText = rest.join(" ");

  if (["roll", "r"].includes(headLower) && argText) return { type: "formula", formula: argText };
  if (["save", "s"].includes(headLower) && ABILITIES.includes(argText.toLowerCase())) {
    return { type: "save", key: argText.toLowerCase() };
  }
  if (["atk", "ataque", "attack"].includes(headLower) && argText) return { type: "attack", itemName: argText };
  if (ABILITIES.includes(headLower)) return { type: "check", key: headLower };
  if (SKILLS.some((s) => s.id === headLower)) return { type: "skill", key: headLower };
  return null;
}

function describeRequest(request) {
  if (!request) return null;
  switch (request.type) {
    case "check":
      return `Teste de ${ABILITY_LABELS[request.key] ?? request.key}`;
    case "save":
      return `Resistência de ${ABILITY_LABELS[request.key] ?? request.key}`;
    case "skill":
      return SKILLS.find((s) => s.id === request.key)?.label ?? request.key;
    case "attack":
      return `Ataque: ${request.itemName}`;
    case "formula":
      return request.formula;
    default:
      return request.type;
  }
}

function formatTime(timestamp) {
  const date = timestamp?.toDate?.();
  if (!date) return "";
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function ChatMessageCard({ message }) {
  const isRoll = message.kind === "rollRequest";
  const resultClass = message.status === "error" ? "chat-message-error" : "chat-message-roll";

  return (
    <div className={`chat-message${isRoll ? ` ${resultClass}` : ""}`}>
      <div className="chat-message-header">
        <span className="chat-message-author">{message.authorName}</span>
        <span className="chat-message-time">{formatTime(message.createdAt)}</span>
      </div>
      {!isRoll && <p className="chat-message-text">{message.text}</p>}
      {isRoll && (
        <div className="chat-message-roll-body">
          <span className="chat-message-roll-label">{describeRequest(message.request)}</span>
          {message.status === "pending" && <span className="chat-message-roll-status">rolando…</span>}
          {message.status === "error" && <span className="chat-message-roll-status">{message.error}</span>}
          {message.status === "done" && message.result && (
            <span className="chat-message-roll-total">
              {message.result.total}
              {message.result.isCritical && <span className="chat-message-roll-tag">CRÍTICO</span>}
              {message.result.isFumble && <span className="chat-message-roll-tag">FALHA</span>}
              <span className="chat-message-roll-formula">{message.result.formula}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function ChatPanel({ profileId, character }) {
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [input, setInput] = useState("");
  const [commandError, setCommandError] = useState(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    setError(null);
    const unsubscribe = subscribeToChatMessages(profileId, setMessages, (err) => setError(err.message));
    return unsubscribe;
  }, [profileId]);

  async function submitRequest(request) {
    setCommandError(null);
    try {
      await sendRollRequest(profileId, { sourceId: character.id, authorName: character.name, request });
    } catch (err) {
      setCommandError(err.message);
    }
  }

  async function handleSend() {
    const raw = input.trim();
    if (!raw) return;
    setInput("");
    if (raw.startsWith("/")) {
      const request = parseCommand(raw);
      if (!request) {
        setCommandError(`Comando não reconhecido: ${raw}`);
        return;
      }
      await submitRequest(request);
      return;
    }
    setCommandError(null);
    try {
      await sendChatText(profileId, { sourceId: character.id, authorName: character.name, text: raw });
    } catch (err) {
      setCommandError(err.message);
    }
  }

  return (
    <div className="chat-panel">
      <div
        className="chat-panel-messages"
        ref={(el) => {
          if (el) el.scrollTop = el.scrollHeight;
        }}
      >
        {error && <p className="error">Erro ao carregar o chat: {error}</p>}
        {!error && !messages.length && <p className="chat-panel-empty">Nenhuma mensagem ainda.</p>}
        {messages.map((message) => (
          <ChatMessageCard key={message.id} message={message} />
        ))}
      </div>

      <details className="chat-shortcuts" open={shortcutsOpen} onToggle={(e) => setShortcutsOpen(e.target.open)}>
        <summary>Perícias e resistências</summary>
        <div className="chat-shortcuts-group">
          <span className="chat-shortcuts-group-label">Resistências</span>
          <div className="chat-shortcuts-row">
            {ABILITIES.map((ability) => (
              <button type="button" key={ability} onClick={() => submitRequest({ type: "save", key: ability })}>
                {ABILITY_LABELS[ability]}
              </button>
            ))}
          </div>
          <span className="chat-shortcuts-group-label">Perícias</span>
          <div className="chat-shortcuts-row">
            {SKILLS.map((skill) => (
              <button type="button" key={skill.id} onClick={() => submitRequest({ type: "skill", key: skill.id })}>
                {skill.label}
              </button>
            ))}
          </div>
        </div>
      </details>

      {commandError && <p className="error chat-command-error">{commandError}</p>}
      <div className="chat-input-row">
        <input
          type="text"
          value={input}
          placeholder="Mensagem ou comando (/prc, /save des, /atk Espada, /roll 2d6+3)"
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
  );
}
