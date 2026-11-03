import { useSyncExternalStore } from "react";
import { journaliser } from "@/lib/dgmm/store";
import type { Account } from "@/lib/dgmm/auth";

/**
 * Alertes et signalements des gens de mer.
 *
 * - Anonymat par conception : en mode anonyme, aucune identité n'est enregistrée et le
 *   poste (navigateur, système) n'est pas inscrit au journal. Le déclarant suit son
 *   dossier avec un code personnel qu'il est seul à connaître.
 * - Routage sans intermédiaire : chaque alerte part en même temps à la Direction générale
 *   à Libreville, à l'Inspection du travail maritime et, si le marin le souhaite, au
 *   syndicat qu'il choisit.
 * - Feux tricolores : vert (social, réglementaire), orange (technique), rouge (danger
 *   grave) ; une alerte rouge appelle une inspection d'urgence au prochain port.
 */

export type Niveau = "vert" | "orange" | "rouge";
export type StatutAlerte = "recue" | "en_traitement" | "inspection_programmee" | "cloturee";
export type Syndicat = "OMEPR" | "SYNAMM" | "aucun";
export type Emetteur = "declarant" | "dgmm" | "inspection" | "syndicat";

export interface Piece {
  nom: string;
  type: string;
  data: string;
}

export interface Alerte {
  id: number;
  numero: string;
  /** Code de suivi remis au déclarant (seul moyen de retrouver une alerte anonyme). */
  code: string;
  creeLe: string;
  niveau: Niveau;
  categorie: string;
  description: string;
  navire: string;
  armateur: string;
  lieu: string;
  dateFaits: string;
  pieces: Piece[];
  anonyme: boolean;
  /** Renseignés seulement si le marin a choisi de s'identifier. */
  marinId?: number | undefined;
  declarant?: string | undefined;
  syndicat: Syndicat;
  statut: StatutAlerte;
  inspection?: { port: string; date: string; par: string } | undefined;
  conclusion?: string | undefined;
  echanges: { de: Emetteur; auteur: string; texte: string; le: string }[];
  /** Premières lectures, pour mesurer le délai de prise en charge. */
  lu: Partial<Record<"dgmm" | "inspection" | "syndicat", string>>;
}

export const NIVEAUX: Record<Niveau, { titre: string; texte: string; exemples: string; couleur: string }> = {
  vert: { titre: "Social ou réglementaire", texte: "Le problème ne met pas la vie en danger.", exemples: "Salaire en retard, nourriture insuffisante, contrat absent ou modifié", couleur: "#1F8A4C" },
  orange: { titre: "Technique, à corriger", texte: "Un équipement est défectueux, sans empêcher de naviguer tout de suite.", exemples: "Matériel usé, alarme en panne, extincteur périmé", couleur: "#D9822B" },
  rouge: { titre: "Danger grave et immédiat", texte: "Une inspection d'urgence est demandée au prochain port.", exemples: "Voie d'eau, pas de canot de sauvetage, zone de piraterie sans protection", couleur: "#C62828" },
};

export const CATEGORIES = [
  "Salaire ou cotisations non versés",
  "Contrat absent, non conforme ou modifié",
  "Nourriture, logement, conditions de vie à bord",
  "Durée du travail, repos, congés",
  "Équipement de sécurité défectueux ou absent",
  "État technique du navire",
  "Piraterie ou sûreté",
  "Pression, menace, harcèlement",
  "Formation ou certification refusée",
  "Autre",
];

export const STATUT_ALERTE: Record<StatutAlerte, string> = {
  recue: "Reçue",
  en_traitement: "En traitement",
  inspection_programmee: "Inspection programmée",
  cloturee: "Clôturée",
};

export function destinataires(a: Pick<Alerte, "syndicat">): string[] {
  return ["Direction générale de la Marine marchande (Libreville)", "Inspection du travail maritime", ...(a.syndicat !== "aucun" ? [`Délégués ${a.syndicat}`] : [])];
}

