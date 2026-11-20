import { useState } from "react";
import { OriginTableBrowser } from "../OriginTableBrowser";
import { SourceItemPicker } from "../SourceItemPicker";
import { isOptionalFeatureEligible } from "../../utils/optionalFeaturePrerequisites";
import { CLASS_CHOICE_CATEGORY_LABELS as CATEGORY_LABELS } from "../../utils/classChoiceLabels";

const COLUMNS = [
  { key: "name", label: "Nome" },
  { key: "rules", label: "Edição", render: (item) => item.rules || "—" },
];

// Nome fixo da invocação (não um campo de dado) -- a sub-escolha de Talento
// de Origem é um caso ÚNICO hoje (ver useLessonsOfTheFirstOnes.js), então
// checar pelo nome aqui é mais simples que inventar uma flag de conteúdo só
// pra 1 caso.
const LESSONS_NAME = "Lessons of the First Ones";

// Sub-escolha de "Lessons of the First Ones" (1 por ocorrência da invocação
// em `classChoices`) -- mesmo padrão de `OriginFeatChoice`
// (StepAntecedente.jsx): `SourceItemPicker` sobre talentos `subtype:"origin"`,
// excluindo os já usados por OUTRAS ocorrências da mesma invocação (regra
// "escolha um DIFERENTE a cada vez").
function LessonsOfTheFirstOnesChoice({ index, chosenName, originFeats, otherChosen, onPick, onClear }) {
  const [text, setText] = useState("");
  const availableFeats = originFeats.filter((f) => !otherChosen.has(f.name));

  function handleChange(nextText, item) {
    setText(nextText);
    if (!item) return;
    // Talento de Origem só existe em regra 2024 -- `item.rules` já confirma
    // isso, mas sempre "2024" por construção de qualquer forma.
    onPick(index, item.name, item.rules ?? "2024");
    setText("");
  }

  return (
    <div className="class-choice-pick lessons-of-the-first-ones-pick">
      {chosenName ? (
        <p className="field-hint">
          Talento de Origem (cópia {index + 1}): <strong>{chosenName}</strong>{" "}
          <button type="button" onClick={() => onClear(index)}>
            remover
          </button>
        </p>
      ) : (
        <SourceItemPicker
          items={availableFeats}
          value={text}
          onChange={handleChange}
          placeholder={`Buscar talento de origem (cópia ${index + 1})...`}
        />
      )}
    </div>
  );
}

