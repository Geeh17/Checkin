export const EQUIPES = ["LARANJA", "VERDE", "VERMELHO"] as const;
export type Equipe = (typeof EQUIPES)[number];

// ✅ 3 equipes de 47
export const LIMITE_POR_EQUIPE = 47;
export const LIMITE_TOTAL = EQUIPES.length * LIMITE_POR_EQUIPE;
