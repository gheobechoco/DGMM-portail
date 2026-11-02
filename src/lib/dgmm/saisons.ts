import { useEffect, useState } from "react";

/**
 * Calendrier des habillages du sceau DGMM.
 *
 * Le sceau contient déjà une ancre, le jas tricolore (vert-jaune-bleu), un cordage or
 * et un anneau jaune : quand l'habillage prévu reprend l'un de ces éléments, on lui
 * substitue un autre symbole (indiqué dans `substitution`).
 */
export type HabillageId =
  | "nouvel-an"
  | "renovation"
  | "droits-femme"
  | "travail"
  | "gens-de-mer"
  | "independance"
  | "liberation"
  | "journee-mer"
  | "octobre-rose"
  | "novembre-bleu"
  | "sida"
  | "noel";

export type Ambiance =
  | "feux"
  | "etincelles"
  | "petales"
  | "feuilles"
  | "bulles"
  | "confettis"
  | "envol"
  | "vagues"
  | "rubans"
  | "neige";

export interface Habillage {
  id: HabillageId;
  /** Nom de l'événement, affiché sous le logo et lu par les lecteurs d'écran. */
  evenement: string;
  /** Accessoire ajouté au sceau. */
  accessoire: string;
  /** Raison du remplacement quand l'élément prévu est déjà dans le sceau. */
  substitution?: string;
  ambiance: Ambiance;
  /** Couleurs des particules animées. */
  couleurs: string[];
}

export const HABILLAGES: Record<HabillageId, Habillage> = {
  "nouvel-an": {
    id: "nouvel-an",
    evenement: "Bonne année !",
    accessoire: "Chapeau de fête (cotillon)",
    ambiance: "feux",
    couleurs: ["#FCD116", "#ff5d8f", "#4cc9f0", "#9b5de5", "#ffffff"],
  },
  renovation: {
    id: "renovation",
    evenement: "Fête de la Rénovation",
    accessoire: "Rameaux de laurier dorés",
    substitution: "Le jaune est déjà présent (anneau, jas, cordage) : la touche dorée devient des lauriers.",
    ambiance: "etincelles",
    couleurs: ["#FCD116", "#f5c542", "#fff2b0"],
  },
  "droits-femme": {
    id: "droits-femme",
    evenement: "Journée des droits de la femme",
    accessoire: "Anneau violet et symbole féminin discret",
    ambiance: "petales",
    couleurs: ["#8e44ad", "#b57edc", "#d8b4f8"],
  },
  travail: {
    id: "travail",
    evenement: "Fête du Travail",
    accessoire: "Branche de palmier traditionnelle",
    ambiance: "feuilles",
    couleurs: ["#2e8b57", "#3fa463", "#1f6e43"],
  },
  "gens-de-mer": {
    id: "gens-de-mer",
    evenement: "Journée internationale des Gens de la Mer",
    accessoire: "Barre de gouvernail",
    ambiance: "bulles",
    couleurs: ["#7fb8e6", "#bfe0f7", "#ffffff"],
  },
  independance: {
    id: "independance",
    evenement: "Fête de l'Indépendance du Gabon",
    accessoire: "Cocarde tricolore",
    substitution: "Le drapeau est déjà dans le jas de l'ancre : il devient une cocarde et des confettis tricolores.",
    ambiance: "confettis",
    couleurs: ["#009E60", "#FCD116", "#3A75C4"],
  },
  liberation: {
    id: "liberation",
    evenement: "Journée nationale de la Libération",
    accessoire: "Chaîne brisée",
    ambiance: "envol",
    couleurs: ["#ffffff", "#e8eef7"],
  },
  "journee-mer": {
    id: "journee-mer",
    evenement: "Journée mondiale de la Mer",
    accessoire: "Navire marchand fendant les vagues",
    substitution: "L'ancre est déjà le cœur du sceau : on ajoute le navire marchand.",
    ambiance: "vagues",
    couleurs: ["#3A75C4", "#7fb8e6"],
  },
  "octobre-rose": {
    id: "octobre-rose",
    evenement: "Octobre Rose",
    accessoire: "Ruban rose",
    ambiance: "rubans",
    couleurs: ["#f06292", "#f8a5c2"],
  },
  "novembre-bleu": {
    id: "novembre-bleu",
    evenement: "Novembre Bleu",
    accessoire: "Moustache bleue",
    ambiance: "bulles",
    couleurs: ["#4a90e2", "#9cc6f2", "#d6e9fb"],
  },
  sida: {
    id: "sida",
    evenement: "Journée mondiale de lutte contre le sida",
    accessoire: "Ruban rouge",
    ambiance: "rubans",
    couleurs: ["#d32f2f"],
  },
  noel: {
    id: "noel",
    evenement: "Joyeuses fêtes !",
    accessoire: "Bonnet de Noël",
    ambiance: "neige",
    couleurs: ["#ffffff"],
  },
};

/** Dernier jeudi de septembre (Journée mondiale de la Mer, fixée chaque année par l'OMI). */
function dernierJeudiSeptembre(annee: number): number {
  const d = new Date(annee, 8, 30);
  while (d.getDay() !== 4) d.setDate(d.getDate() - 1);
  return d.getDate();
}

/** Habillage du jour, ou null. Les dates précises passent avant les mois entiers. */
export function habillageDu(date: Date): Habillage | null {
  const m = date.getMonth() + 1;
  const j = date.getDate();
  const id: HabillageId | null =
    m === 1 && j === 1
      ? "nouvel-an"
      : m === 3 && j === 12
        ? "renovation"
        : m === 4 && j === 17
          ? "droits-femme"
          : m === 5 && j === 1
            ? "travail"
            : m === 6 && j === 25
              ? "gens-de-mer"
              : m === 8 && (j === 16 || j === 17)
                ? "independance"
                : m === 8 && j === 30
                  ? "liberation"
                  : m === 9 && j === dernierJeudiSeptembre(date.getFullYear())
                    ? "journee-mer"
                    : m === 10
                      ? "octobre-rose"
                      : m === 11
                        ? "novembre-bleu"
                        : m === 12 && j === 1
                          ? "sida"
                          : m === 12 && j >= 20 && j <= 26
                            ? "noel"
                            : null;
  return id ? HABILLAGES[id] : null;
}

const APERCU = "dgmm-habillage-apercu";

/**
 * Habillage actif. Pour prévisualiser un autre événement : ajouter `?habillage=noel`
 * (ou tout autre identifiant) à l'adresse ; `?habillage=auto` revient au calendrier,
 * `?habillage=aucun` retire tout habillage pendant la session.
 */
export function useHabillage(): Habillage | null {
  const [h, setH] = useState<Habillage | null>(null);
  useEffect(() => {
    let force: string | null = null;
    try {
      const q = new URLSearchParams(window.location.search).get("habillage");
      if (q === "auto") window.sessionStorage.removeItem(APERCU);
      else if (q) window.sessionStorage.setItem(APERCU, q);
      force = window.sessionStorage.getItem(APERCU);
    } catch {
      /* stockage indisponible : calendrier seul */
    }
    if (force === "aucun") setH(null);
    else if (force && force in HABILLAGES) setH(HABILLAGES[force as HabillageId]);
    else setH(habillageDu(new Date()));
  }, []);
  return h;
}
