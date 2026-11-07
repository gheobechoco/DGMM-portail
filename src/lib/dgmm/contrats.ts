import { useEffect, useSyncExternalStore } from "react";
import {
  empreinte,
  fullName,
  journaliser,
  marinCertStatus,
  useMarins,
  type Marin,
  type Visite,
} from "@/lib/dgmm/store";

/**
 * Contrats d'engagement maritime (CEM).
 *
 * Le contrat suit un modèle unique : l'armateur ne saisit que les éléments variables
 * (dates, fonction, salaire, indemnités…), les clauses sont fixées par la DGMM.
 * Il n'est valable qu'avec trois signatures : l'armateur, le marin, puis l'inspecteur
 * de la DGMM, qui vérifie la conformité. À cette dernière signature, le contenu est
 * scellé par une empreinte : toute modification ultérieure est détectée.
 */

export type StatutCEM =
  | "attente_marin"
  | "attente_dgmm"
  | "actif"
  | "refuse_marin"
  | "refuse_dgmm"
  | "termine";

export type Navigation = "offshore" | "cabotage" | "portuaire" | "peche" | "long_cours";

export interface Signature {
  par: string;
  le: string;
}

export interface Contrat {
  id: number;
  numero: string;
  marinId: number;
  nip: string;
  marinNom: string;
  armateur: string;
  navire: string;
  fonction: string;
  navigation: Navigation;
  dateDebut: string;
  dateFin: string;
  /** Montants mensuels en francs CFA (XAF). */
  salaireBase: number;
  primeRisque: number;
  indemniteNourriture: number;
  indemniteLogement: number;
  heuresHebdo: number;
  congesJoursMois: number;
  portRapatriement: string;
  rapatriementArmateur: boolean;
  numeroCNSS: string;
  creeLe: string;
  signatures: { armateur?: Signature | undefined; marin?: Signature | undefined; dgmm?: Signature | undefined };
  motifRefus?: string | undefined;
  /** Empreinte du contenu, posée à la validation DGMM. */
  sceau?: string | undefined;
  /** Mois (AAAA-MM) dont l'armateur a déclaré le versement du salaire et des cotisations. */
  versements: { mois: string; le: string }[];
  rapatriement?: { demandeLe: string; motif: string; statut: "demande" | "organise"; organiseLe?: string | undefined } | undefined;
}

export const STATUT_LIBELLE: Record<StatutCEM, string> = {
  attente_marin: "En attente de la signature du marin",
  attente_dgmm: "En attente de validation DGMM",
  actif: "En vigueur",
  refuse_marin: "Refusé par le marin",
  refuse_dgmm: "Refusé par la DGMM",
  termine: "Terminé",
};

export const NAVIGATION_LIBELLE: Record<Navigation, string> = {
  offshore: "Offshore pétrolier et gazier",
  cabotage: "Cabotage national",
  portuaire: "Service portuaire et remorquage",
  peche: "Pêche",
  long_cours: "Long cours",
};

/**
 * Salaire mensuel minimum de référence retenu pour le contrôle automatique.
 * Valeur paramétrable : à fixer par la DGMM selon le SMIG et la convention collective en vigueur.
 */
export const SALAIRE_MINIMUM = 150_000;
/** Convention du travail maritime (MLC 2006, OIT) : repères utilisés par les contrôles. */
export const REGLES = {
  dureeMaxMois: 11, // période d'embarquement inférieure à 12 mois (norme A2.5)
  congesMinJoursMois: 2.5, // congés payés : 2,5 jours civils par mois (norme A2.4)
  heuresMaxSemaine: 72, // au plus 72 heures sur 7 jours (norme A2.3)
};

export function statut(c: Contrat): StatutCEM {
  if (c.motifRefus && !c.signatures.marin) return "refuse_marin";
  if (c.motifRefus) return "refuse_dgmm";
  if (!c.signatures.marin) return "attente_marin";
  if (!c.signatures.dgmm) return "attente_dgmm";
  return c.dateFin < new Date().toISOString().slice(0, 10) ? "termine" : "actif";
}

