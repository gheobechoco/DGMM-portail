/**
 * Règles d'apparition de l'animation d'habillage (neige, confettis, vagues…).
 *
 * La couche décorative ne doit jamais gêner la lecture : elle se peint derrière
 * les textes de la page et ne s'installe qu'une fois le délai écoulé.
 */

/** Délai (ms) après l'affichage de la page avant que l'animation s'installe. */
export const DELAI_APPARITION_MS = 1600;

/** Durée (ms) de la montée en opacité une fois le délai écoulé. */
export const FONDU_APPARITION_MS = 1400;

/** Opacité maximale de la couche : elle demeure en retrait derrière les textes. */
export const OPACITE_MAX = 0.8;

/** L'animation n'est visible qu'une fois le délai écoulé. */
export function estRevelee(elapsedMs: number): boolean {
  return elapsedMs >= DELAI_APPARITION_MS;
}
