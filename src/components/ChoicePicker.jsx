import { useState } from "react";
import { SKILLS } from "../schema/character";
import equipmentCategories from "../data/srd/equipmentCategories.json";

// `from` normalmente é array de rótulo (perícia/ferramenta) — mas o banco também usa
// o texto-sentinela "qualquer perícia"/"qualquer perícia à escolha" (ex: Bardo,
// Humano Variante, Custom Lineage) pra dizer "todas as 18", mesmo padrão que o
// módulo já trata em `resolveSkillPool()` (dnd5eCodes.js). Sem tratar isso aqui,
// `from.map` quebrava a página INTEIRA assim que Bardo era escolhido como classe
// (achado testando ao vivo). `category` (string ou array de strings, ex:
// "setGaming"/"toolArtisan") é o formato que ~20 antecedentes/talentos usam pra
// ferramenta de categoria ("qualquer jogo de tabuleiro", "qualquer ferramenta de
// artesão") — resolve pela mesma tabela que EquipmentSlots.jsx já usa pra grants
// de equipamento por categoria, em vez de duplicar a lista item por item no banco.
// Achado ao vivo (playtest): esses ~20 antecedentes tinham só `category`/`label`
// sem `from` nenhum, e o picker mostrava "Nenhum resultado" pra sempre, mesmo com
// a categoria certa gravada no banco -- o componente nunca soube ler esse campo.
function resolveChoicePool(from, category) {
  if (Array.isArray(from)) return from;
  if (typeof from === "string" && from.toLowerCase().includes("qualquer")) return SKILLS.map((s) => s.label);
  if (category) {
    const categories = Array.isArray(category) ? category : [category];
    const items = categories.flatMap((key) => equipmentCategories[key] ?? []);
    if (items.length) return items;
  }
  return [];
}

// Escolha de N perícias/ferramentas/idiomas dentro da própria caixa de
// sugestão (em vez de só listar e mandar o jogador marcar na seção
// separada). `allowCustom` (opcional, usado só em Idiomas) acrescenta uma
// opção "Customizado" que ocupa 1 dos N slots e abre um campo de texto —
// a lista fixa (`from`) é o catálogo real do sistema, mas não cobre idioma
// homebrew/de campanha que o Mestre tenha criado.
export function ChoicePicker({ title, count, from, category, onAdd, allowCustom }) {
  const [selected, setSelected] = useState([]);
  const [customEnabled, setCustomEnabled] = useState(false);
  const [customText, setCustomText] = useState("");
  const [search, setSearch] = useState("");
  const options = resolveChoicePool(from, category);
  // Busca só aparece pra listas grandes (idiomas ~25, perícia "qualquer" 18)
  // — poucas opções (a maioria dos toolChoice) não precisa filtrar nada.
  const needle = search.trim().toLowerCase();
  const visibleOptions = needle ? options.filter((label) => label.toLowerCase().includes(needle)) : options;
  const usedSlots = selected.length + (customEnabled ? 1 : 0);

  function toggle(label) {
    setSelected((prev) => {
      if (prev.includes(label)) return prev.filter((s) => s !== label);
      if (usedSlots >= count) return prev;
      return [...prev, label];
    });
  }

  function toggleCustom() {
    setCustomEnabled((prev) => {
      if (prev) {
        setCustomText("");
        return false;
      }
      return usedSlots >= count ? prev : true;
    });
  }

  function handleAdd() {
    const customValue = customEnabled ? customText.trim() : "";
    const combined = customValue ? [...selected, customValue] : selected;
    if (combined.length === 0) return;
    onAdd(combined);
    setSelected([]);
    setCustomEnabled(false);
    setCustomText("");
  }

  const showCustomRow = allowCustom && (!needle || "customizado".includes(needle));

  return (
    <div className="choice-picker">
      <p>
        {title} (escolha {count}):
      </p>
      {options.length > 8 && (
        <input
          type="text"
          className="choice-picker-search"
          placeholder="Buscar..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      )}
      <div className="choice-picker-list">
        {visibleOptions.map((label) => (
          <label key={label} className="choice-picker-option">
            <input
              type="checkbox"
              checked={selected.includes(label)}
              disabled={!selected.includes(label) && usedSlots >= count}
              onChange={() => toggle(label)}
            />
            {label}
          </label>
        ))}
        {showCustomRow && (
          <label className="choice-picker-option">
            <input
              type="checkbox"
              checked={customEnabled}
              disabled={!customEnabled && usedSlots >= count}
              onChange={toggleCustom}
            />
            Customizado
          </label>
        )}
        {visibleOptions.length === 0 && !showCustomRow && <p className="choice-picker-empty">Nenhum resultado.</p>}
      </div>
      {customEnabled && (
        <input
          type="text"
          className="choice-picker-custom-input"
          placeholder="Digite o idioma..."
          value={customText}
          onChange={(event) => setCustomText(event.target.value)}
        />
      )}
      <button
        type="button"
        disabled={usedSlots !== count || (customEnabled && !customText.trim())}
        onClick={handleAdd}
      >
        Adicionar
      </button>
    </div>
  );
}