const fcfa = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;
const date = (d: string) => (d ? new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—");
export const formatFcfa = fcfa;

export function moisEntre(debut: string, fin: string): number {
  const a = new Date(debut + "T12:00:00"), b = new Date(fin + "T12:00:00");
  return (b.getTime() - a.getTime()) / (30.44 * 86400000);
}

/** Clauses du modèle DGMM : le texte est fixe, seules les valeurs viennent du contrat. */
export function clauses(c: Contrat): { titre: string; texte: string }[] {
  return [
    { titre: "Article 1 — Parties", texte: `Entre ${c.armateur}, armateur, et ${c.marinNom}, marin titulaire du NIP ${c.nip}, il est conclu le présent contrat d'engagement maritime, conformément au Code de la Marine marchande et à la Convention du travail maritime de l'OIT (MLC 2006).` },
    { titre: "Article 2 — Fonction et navire", texte: `Le marin est engagé en qualité de ${c.fonction} à bord du navire ${c.navire || "désigné par l'armateur"}, en navigation de type « ${NAVIGATION_LIBELLE[c.navigation].toLowerCase()} ».` },
    { titre: "Article 3 — Durée", texte: `Le contrat prend effet le ${date(c.dateDebut)} et prend fin le ${date(c.dateFin)}. La période d'embarquement continue ne peut excéder ${REGLES.dureeMaxMois} mois.` },
    { titre: "Article 4 — Rémunération", texte: `Salaire de base mensuel : ${fcfa(c.salaireBase)}. Prime de risque : ${fcfa(c.primeRisque)}. Indemnité de nourriture : ${fcfa(c.indemniteNourriture)}. Indemnité de logement : ${fcfa(c.indemniteLogement)}. Le salaire est versé au moins une fois par mois et ne peut être réduit unilatéralement.` },
    { titre: "Article 5 — Durée du travail et repos", texte: `La durée du travail est fixée à ${c.heuresHebdo} heures par semaine, sans dépasser ${REGLES.heuresMaxSemaine} heures sur une période de 7 jours. Les heures de repos réglementaires sont garanties.` },
    { titre: "Article 6 — Congés payés", texte: `Le marin acquiert ${c.congesJoursMois.toLocaleString("fr-FR")} jours de congés payés par mois de service.` },
    { titre: "Article 7 — Protection sociale et santé", texte: `L'armateur déclare le marin à la Caisse nationale de sécurité sociale (n° ${c.numeroCNSS || "à compléter"}) et verse chaque mois les cotisations dues. Les soins médicaux à bord et à terre liés au service sont à sa charge.` },
    { titre: "Article 8 — Rapatriement", texte: `En fin de contrat, en cas de maladie, d'accident ou de naufrage, le marin est rapatrié vers ${c.portRapatriement} ${c.rapatriementArmateur ? "aux frais de l'armateur" : "(prise en charge non précisée)"}.` },
    { titre: "Article 9 — Modification", texte: "Toute modification fait l'objet d'un nouveau contrat signé par les trois parties. Aucune clause ne peut être modifiée après la validation de la DGMM." },
  ];
}

export interface Controle {
  libelle: string;
  ok: boolean;
  detail: string;
}

/** Contrôles de conformité faits avant la validation DGMM. */
export function controles(c: Contrat, marin: Marin | undefined, visites: Visite[]): Controle[] {
  const duree = moisEntre(c.dateDebut, c.dateFin);
  const cert = marin ? marinCertStatus(visites, marin.id, new Date(c.dateDebut + "T12:00:00")) : "aucun";
  return [
    { libelle: "Salaire de base au moins égal au minimum de référence", ok: c.salaireBase >= SALAIRE_MINIMUM, detail: `${fcfa(c.salaireBase)} pour un minimum de ${fcfa(SALAIRE_MINIMUM)}` },
    { libelle: `Durée d'engagement d'au plus ${REGLES.dureeMaxMois} mois (MLC, norme A2.5)`, ok: duree > 0 && duree <= REGLES.dureeMaxMois + 0.05, detail: duree > 0 ? `${duree.toFixed(1).replace(".", ",")} mois` : "Dates incohérentes" },
    { libelle: `Au moins ${REGLES.congesMinJoursMois.toLocaleString("fr-FR")} jours de congés par mois (MLC, norme A2.4)`, ok: c.congesJoursMois >= REGLES.congesMinJoursMois, detail: `${c.congesJoursMois.toLocaleString("fr-FR")} jours par mois` },
    { libelle: `Durée du travail d'au plus ${REGLES.heuresMaxSemaine} h par semaine (MLC, norme A2.3)`, ok: c.heuresHebdo > 0 && c.heuresHebdo <= REGLES.heuresMaxSemaine, detail: `${c.heuresHebdo} h par semaine` },
    { libelle: "Rapatriement à la charge de l'armateur (MLC, norme A2.5)", ok: c.rapatriementArmateur && !!c.portRapatriement.trim(), detail: c.rapatriementArmateur ? `Vers ${c.portRapatriement || "port non précisé"}` : "Non garanti" },
    { libelle: "Affiliation à la sécurité sociale renseignée", ok: !!c.numeroCNSS.trim(), detail: c.numeroCNSS || "N° CNSS manquant" },
    { libelle: "Certificat médical STCW valide au début du contrat", ok: cert === "valide" || cert === "expire_bientot", detail: cert === "aucun" ? "Aucun certificat" : cert === "expire" ? "Certificat expiré" : "Valide" },
    { libelle: "Visa administratif DGMM du marin accordé", ok: marin?.validationAdmin === "validee", detail: marin?.validationAdmin === "validee" ? "Accordé" : "Non accordé" },
  ];
}

/** Contenu scellé : clauses et valeurs, dans un ordre fixe. */
function contenu(c: Contrat): string {
  return JSON.stringify([c.numero, c.nip, c.armateur, c.navire, c.fonction, c.navigation, c.dateDebut, c.dateFin, c.salaireBase, c.primeRisque, c.indemniteNourriture, c.indemniteLogement, c.heuresHebdo, c.congesJoursMois, c.portRapatriement, c.rapatriementArmateur, c.numeroCNSS, c.signatures.armateur?.le, c.signatures.marin?.le]);
}
export function sceauIntact(c: Contrat): boolean | null {
  return c.sceau ? empreinte(contenu(c)) === c.sceau : null;
}

/** Mois du contrat écoulés à ce jour (AAAA-MM), avec l'état du versement. */
export function echeancier(c: Contrat, now = new Date()): { mois: string; etat: "verse" | "retard" | "en_cours" }[] {
  const out: { mois: string; etat: "verse" | "retard" | "en_cours" }[] = [];
  const d = new Date(c.dateDebut + "T12:00:00");
  const fin = new Date(Math.min(new Date(c.dateFin + "T12:00:00").getTime(), now.getTime()));
  d.setDate(1);
  while (d <= fin) {
    const mois = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const limite = new Date(d.getFullYear(), d.getMonth() + 1, 15); // le 15 du mois suivant
    const verse = c.versements.some((v) => v.mois === mois);
    out.push({ mois, etat: verse ? "verse" : now > limite ? "retard" : "en_cours" });
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}
export const libelleMois = (m: string) => new Date(m + "-15T12:00:00").toLocaleDateString("fr-FR", { month: "short", year: "numeric" });

/* ---------- Stockage ---------- */

const KEY = "dgmm-contrats-v1";
const listeners = new Set<() => void>();
/** Référence stable : useSyncExternalStore exige un instantané identique d'un appel à l'autre. */
const VIDE: Contrat[] = [];
let cache: Contrat[] | null = null;

function lire(): Contrat[] {
  if (typeof window === "undefined") return VIDE;
  if (!cache) {
    try {
      cache = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Contrat[] | null;
    } catch {
      cache = null;
    }
  }
  return cache ?? VIDE;
}
function ecrire(l: Contrat[]) {
  cache = l;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(l));
  } catch {
    /* stockage plein */
  }
  listeners.forEach((f) => f());
}
const iso = (d: Date) => d.toISOString().slice(0, 10);
const numero = (id: number) => `CEM-${new Date().getFullYear()}-${String(id).padStart(4, "0")}`;

