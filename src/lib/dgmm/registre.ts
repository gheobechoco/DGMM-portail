import { TOUS_NAVIRES, type TypeFlotte } from "@/lib/dgmm/maritime";
import { imoValide } from "@/lib/dgmm/conformite";
import type { DemandeArmateur } from "@/lib/dgmm/inscriptions";

/**
 * Règles d'inscription d'un navire au registre gabonais (contrôles faits dès la saisie).
 *
 * - Nom : unique sous pavillon gabonais, soumis à l'approbation préalable de la DGMM,
 *   puis marqué à la proue et à la poupe avec le port d'attache.
 * - Numéro OMI : « IMO » + 7 chiffres (clé de contrôle), obligatoire pour les navires de
 *   charge de 300 GT et plus et les navires à passagers de 100 GT et plus ; il suit la coque
 *   toute sa vie (changement de nom, de propriétaire ou de pavillon).
 * - Jauge brute (GT) : volume des espaces clos (Convention de 1969 sur le jaugeage), pas un
 *   poids. Elle fixe la tranche des droits de pavillon, l'effectif de sécurité et les règles
 *   de sécurité applicables.
 * - Indicatif d'appel radio : attribué par l'administration gabonaise (préfixe UIT « TR »).
 */

export type CategorieNavire = "charge" | "passagers" | "peche" | "servitude" | "plaisance";

export const CATEGORIES_NAVIRE: Record<CategorieNavire, string> = {
  charge: "Navire de charge (marchandises, pétrolier, ravitailleur)",
  passagers: "Navire à passagers",
  peche: "Navire de pêche",
  servitude: "Servitude portuaire (remorqueur, pilotine, drague)",
  plaisance: "Plaisance professionnelle",
};

/** Correspondance avec les segments d'activité utilisés dans le reste du portail. */
export const SEGMENT_PAR_CATEGORIE: Record<CategorieNavire, TypeFlotte> = {
  charge: "Cabotage",
  passagers: "Transport de passagers",
  peche: "Pêche",
  servitude: "Remorquage / portuaire",
  plaisance: "Transport de passagers",
};

export const PORTS_ATTACHE = ["Libreville", "Owendo", "Port-Gentil", "Gamba", "Mayumba", "Lambaréné", "Cocobeach"] as const;

/** Sociétés de classification ; « Autre » doit être justifiée auprès de la DGMM. */
export const SOCIETES_CLASSIFICATION = [
  "Bureau Veritas (BV)",
  "DNV",
  "Lloyd's Register (LR)",
  "American Bureau of Shipping (ABS)",
  "ClassNK",
  "RINA",
  "Korean Register (KR)",
  "Indian Register of Shipping (IRS)",
  "Non classé (petit navire)",
  "Autre (à justifier)",
] as const;

/** Pièces exigées pour chaque navire. */
export type PieceNavire = "radiation" | "propriete" | "classe" | "jaugeage";
export const PIECES_NAVIRE: Record<PieceNavire, { titre: string; detail: string }> = {
  radiation: {
    titre: "Certificat de radiation du pavillon précédent",
    detail: "Preuve que le navire a quitté son ancien registre (interdit le double pavillon).",
  },
  propriete: {
    titre: "Titre de propriété",
    detail: "Contrat d'achat (Bill of Sale) ou certificat du constructeur (Builder's Certificate).",
  },
  classe: {
    titre: "Certificats de classe",
    detail: "Délivrés par une société de classification reconnue par le Gabon : solidité et conformité de la structure.",
  },
  jaugeage: {
    titre: "Certificat international de jaugeage (1969)",
    detail: "Justifie la jauge brute déclarée.",
  },
};

export interface NavireDeclare {
  nom: string;
  portAttache: string;
  categorie: CategorieNavire;
  jauge: number;
  /** « IMO » + 7 chiffres, ou vide si le navire n'en relève pas. */
  imo: string;
  /** Vide si l'armateur demande l'attribution par l'administration. */
  indicatif: string;
  indicatifADemander: boolean;
  mmsi: string;
  puissanceKw: number;
  anneeConstruction: string;
  classe: string;
  provenance: "neuf" | "transfert";
  ancienPavillon: string;
  /** Nom des fichiers joints (démonstration : le fichier lui-même n'est pas conservé). */
  pieces: Partial<Record<PieceNavire, string>>;
  /** Décision de la DGMM sur le nom proposé. */
  nomStatut: "en_attente" | "approuve" | "refuse";
  nomMotif?: string | undefined;
}

