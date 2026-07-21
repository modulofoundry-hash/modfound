// Retrato de emergência pra quando o link de imagem do personagem (imageUrl/
// tokenImageUrl) está quebrado ou vazio -- escolhido por CLASSE. Se o
// personagem tem mais de uma classe (multiclasse) com placeholder conhecido,
// uma delas é sorteada -- o sorteio roda de novo toda vez que a página é
// acessada (não fica fixo depois de escolhido uma vez).
//
// Cada classe casa por nome em inglês (o que já existe salvo hoje, ex:
// "Barbarian") OU em português (preparado pra um futuro seletor de idioma no
// site -- ainda não existe, mas a tabela já cobre os dois) -- comparação sem
// acento e sem diferenciar maiúsculas/minúsculas.
//
// Arquivos de imagem esperados em site/public/class-placeholders/<arquivo> --
// ainda precisam ser adicionados lá pelo usuário; até isso acontecer, um
// personagem sem imagem cai no ícone genérico (mesmo comportamento de antes).
export const CLASS_PLACEHOLDER_IMAGES = [
  { names: ["Artificer", "Artífice"], image: "/class-placeholders/miguelart.png" },
  { names: ["Barbarian", "Bárbaro"], image: "/class-placeholders/miguelbarb.png" },
  { names: ["Bard", "Bardo"], image: "/class-placeholders/miguelbard.png" },
  { names: ["Cleric", "Clérigo"], image: "/class-placeholders/miguelcler.png" },
  { names: ["Druid", "Druída"], image: "/class-placeholders/migueldruid.png" },
  { names: ["Fighter", "Guerreiro"], image: "/class-placeholders/miguelfight.png" },
  { names: ["Monk", "Monge"], image: "/class-placeholders/miguelmonk.png" },
  { names: ["Paladin", "Paladino"], image: "/class-placeholders/miguelpala.png" },
  { names: ["Pugilist", "Pugilista"], image: "/class-placeholders/miguelpugi.png" },
  { names: ["Ranger", "Patrulheiro"], image: "/class-placeholders/miguelranger.png" },
  { names: ["Rogue", "Ladino"], image: "/class-placeholders/miguelrogue.png" },
  { names: ["Sorcerer", "Feiticeiro"], image: "/class-placeholders/miguelsorc.png" },
  { names: ["Warlock", "Bruxo"], image: "/class-placeholders/miguelwar.png" },
  { names: ["Wizard", "Mago"], image: "/class-placeholders/miguelwiz.png" },
];

function normalize(name) {
  return (name ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

// `classes` é o array `character.classes` (schema em site/src/schema/character.js).
// Devolve `null` quando nenhuma classe do personagem tem placeholder
// conhecido (ex: NPC, que não tem `classes`, ou classe fora da tabela).
export function pickClassPlaceholderImage(classes) {
  const matches = (classes ?? [])
    .map((classEntry) => {
      const key = normalize(classEntry?.name);
      if (!key) return null;
      return CLASS_PLACEHOLDER_IMAGES.find((entry) => entry.names.some((name) => normalize(name) === key));
    })
    .filter(Boolean);
  if (!matches.length) return null;
  return matches[Math.floor(Math.random() * matches.length)].image;
}