/** Ce que chaque compte du personnel peut voir. */
export function visiblePour(a: Alerte, s: Account): boolean {
  if (s.role === "delegue_syndical") return !!s.syndicat && a.syndicat === s.syndicat;
  return s.role === "gestionnaire_mm" || s.role === "inspecteur_travail";
}
export function emetteurDe(s: Account): Exclude<Emetteur, "declarant"> {
  return s.role === "delegue_syndical" ? "syndicat" : s.role === "inspecteur_travail" ? "inspection" : "dgmm";
}

/** Heures écoulées sans réponse aux déclarant (alerte non clôturée et sans échange du personnel). */
export function heuresSansReponse(a: Alerte, now = Date.now()): number | null {
  if (a.statut === "cloturee" || a.echanges.some((e) => e.de !== "declarant")) return null;
  return Math.floor((now - new Date(a.creeLe).getTime()) / 3600000);
}

/* ---------- Stockage ---------- */

const KEY = "dgmm-alertes-v1";
const listeners = new Set<() => void>();
/** Référence stable : useSyncExternalStore exige un instantané identique d'un appel à l'autre. */
const VIDE: Alerte[] = [];
let cache: Alerte[] | null = null;
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function codeSuivi(): string {
  const t = new Uint32Array(10);
  crypto.getRandomValues(t);
  return [...t].map((n, i) => (i === 5 ? "-" : "") + ALPHABET[n % ALPHABET.length]).join("");
}

function exemples(): Alerte[] {
  const il = (h: number) => new Date(Date.now() - h * 3600000).toISOString();
  return [
    {
      id: 2, numero: `ALR-${new Date().getFullYear()}-0002`, code: "EXEMP-LE002", creeLe: il(30), niveau: "rouge", categorie: "Équipement de sécurité défectueux ou absent",
      description: "Exemple de démonstration : un des deux canots de sauvetage est hors service depuis deux semaines et le navire continue ses rotations vers les plateformes.",
      navire: "Navire de démonstration", armateur: "Compagnie de démonstration", lieu: "Au large de Port-Gentil", dateFaits: il(48).slice(0, 10), pieces: [], anonyme: true,
      syndicat: "SYNAMM", statut: "recue", echanges: [], lu: {},
    },
    {
      id: 1, numero: `ALR-${new Date().getFullYear()}-0001`, code: "EXEMP-LE001", creeLe: il(120), niveau: "vert", categorie: "Salaire ou cotisations non versés",
      description: "Exemple de démonstration : salaire du mois dernier non versé, l'employeur ne répond plus.",
      navire: "Navire de démonstration", armateur: "Compagnie de démonstration", lieu: "Port d'Owendo", dateFaits: il(240).slice(0, 10), pieces: [], anonyme: false, declarant: "Marin (exemple)",
      syndicat: "OMEPR", statut: "en_traitement", lu: { dgmm: il(100) },
      echanges: [{ de: "dgmm", auteur: "Direction générale", texte: "Votre signalement est pris en charge : l'armateur est convoqué.", le: il(96) }],
    },
  ];
}

function lire(): Alerte[] {
  if (typeof window === "undefined") return VIDE;
  if (!cache) {
    try {
      const brut = window.localStorage.getItem(KEY);
      cache = brut ? (JSON.parse(brut) as Alerte[]) : exemples();
    } catch {
      cache = [];
    }
  }
  return cache;
}
function ecrire(l: Alerte[]): string | null {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(l));
  } catch {
    return "Espace de stockage plein : retirez une pièce jointe ou réduisez sa taille.";
  }
  cache = l;
  listeners.forEach((f) => f());
  return null;
}

export function useAlertes(): Alerte[] {
  return useSyncExternalStore((f) => { listeners.add(f); return () => listeners.delete(f); }, lire, () => VIDE);
}

export type NouvelleAlerte = Omit<Alerte, "id" | "numero" | "code" | "creeLe" | "statut" | "echanges" | "lu">;

