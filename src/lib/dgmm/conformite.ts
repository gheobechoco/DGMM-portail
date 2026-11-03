// Contrôles de conformité : numéro OMI et effectif minimal de sécurité (indicatif, à valider DGMM).

/** Vérifie la clé de contrôle d'un numéro OMI (7 chiffres, pondération 7..2 sur les 6 premiers). */
export function imoValide(saisie: string): boolean {
  const n = saisie.replace(/^IMO\s*/i, "").trim();
  if (!/^\d{7}$/.test(n)) return false;
  const somme = [...n.slice(0, 6)].reduce((s, c, i) => s + Number(c) * (7 - i), 0);
  return somme % 10 === Number(n[6]);
}

/**
 * Effectif minimal de sécurité indicatif selon la jauge brute.
 * Barème de démonstration : le document officiel (Safe Manning Document) du navire fait foi.
 */
export function effectifMinimal(jauge: number): number {
  if (jauge < 100) return 3;
  if (jauge < 500) return 5;
  if (jauge < 3000) return 8;
  return 12;
}