// Um card por (classe, categoria) — ex. "Sorcerer — Nível 3 — Metamagia",
// com `count` pickers independentes (`OriginTableBrowser` reaproveitado, um
// por posição). `chosenNames[startIndex..startIndex+count-1]` vem já
// recortado pelo componente pai (StepEscolhasDeClasse), que sabe o offset de
// cada card dentro da mesma categoria (duas classes diferentes podem
// conceder a MESMA categoria, ex: Fighter + Paladin multiclasse — cada uma
// vira um card separado, mas os nomes escolhidos ficam numa lista só,
// achatada, por categoria).
function ChoiceSlotCard({ slot, pool, chosenNames, lockedCount, onPick, onClear }) {
  return (
    <div className="melhoria-slot">
      <h4 className="melhoria-slot-title">
        {slot.className || "Classe"} — {slot.label ?? CATEGORY_LABELS[slot.category] ?? slot.category}
      </h4>
      <div className="melhoria-feat-picker">
        {Array.from({ length: slot.count }, (_, i) => {
          const chosen = chosenNames[i];
          if (i < lockedCount) {
            return (
              <p key={i} className="field-hint">
                Escolha {i + 1}: <strong>{chosen}</strong> — já definido numa sessão anterior, não pode ser alterado.
              </p>
            );
          }
          // Exclui da lista os nomes já escolhidos nas OUTRAS posições do
          // mesmo card -- sem isso, nada impedia escolher a MESMA opção
          // várias vezes num slot com count>1 (achado ao vivo: Rune Knight
          // deixava repetir "Cloud Rune" nas 5 posições). Regra real de
          // quase todo mecanismo desse tipo (Fighting Style, Metamagia,
          // Manobra, Infusão, Runa) já proíbe repetir a mesma escolha --
          // EXCETO quando a própria opção é `repeatable` (ex: "Lessons of
          // the First Ones", Warlock 2024, texto: "Repeatable: You can gain
          // this invocation more than once") -- achado corrigindo essa
          // invocação: sem o `item.repeatable ||` abaixo, nenhuma invocação
          // repetível conseguia ser escolhida 2x, mesmo sendo essa a regra.
          const otherChosen = new Set(chosenNames.filter((_, idx) => idx !== i));
          const availablePool = pool.filter((item) => item.repeatable || !otherChosen.has(item.name));
          return (
            <div key={i} className="class-choice-pick">
              {chosen && (
                <p className="field-hint">
                  Escolha {i + 1}: <strong>{chosen}</strong>{" "}
                  <button type="button" onClick={() => onClear(slot.category, i)}>
                    remover
                  </button>
                </p>
              )}
              {!chosen && (
                <OriginTableBrowser
                  items={availablePool}
                  columns={COLUMNS}
                  value={chosen ?? null}
                  onPick={(item) => onPick(slot.category, i, item)}
                  searchPlaceholder={`Buscar ${(slot.label ?? CATEGORY_LABELS[slot.category] ?? slot.category).toLowerCase()}...`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// `slots` já vem pronto do wizard principal (classChoiceSlots), um item por
// (classIndex, categoria). `poolsByCategory(source)` decide de onde vem a
// lista de opções: 2014 usa `optionalfeatures.json` (categoria), 2024 vira
// FEAT de verdade pra Fighting Style (`source: "feat"`, filtra por subtype
// em vez de category) — achado real revisando o 5etools, não é a mesma
// fonte nas duas edições. Filtra pela edição de quem CONCEDEU o slot
// (`slot.rules`, resolvido em `categoryCountsForClass`/`categoryCountsForFeats`
// de `CharacterCreationWizard.jsx`), nunca pelo `rulesMode` do personagem —
// bug real achado ao vivo: personagem 2024 com subclasse só-2014 (College of
// Swords, XGE) zerava o pool inteiro de Estilo de Luta, porque misturar
// edição (personagem 2024 + subclasse 2014) é suportado de propósito neste
// projeto (ver [[feature_rulesmode_2014_2024]]).
export function StepEscolhasDeClasse({
  slots,
  classChoices,
  optionalFeaturesData,
  featsData,
  character,
  onPick,
  onClear,
  lessonsFeats,
  onPickLessonsFeat,
  onClearLessonsFeat,
  onRemoveLessonsOccurrence,
  lockedCounts = new Map(),
}) {
  // offset de cada slot dentro da mesma categoria (soma dos `count` dos slots
  // anteriores da MESMA categoria, na ordem em que aparecem) -- é assim que
  // dois cards da mesma categoria (multiclasse com duas classes que dão
  // Fighting Style, por ex.) dividem a mesma lista achatada sem se pisar.
  const offsets = new Map();

  // Ocorrências de "Lessons of the First Ones" em `classChoices`, na ordem em
  // que aparecem -- usado tanto pra saber qual índice de
  // `lessonsOfTheFirstOnesFeats` corresponde a qual posição clareada (ver
  // handleClear abaixo) quanto pra renderizar 1 sub-picker por cópia.
  const lessonsOccurrences = classChoices.filter((c) => c.name === LESSONS_NAME).length;

  // Remover uma posição de "eldritchInvocation" pode estar removendo uma
  // cópia de "Lessons of the First Ones" -- nesse caso, a sub-escolha de
  // talento (e o espelho em `feats[]`) tem que sumir junto, senão o talento
  // fica "preso" sem a invocação que o concedeu. Calculado ANTES da remoção
  // de verdade (índice de ocorrência entre as entradas já existentes).
  function handleClear(category, position) {
    if (category === "eldritchInvocation") {
      const categoryEntries = classChoices.filter((c) => c.category === category);
      const removedEntry = categoryEntries[position];
      if (removedEntry?.name === LESSONS_NAME) {
        const occurrenceIndex = categoryEntries.slice(0, position).filter((c) => c.name === LESSONS_NAME).length;
        onRemoveLessonsOccurrence?.(occurrenceIndex);
      }
    }
    onClear(category, position);
  }

  return (
    <div className="wizard-step-escolhas-classe">
      {slots.map((slot) => {
        const startIndex = offsets.get(slot.category) ?? 0;
        offsets.set(slot.category, startIndex + slot.count);

        const allChosenForCategory = classChoices.filter((c) => c.category === slot.category).map((c) => c.name);
        const chosenNames = allChosenForCategory.slice(startIndex, startIndex + slot.count);

        const pool =
          slot.source === "itemChoice"
            ? (slot.pool ?? []).map((name) => ({ name, rules: slot.rules }))
            : slot.source === "feat"
              ? featsData.filter((f) => f.subtype === slot.category && f.rules === slot.rules)
              : optionalFeaturesData.filter(
                  (f) =>
                    f.category === slot.category &&
                    f.rules === slot.rules &&
                    (!f.classes?.length || f.classes.includes(slot.className)) &&
                    isOptionalFeatureEligible(f, character),
                );

        return (
          <ChoiceSlotCard
            key={`${slot.classIndex}-${slot.category}`}
            slot={slot}
            pool={pool}
            chosenNames={chosenNames}
            lockedCount={Math.max(0, (lockedCounts.get(slot.category) ?? 0) - startIndex)}
            onPick={(category, i, item) => onPick(category, startIndex + i, item)}
            onClear={(category, i) => handleClear(category, startIndex + i)}
          />
        );
      })}
      {lessonsOccurrences > 0 && (
        <div className="melhoria-slot">
          <h4 className="melhoria-slot-title">Lessons of the First Ones — Talento de Origem</h4>
          <div className="melhoria-feat-picker">
            {Array.from({ length: lessonsOccurrences }, (_, index) => {
              const chosenName = lessonsFeats?.[index];
              const otherChosen = new Set((lessonsFeats ?? []).filter((name, i) => i !== index && name));
              return (
                <LessonsOfTheFirstOnesChoice
                  key={index}
                  index={index}
                  chosenName={chosenName}
                  originFeats={featsData.filter((f) => f.subtype === "origin")}
                  otherChosen={otherChosen}
                  onPick={onPickLessonsFeat}
                  onClear={onClearLessonsFeat}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