export function deposerAlerte(d: NouvelleAlerte): Alerte | string {
  const l = lire();
  const id = Math.max(0, ...l.map((a) => a.id)) + 1;
  const a: Alerte = { ...d, id, numero: `ALR-${new Date().getFullYear()}-${String(id).padStart(4, "0")}`, code: codeSuivi(), creeLe: new Date().toISOString(), statut: "recue", echanges: [], lu: {} };
  const err = ecrire([a, ...l]);
  if (err) return err;
  journaliser(
    a.anonyme ? "Signalement anonyme" : `Marin ${d.declarant ?? ""}`.trim(),
    `Alerte ${a.numero} (${a.niveau}) déposée : ${a.categorie}`,
    a.navire || a.armateur || "Non précisé",
    { masquerPoste: a.anonyme },
  );
  return a;
}

export function alerteParCode(code: string): Alerte | undefined {
  const c = code.trim().toUpperCase();
  return lire().find((a) => a.code === c);
}

function maj(id: number, f: (a: Alerte) => Alerte) {
  ecrire(lire().map((a) => (a.id === id ? f(a) : a)));
  return lire().find((a) => a.id === id)!;
}

export function marquerLu(id: number, qui: "dgmm" | "inspection" | "syndicat") {
  const a = lire().find((x) => x.id === id);
  if (!a || a.lu[qui]) return;
  maj(id, (x) => ({ ...x, lu: { ...x.lu, [qui]: new Date().toISOString() }, statut: x.statut === "recue" && qui !== "syndicat" ? "en_traitement" : x.statut }));
}

export function repondre(id: number, de: Emetteur, auteur: string, texte: string) {
  const a = maj(id, (x) => ({ ...x, echanges: [...x.echanges, { de, auteur, texte, le: new Date().toISOString() }] }));
  if (de !== "declarant") journaliser(auteur, `Réponse sur l'alerte ${a.numero}`, a.navire || a.armateur || "Non précisé");
}

export function programmerInspection(id: number, port: string, date: string, par: string) {
  const a = maj(id, (x) => ({ ...x, statut: "inspection_programmee", inspection: { port, date, par }, echanges: [...x.echanges, { de: "inspection", auteur: par, texte: `Inspection programmée à ${port} le ${new Date(date).toLocaleDateString("fr-FR")}.`, le: new Date().toISOString() }] }));
  journaliser(par, `Inspection programmée à ${port} (alerte ${a.numero})`, a.navire || a.armateur || "Non précisé");
}

export function cloturer(id: number, par: string, conclusion: string) {
  const a = maj(id, (x) => ({ ...x, statut: "cloturee", conclusion, echanges: [...x.echanges, { de: "dgmm", auteur: par, texte: `Dossier clôturé : ${conclusion}`, le: new Date().toISOString() }] }));
  journaliser(par, `Alerte ${a.numero} clôturée : ${conclusion}`, a.navire || a.armateur || "Non précisé");
}

/* ---------- Pièces jointes ---------- */

/** Photo réduite à 1280 px (JPEG) pour tenir dans le stockage ; vidéo acceptée jusqu'à 2 Mo. */
export async function lirePiece(f: File): Promise<Piece | string> {
  if (f.type.startsWith("image/")) {
    const url = URL.createObjectURL(f);
    try {
      const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
      const k = Math.min(1, 1280 / Math.max(img.width, img.height));
      const cv = document.createElement("canvas");
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext("2d")!.drawImage(img, 0, 0, cv.width, cv.height);
      return { nom: f.name, type: "image/jpeg", data: cv.toDataURL("image/jpeg", 0.72) };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  if (f.type.startsWith("video/")) {
    if (f.size > 2 * 1024 * 1024) return "Vidéo trop lourde (2 Mo au plus) : filmez un passage plus court.";
    const data = await new Promise<string>((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.readAsDataURL(f); });
    return { nom: f.name, type: f.type, data };
  }
  return "Seules les photos et les vidéos courtes sont acceptées.";
}
