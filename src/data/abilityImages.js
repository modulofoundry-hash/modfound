// Ilustração de cada atributo (grid 2x3 na etapa Atributos do wizard) --
// arquivos em site/public/ability-images/, servidos pelo Vite na raiz.
export const ABILITY_IMAGES = {
  str: "/ability-images/str.png",
  dex: "/ability-images/dex.png",
  // "con.png" (sem underscore) é nome de dispositivo reservado do Windows --
  // trava git/GitHub Desktop na leitura mesmo com extensão (CreateFileW sem
  // prefixo \\?\ falha).
  con: "/ability-images/con_.png",
  int: "/ability-images/int.png",
  wis: "/ability-images/wis.png",
  cha: "/ability-images/cha.png",
};