/* ---------- Nom ---------- */

const PREFIXES = /^(M\/?V|M\/?T|M\/?S|F\/?V|R\/?V|S\/?S|NAVIRE|BATEAU)\s+/;

/** Forme comparable d'un nom : majuscules, sans accents ni préfixe d'usage (MV, MT…). */
export function nomNormalise(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(PREFIXES, "")
    .trim();
}

export interface Occupant {
  nom: string;
  armateur: string;
  etat: "immatricule" | "en_cours";
}

/**
 * Noms, numéros OMI et indicatifs déjà utilisés sous pavillon gabonais :
 * référentiel, comptes ouverts, et demandes en cours d'examen (noms réservés).
 */
export function registreOccupe(demandes: DemandeArmateur[], sauf?: number) {
  const noms = new Map<string, Occupant>();
  const imos = new Map<string, Occupant>();
  const indicatifs = new Map<string, Occupant>();
  const ajoute = (nom: string, imo: string, indicatif: string, armateur: string, etat: Occupant["etat"]) => {
    const o = { nom, armateur, etat };
    if (nom) noms.set(nomNormalise(nom), o);
    const i = imoNormalise(imo);
    if (i) imos.set(i, o);
    if (indicatif) indicatifs.set(indicatif.toUpperCase().replace(/\s/g, ""), o);
  };
  TOUS_NAVIRES.filter((n) => /gabon/i.test(n.pavillon)).forEach((n) => ajoute(n.nom, n.imo, "", n.armateur, "immatricule"));
  demandes
    .filter((d) => d.id !== sauf && d.statut !== "refusee")
    .forEach((d) => {
      const etat = d.statut === "validee" ? "immatricule" : "en_cours";
      if (d.flotte?.length)
        d.flotte.filter((n) => n.nomStatut !== "refuse").forEach((n) => ajoute(n.nom, n.imo, n.indicatif, d.raisonSociale, etat));
      else d.navires.forEach((n) => ajoute(n.nom, n.imo, "", d.raisonSociale, etat));
    });
  return { noms, imos, indicatifs };
}

/* ---------- Numéro OMI ---------- */

/** « IMO 9074729 », « imo9074729 » ou « 9074729 » → « IMO9074729 » ; vide si autre chose. */
export function imoNormalise(saisie: string): string {
  const m = saisie.trim().toUpperCase().replace(/\s/g, "").match(/^(?:IMO)?(\d{7})$/);
  return m ? `IMO${m[1]}` : "";
}

/** Le numéro OMI est-il obligatoire pour ce navire ? */
export function imoObligatoire(categorie: CategorieNavire, jauge: number): boolean {
  return (categorie === "charge" && jauge >= 300) || (categorie === "passagers" && jauge >= 100);
}

/* ---------- Jauge ---------- */

/** Tranche de jauge (sert au barème des droits de pavillon fixé par la DGMM). */
export function trancheJauge(gt: number): string {
  if (gt < 100) return "moins de 100 GT";
  if (gt < 500) return "100 à 499 GT";
  if (gt < 3000) return "500 à 2 999 GT";
  return "3 000 GT et plus";
}

/** Ce qu'entraîne la jauge déclarée (repères réglementaires, à titre d'information). */
export function consequencesJauge(categorie: CategorieNavire, gt: number): string[] {
  if (!gt) return [];
  const out = [`Tranche ${trancheJauge(gt)} pour les droits annuels de pavillon.`];
  out.push(imoObligatoire(categorie, gt) ? "Numéro OMI obligatoire." : "Numéro OMI facultatif pour ce navire.");
  if (categorie === "charge" && gt >= 500) out.push("Convention SOLAS complète et code ISM (gestion de la sécurité).");
  else if (categorie === "passagers") out.push("Règles SOLAS des navires à passagers et code ISM.");
  if (categorie === "charge" && gt >= 300) out.push("Certificat de sécurité radio (SMDSM) exigé.");
  if (gt >= 400) out.push("Certificat de prévention de la pollution par les hydrocarbures (MARPOL, IOPP).");
  return out;
}

/* ---------- Indicatif d'appel et MMSI ---------- */

/** Indicatif gabonais : préfixe UIT « TR » suivi de 2 à 5 lettres ou chiffres. */
export function indicatifValide(s: string): boolean {
  return /^TR[A-Z0-9]{2,5}$/.test(s.toUpperCase().replace(/\s/g, ""));
}
/** MMSI gabonais : 9 chiffres commençant par l'identifiant maritime du Gabon, 626. */
export function mmsiValide(s: string): boolean {
  return /^626\d{6}$/.test(s.replace(/\s/g, ""));
}

