import { useState } from "react";
import { SourceItemPicker } from "./SourceItemPicker";
import { EquipmentSlots } from "./EquipmentSlots";
import { ChoicePicker } from "./ChoicePicker";
import { SpellChoicePicker } from "./SpellChoicePicker";
import { HpRollPicker } from "./HpRollPicker";

// A primeira entrada da lista é considerada a classe INICIAL (convenção —
// não tem campo próprio, é a ordem em que o jogador foi adicionando) — só
// ela ganha PV máximo automático no nível 1, igual a regra oficial. Uma
// classe adicionada depois (multiclasse) precisa de escolha (média/rolar)
// até no próprio nível 1 dela.
function levelsNeedingHpChoice(level, isOriginalClass) {
  const start = isOriginalClass ? 2 : 1;
  const levels = [];
  for (let lvl = start; lvl <= (level ?? 1); lvl++) levels.push(lvl);
  return levels;
}

export function ClassesInput({
  classes,
  classesData,
  subclassesData,
  onChange,
  onApplyEquipment,
  onApplySkills,
  onApplySpells,
  onMatchChange,
}) {
  // Rastreia o item exato clicado (não só o nome) — importante quando duas
  // entradas têm o mesmo nome (ex: "Fighter" oficial e "Fighter [custom]"),
  // senão a busca por nome pode pegar a errada pro card de descrição.
  const [matches, setMatches] = useState({});

  function updateRow(index, patch) {
    onChange(classes.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function notify(next) {
    onMatchChange?.(Object.values(next));
  }

  function pickClass(index, text, item) {
    updateRow(index, { name: text, subclass: "" });
    const next = { ...matches, [index]: { classData: item, subclassData: null } };
    setMatches(next);
    notify(next);
  }

  function pickSubclass(index, text, item) {
    // subclassRules grava a edição do item CLICADO — subclasse não é filtrada
    // por rulesMode de propósito (as duas edições aparecem juntas), então o
    // módulo precisa saber qual das duas com o mesmo nome foi escolhida de
    // verdade na hora de buscar o Item.
    updateRow(index, { subclass: text, subclassRules: item?.rules ?? "" });
    const next = { ...matches, [index]: { ...matches[index], subclassData: item } };
    setMatches(next);
    notify(next);
  }

  function addRow() {
    onChange([...classes, { name: "", subclass: "", level: 1, hpRolls: [] }]);
  }

  // Preencher só o índice do nível escolhido (`arr[level-1] = mode`) deixa
  // buracos (undefined) nas posições anteriores nunca tocadas — Firestore
  // recusa gravar documento com `undefined` em qualquer campo, e como isso
  // acontece dentro do próprio salvar (antes de sair da tela do formulário),
  // o erro nem chega a aparecer no banner da lista (achado testando ao vivo:
  // "erro? sem erro" mas o personagem simplesmente não era criado). `Array.from`
  // com length fixo força todo índice a existir, trocando buraco por `null`
  // (valor válido pro Firestore) em vez de deixar undefined.
  function setHpRoll(index, level, mode) {
    const prev = classes[index].hpRolls ?? [];
    const hpRolls = Array.from({ length: Math.max(prev.length, level) }, (_, i) => prev[i] ?? null);
    hpRolls[level - 1] = mode;
    updateRow(index, { hpRolls });
  }

  function removeRow(index) {
    onChange(classes.filter((_, i) => i !== index));
    // `matches` é indexado por posição da linha, igual `classes` — só apagar a
    // chave do índice removido deixa as linhas de baixo "furadas" (linha que
    // era índice 2 vira 1, mas matches[1] continua sendo o match da ANTIGA
    // linha 1, não da que acabou de tomar esse índice). Precisa reajustar toda
    // chave depois do índice removido pra baixo, não só apagar uma.
    const next = {};
    for (const [key, value] of Object.entries(matches)) {
      const i = Number(key);
      if (i < index) next[i] = value;
      else if (i > index) next[i - 1] = value;
    }
    setMatches(next);
    notify(next);
  }

  return (
    <div className="classes-input">
      {classes.map((row, index) => {
        const matched = matches[index]?.classData ?? classesData.find((c) => c.name === row.name);
        // Subclasse não é filtrada por edição — mostra as das duas juntas,
        // ligadas pelo nome da classe (não pela edição dela), cada uma com
        // sua própria tag (ver SourceItemPicker).
        const subclassOptions = matched ? subclassesData.filter((s) => s.parentClass === matched.name) : [];
        const matchedSubclass = matches[index]?.subclassData ?? subclassOptions.find((s) => s.name === row.subclass);
        // `level` de spellChoices de subclasse é nível de CLASSE — só mostra a escolha
        // depois que o personagem já tem nível suficiente pra ter desbloqueado a feature
        // (ex: Additional Magical Secrets do Bardo só existe a partir do nível 6).
        const subclassSpellChoices = (matchedSubclass?.spellChoices ?? []).filter((c) => (row.level ?? 1) >= c.level);
        const isOriginalClass = index === 0;
        const hpLevels = levelsNeedingHpChoice(row.level, isOriginalClass);

        return (
          <div key={index} className="classes-input-row">
            <div className="list-editor-row">
              <label className="list-editor-field">
                Classe
                <SourceItemPicker
                  items={classesData}
                  value={row.name}
                  onChange={(text, item) => pickClass(index, text, item)}
                  placeholder="Ex: Bárbaro"
                />
              </label>
              <label className="list-editor-field">
                Subclasse
                <SourceItemPicker
                  items={subclassOptions}
                  value={row.subclass}
                  onChange={(text, item) => pickSubclass(index, text, item)}
                  placeholder={matched ? "Buscar subclasse..." : "Escolha a classe primeiro"}
                />
              </label>
              <label className="list-editor-field">
                Nível
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={row.level}
                  onChange={(event) => updateRow(index, { level: Number(event.target.value) })}
                />
              </label>
              <button type="button" className="list-editor-remove" onClick={() => removeRow(index)}>
                Remover
              </button>
            </div>

            {matched && (
              <div className="origin-suggestions">
                <p>
                  Dado de vida: {matched.hitDie} · Testes de resistência com proficiência:{" "}
                  {matched.savingThrows.join(", ")}
                </p>
                {hpLevels.length > 0 && (
                  <div className="hp-roll-picker">
                    <p className="field-hint">
                      {isOriginalClass
                        ? "Classe inicial: nível 1 já ganha PV máximo automático. Escolha os níveis seguintes:"
                        : "Multiclasse: até o nível 1 dessa classe usa média/rolagem normal (só a classe inicial da lista ganha PV máximo automático)."}
                    </p>
                    {hpLevels.map((lvl) => (
                      <HpRollPicker
                        key={lvl}
                        level={lvl}
                        value={row.hpRolls?.[lvl - 1]}
                        onChange={(mode) => setHpRoll(index, lvl, mode)}
                      />
                    ))}
                  </div>
                )}
                {matched.skillChoice && (
                  <ChoicePicker
                    title="Perícias"
                    count={matched.skillChoice.count}
                    from={matched.skillChoice.from}
                    onAdd={onApplySkills}
                  />
                )}
                <EquipmentSlots slots={matched.equipmentSlots} onAdd={onApplyEquipment} />
                {onApplySpells &&
                  subclassSpellChoices.map((choice, i) => (
                    <SpellChoicePicker
                      key={i}
                      title={`Magia (${row.subclass})`}
                      count={choice.count}
                      pool={choice.pool}
                      onAdd={onApplySpells}
                    />
                  ))}
              </div>
            )}
          </div>
        );
      })}
      <button type="button" onClick={addRow}>
        Adicionar classe
      </button>
    </div>
  );
}
