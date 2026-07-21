// Mostra o texto de descrição + (só raça, por enquanto) a lista do que ela concede
// (traits com nome — Darkvision/resistência/etc, já vem pronta do livro, mesmo bloco
// que o PHB usa) da raça/antecedente/classe/subclasse escolhida, num card por item.
// Nem todo item tem descrição extraída (algumas raças homebrew do Book of Ebon Tides
// não têm) — card ainda aparece se tiver traits pra mostrar, só a descrição some.
export function DescriptionPanel({ cards }) {
  const withContent = cards.filter((card) => card.item?.description || card.item?.traits?.length);
  if (!withContent.length) return null;

  return (
    <div className="description-panel">
      {withContent.map((card) => (
        <div key={`${card.title}-${card.item.name}`} className="description-card">
          <h3>
            {card.title}: {card.item.name}
          </h3>
          {card.item.description && (
            <div className="description-card-body" dangerouslySetInnerHTML={{ __html: card.item.description }} />
          )}
          {card.item.traits?.length > 0 && (
            <div className="description-card-traits">
              <h4>O que concede</h4>
              <dl>
                {card.item.traits.map((trait) => (
                  <div key={trait.name} className="description-trait">
                    <dt>{trait.name}</dt>
                    <dd dangerouslySetInnerHTML={{ __html: trait.description }} />
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