/** Jeu de démonstration : contrats en vigueur des marins déjà délivrés, et deux en circuit de signature. */
function semer(marins: Marin[]) {
  if (typeof window === "undefined" || window.localStorage.getItem(KEY)) return;
  const now = new Date();
  const debut = (mois: number) => { const d = new Date(now); d.setMonth(d.getMonth() - mois); return iso(d); };
  const fin = (mois: number) => { const d = new Date(now); d.setMonth(d.getMonth() + mois); return iso(d); };
  const l: Contrat[] = [];
  const base = (m: Marin, i: number): Contrat => ({
    id: i + 1, numero: numero(i + 1), marinId: m.id, nip: m.nip, marinNom: fullName(m), armateur: m.entreprise, navire: "",
    fonction: m.profession, navigation: /Perenco|Bourbon/.test(m.entreprise) ? "offshore" : /Edelweiss/.test(m.entreprise) ? "peche" : "cabotage",
    dateDebut: debut(4), dateFin: fin(6), salaireBase: 280_000 + (i % 4) * 45_000, primeRisque: /Perenco|Bourbon/.test(m.entreprise) ? 120_000 : 0,
    indemniteNourriture: 60_000, indemniteLogement: 50_000, heuresHebdo: 56, congesJoursMois: 2.5, portRapatriement: "Port-Gentil",
    rapatriementArmateur: true, numeroCNSS: `${100200 + m.id}${String(m.id).padStart(3, "0")}`, creeLe: debut(4) + "T09:00:00.000Z",
    signatures: {}, versements: [],
  });
  const avecLivret = marins.filter((m) => m.livret && m.entreprise).slice(0, 6);
  avecLivret.forEach((m, i) => {
    const c = base(m, i);
    c.signatures = { armateur: { par: m.entreprise, le: debut(4) + "T09:00:00.000Z" }, marin: { par: c.marinNom, le: debut(4) + "T15:00:00.000Z" }, dgmm: { par: "Agent DGMM", le: debut(4) + "T17:00:00.000Z" } };
    // Versements déclarés sauf le dernier mois échu pour un contrat sur trois (retard visible).
    const echus = echeancier(c).filter((e) => e.etat !== "en_cours");
    c.versements = echus.filter((e, k) => !(i % 3 === 1 && k === echus.length - 1)).map((e) => ({ mois: e.mois, le: e.mois + "-28T10:00:00.000Z" }));
    c.sceau = empreinte(contenu(c));
    l.push(c);
  });
  const autres = marins.filter((m) => m.validationAdmin === "validee" && !m.livret && m.entreprise).slice(0, 2);
  autres.forEach((m, k) => {
    const c = base(m, l.length);
    c.dateDebut = fin(0); c.dateFin = fin(8); c.creeLe = new Date().toISOString(); c.versements = [];
    c.signatures = k === 0 ? { armateur: { par: m.entreprise, le: new Date().toISOString() } } : { armateur: { par: m.entreprise, le: new Date().toISOString() }, marin: { par: c.marinNom, le: new Date().toISOString() } };
    l.push(c);
  });
  ecrire(l);
}

