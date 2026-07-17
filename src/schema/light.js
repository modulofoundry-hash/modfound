// Verificado contra foundry.data.LightData e AmbientLightDocument (API docs oficiais do Foundry v13/v14).
// "animation.type" é uma chave livre — o módulo valida contra CONFIG.Canvas.lightAnimations
// do mundo Foundry de destino e ignora se não existir (evita travar a criação por causa de
// um tipo de animação de um módulo de terceiros que o mundo de destino não tenha instalado).

export function createLight(x, y) {
  return {
    x,
    y,
    rotation: 0,
    elevation: 0,
    hidden: false,
    walls: true,
    vision: false,
    config: {
      dim: 20,
      bright: 10,
      angle: 360,
      color: "#ffffff",
      alpha: 0.5,
      coloration: 1,
      luminosity: 0.5,
      saturation: 0,
      contrast: 0,
      shadows: 0,
      attenuation: 0.5,
      negative: false,
      priority: 0,
      darkness: { min: 0, max: 1 },
      animation: { type: "", speed: 5, intensity: 5, reverse: false },
    },
  };
}