/** Téléphone gabonais (0X XX XX XX XX, avec ou sans +241) ou numéro international complet. */
export function telValide(s: string): boolean {
  const d = s.replace(/[\s.-]/g, "");
  return /^(?:\+241|00241)?0[1-8]\d{7}$/.test(d) || /^\+\d{8,15}$/.test(d);
}

/* ---------- Contrôle complet d'un navire ---------- */

export type ErreursNavire = Partial<Record<"nom" | "portAttache" | "categorie" | "jauge" | "imo" | "indicatif" | "mmsi" | "puissanceKw" | "classe" | "ancienPavillon" | PieceNavire, string>>;

export function piecesExigees(n: Pick<NavireDeclare, "provenance" | "classe">): PieceNavire[] {
  return [
    ...(n.provenance === "transfert" ? (["radiation"] as const) : []),
    "propriete",
    ...(n.classe.startsWith("Non classé") ? [] : (["classe"] as const)),
  ];
}

export function controlerNavire(
  n: NavireDeclare,
  occupe: ReturnType<typeof registreOccupe>,
  autres: NavireDeclare[],
  avecPieces: boolean,
): ErreursNavire {
  const e: ErreursNavire = {};
  const nom = nomNormalise(n.nom);
  if (nom.length < 2) e.nom = "Indiquez le nom proposé.";
  else {
    const pris = occupe.noms.get(nom);
    if (pris) e.nom = pris.etat === "immatricule" ? `Nom déjà porté par un navire gabonais (${pris.armateur}).` : `Nom déjà réservé par une demande en cours (${pris.armateur}).`;
    else if (autres.some((x) => nomNormalise(x.nom) === nom)) e.nom = "Deux navires de votre flotte portent ce nom.";
  }
  if (!n.portAttache) e.portAttache = "Choisissez le port d'attache.";
  if (!n.jauge || n.jauge <= 0) e.jauge = "Indiquez la jauge brute figurant sur le certificat de jaugeage.";
  const imo = imoNormalise(n.imo);
  if (n.imo.trim() && !imo) e.imo = "Format attendu : IMO suivi de 7 chiffres (ex. IMO 9074729).";
  else if (imo && !imoValide(imo)) e.imo = "Clé de contrôle incorrecte : vérifiez les chiffres.";
  else if (imo && occupe.imos.has(imo)) e.imo = `Numéro déjà attribué au navire ${occupe.imos.get(imo)!.nom}.`;
  else if (imo && autres.some((x) => imoNormalise(x.imo) === imo)) e.imo = "Numéro en double dans votre flotte.";
  else if (!imo && imoObligatoire(n.categorie, n.jauge)) e.imo = "Obligatoire pour ce navire (charge ≥ 300 GT ou passagers ≥ 100 GT).";
  if (!n.indicatifADemander) {
    const ind = n.indicatif.toUpperCase().replace(/\s/g, "");
    if (!indicatifValide(ind)) e.indicatif = "Indicatif gabonais : TR suivi de 2 à 5 caractères, ou demandez son attribution.";
    else if (occupe.indicatifs.has(ind) || autres.some((x) => x.indicatif.toUpperCase().replace(/\s/g, "") === ind)) e.indicatif = "Indicatif déjà attribué à un autre navire.";
  }
  if (n.mmsi.trim() && !mmsiValide(n.mmsi)) e.mmsi = "9 chiffres commençant par 626 (Gabon).";
  if (!n.puissanceKw || n.puissanceKw <= 0) e.puissanceKw = "Indiquez la puissance propulsive (kW).";
  if (!n.classe) e.classe = "Choisissez la société de classification.";
  if (n.provenance === "transfert" && !n.ancienPavillon.trim()) e.ancienPavillon = "Indiquez le pavillon précédent.";
  if (avecPieces) for (const p of piecesExigees(n)) if (!n.pieces[p]) e[p] = "Pièce obligatoire.";
  return e;
}

export function navireVide(): NavireDeclare {
  return {
    nom: "", portAttache: "", categorie: "charge", jauge: 0, imo: "", indicatif: "", indicatifADemander: true, mmsi: "",
    puissanceKw: 0, anneeConstruction: "", classe: "", provenance: "transfert", ancienPavillon: "", pieces: {}, nomStatut: "en_attente",
  };
}
