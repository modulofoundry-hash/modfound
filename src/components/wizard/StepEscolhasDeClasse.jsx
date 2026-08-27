import { OriginTableBrowser } from "../OriginTableBrowser";

// Rótulo de exibição por categoria (o `name`/mecânica em si continua em
// inglês, igual todo o resto do banco — só o TÍTULO do card é traduzido,
// mesma convenção do resto do wizard).
const CATEGORY_LABELS = {
  fightingStyle: "Estilo de Luta",
  metamagic: "Metamagia",
  eldritchInvocation: "Invocação Mística",
  maneuver: "Manobra (Battle Master)",
  elementalDiscipline: "Disciplina Elemental (Way of the Four Elements)",
  artificerInfusion: "Infusão de Artífice",
  armorModel: "Modelo de Armadura (Armorer)",
  arcaneShot: "Disparo Arcano (Arcane Archer)",
  runeMagic: "Runa",
  houseTools: "Ferramentas de Casa (House Agent)",
  totemSpirit: "Totem Spirit (Path of the Totem Warrior)",
  aspectOfTheBeast: "Aspect of the Beast (Path of the Totem Warrior)",
  totemicAttunement: "Totemic Attunement (Path of the Totem Warrior)",
  runeKnightRune: "Runa (Rune Knight)",
  hunterPrey: "Hunter's Prey (Hunter)",
  hunterDefensiveTactics: "Defensive Tactics (Hunter)",
  hunterMultiattack: "Multiattack (Hunter)",
  hunterSuperiorDefense: "Superior Hunter's Defense (Hunter)",
  divineOrder: "Ordem Divina (Divine Order)",
};

const COLUMNS = [
  { key: "name", label: "Nome" },
  { key: "rules", label: "Edição", render: (item) => item.rules || "—" },
];

// Um card por (classe, categoria) — ex. "Sorcerer — Nível 3 — Metamagia",
// com `count` pickers independentes (`OriginTableBrowser` reaproveitado, um
// por posição). `chosenNames[startIndex..startIndex+count-1]` vem já
// recortado pelo componente pai (StepEscolhasDeClasse), que sabe o offset de
// cada card dentro da mesma categoria (duas classes diferentes podem
// conceder a MESMA categoria, ex: Fighter + Paladin multiclasse — cada uma
// vira um card separado, mas os nomes escolhidos ficam numa lista só,
// achatada, por categoria).
function ChoiceSlotCard({ slot, pool, chosenNames, onPick, onClear }) {
  return (
    <div className="melhoria-slot">
      <h4 className="melhoria-slot-title">
        {slot.className || "Classe"} — {CATEGORY_LABELS[slot.category] ?? slot.category}
      </h4>
      <div className="melhoria-feat-picker">
        {Array.from({ length: slot.count }, (_, i) => {
          const chosen = chosenNames[i];
          // Exclui da lista os nomes já escolhidos nas OUTRAS posições do
          // mesmo card -- sem isso, nada impedia escolher a MESMA opção
          // várias vezes num slot com count>1 (achado ao vivo: Rune Knight
          // deixava repetir "Cloud Rune" nas 5 posições). Regra real de
          // quase todo mecanismo desse tipo (Fighting Style, Metamagia,
          // Manobra, Infusão, Runa) já proíbe repetir a mesma escolha.
          const otherChosen = new Set(chosenNames.filter((_, idx) => idx !== i));
          const availablePool = pool.filter((item) => !otherChosen.has(item.name));
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
                  searchPlaceholder={`Buscar ${(CATEGORY_LABELS[slot.category] ?? slot.category).toLowerCase()}...`}
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
export function StepEscolhasDeClasse({ slots, classChoices, optionalFeaturesData, featsData, onPick, onClear }) {
  // offset de cada slot dentro da mesma categoria (soma dos `count` dos slots
  // anteriores da MESMA categoria, na ordem em que aparecem) -- é assim que
  // dois cards da mesma categoria (multiclasse com duas classes que dão
  // Fighting Style, por ex.) dividem a mesma lista achatada sem se pisar.
  const offsets = new Map();

  return (
    <div className="wizard-step-escolhas-classe">
      {slots.map((slot) => {
        const startIndex = offsets.get(slot.category) ?? 0;
        offsets.set(slot.category, startIndex + slot.count);

        const allChosenForCategory = classChoices.filter((c) => c.category === slot.category).map((c) => c.name);
        const chosenNames = allChosenForCategory.slice(startIndex, startIndex + slot.count);

        const pool =
          slot.source === "feat"
            ? featsData.filter((f) => f.subtype === slot.category && f.rules === slot.rules)
            : optionalFeaturesData.filter(
                (f) => f.category === slot.category && f.rules === slot.rules && (!f.classes?.length || f.classes.includes(slot.className)),
              );

        return (
          <ChoiceSlotCard
            key={`${slot.classIndex}-${slot.category}`}
            slot={slot}
            pool={pool}
            chosenNames={chosenNames}
            onPick={(category, i, item) => onPick(category, startIndex + i, item)}
            onClear={(category, i) => onClear(category, startIndex + i)}
          />
        );
      })}
    </div>
  );
}