export function useContrats(): Contrat[] {
  const marins = useMarins();
  useEffect(() => { if (marins.length) semer(marins); }, [marins]);
  return useSyncExternalStore((f) => { listeners.add(f); return () => listeners.delete(f); }, lire, () => VIDE);
}

/* ---------- Actions (inscrites au journal d'audit) ---------- */

export type NouveauContrat = Omit<Contrat, "id" | "numero" | "creeLe" | "signatures" | "versements" | "sceau" | "motifRefus" | "rapatriement">;

export function proposerContrat(d: NouveauContrat): Contrat {
  const l = lire();
  const id = Math.max(0, ...l.map((c) => c.id)) + 1;
  const c: Contrat = { ...d, id, numero: numero(id), creeLe: new Date().toISOString(), signatures: { armateur: { par: d.armateur, le: new Date().toISOString() } }, versements: [] };
  ecrire([c, ...l]);
  journaliser(`Armateur ${d.armateur}`, `Contrat d'engagement ${c.numero} proposé et signé par l'armateur`, `${d.marinNom} (${d.nip})`);
  return c;
}

function maj(id: number, f: (c: Contrat) => Contrat) {
  ecrire(lire().map((c) => (c.id === id ? f(c) : c)));
  return lire().find((c) => c.id === id)!;
}

export function signerParMarin(id: number) {
  const c = maj(id, (c) => ({ ...c, signatures: { ...c.signatures, marin: { par: c.marinNom, le: new Date().toISOString() } } }));
  journaliser(`Marin ${c.nip}`, `Contrat ${c.numero} signé par le marin`, `${c.marinNom} (${c.nip})`);
}
export function refuserParMarin(id: number, motif: string) {
  const c = maj(id, (c) => ({ ...c, motifRefus: motif }));
  journaliser(`Marin ${c.nip}`, `Contrat ${c.numero} refusé par le marin : ${motif}`, `${c.marinNom} (${c.nip})`);
}
export function validerParDgmm(id: number, agent: string) {
  const c = maj(id, (c) => {
    const s = { ...c, signatures: { ...c.signatures, dgmm: { par: agent, le: new Date().toISOString() } } };
    return { ...s, sceau: empreinte(contenu(s)) };
  });
  journaliser(agent, `Contrat ${c.numero} validé et scellé par la DGMM`, `${c.marinNom} (${c.nip})`);
}
export function refuserParDgmm(id: number, agent: string, motif: string) {
  const c = maj(id, (c) => ({ ...c, motifRefus: motif }));
  journaliser(agent, `Contrat ${c.numero} refusé par la DGMM : ${motif}`, `${c.marinNom} (${c.nip})`);
}
export function declarerVersement(id: number, mois: string) {
  const c = maj(id, (c) => ({ ...c, versements: [...c.versements.filter((v) => v.mois !== mois), { mois, le: new Date().toISOString() }] }));
  journaliser(`Armateur ${c.armateur}`, `Versement du salaire et des cotisations de ${libelleMois(mois)} déclaré (contrat ${c.numero})`, `${c.marinNom} (${c.nip})`);
}
export function demanderRapatriement(id: number, motif: string) {
  const c = maj(id, (c) => ({ ...c, rapatriement: { demandeLe: new Date().toISOString(), motif, statut: "demande" } }));
  journaliser(`Marin ${c.nip}`, `Demande de rapatriement (contrat ${c.numero}) : ${motif}`, `${c.marinNom} (${c.nip})`);
}
export function organiserRapatriement(id: number) {
  const c = maj(id, (c) => ({ ...c, rapatriement: c.rapatriement ? { ...c.rapatriement, statut: "organise", organiseLe: new Date().toISOString() } : undefined }));
  journaliser(`Armateur ${c.armateur}`, `Rapatriement organisé (contrat ${c.numero})`, `${c.marinNom} (${c.nip})`);
}
