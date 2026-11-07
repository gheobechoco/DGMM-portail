import { useSyncExternalStore } from "react";

/**
 * Médecins des gens de mer : structures de rattachement, registre des médecins agréés
 * (assermentés par la DGMM) et demandes d'agrément ou de renouvellement.
 *
 * Circuit : le médecin dépose sa demande sur le portail public → le RH de la DGMM contrôle
 * les pièces → le Directeur assermente et scelle : numéro AGM-AAAA-NNNN, compte médecin
 * rattaché à sa structure, validité de 3 ans (à confirmer par la DGMM).
 *
 * Ce module ne dépend pas du magasin principal (store.ts) : les pages inscrivent elles-mêmes
 * les décisions au journal d'audit.
 */

export const DUREE_AGREMENT_ANS = 3;

export interface StructureMedicale {
  code: string;
  nom: string;
  ville: string;
}

/** Liste de démonstration, à remplacer par la liste officielle des structures agréées. */
export const STRUCTURES_MEDICALES: StructureMedicale[] = [
  { code: "CMGM-OWE", nom: "Centre médical des gens de mer d'Owendo", ville: "Owendo" },
  { code: "CLI-POG", nom: "Clinique du Littoral", ville: "Port-Gentil" },
  { code: "MDT-LBV", nom: "Service de médecine du travail maritime", ville: "Libreville" },
  { code: "CMS-GAM", nom: "Centre médico-social de Gamba", ville: "Gamba" },
];
export const structure = (code: string | undefined) => STRUCTURES_MEDICALES.find((s) => s.code === code);

export interface MedecinAgree {
  id: number;
  numero: string;
  nom: string;
  prenom: string;
  /** Nom tel qu'il figure sur les visites (« Dr NOM Prénom »). */
  nomAffiche: string;
  onmg: string;
  structure: string;
  agreeLe: string;
  expireLe: string;
  /** Compte de connexion (rôle médecin). */
  username?: string | undefined;
  password?: string | undefined;
  historique: { date: string; action: string; par: string }[];
}

export type StatutDemande = "en_instruction" | "attente_directeur" | "assermente" | "rejete";
export type PieceAgrement = "diplome" | "onmg" | "maritime";
export const PIECES_AGREMENT: Record<PieceAgrement, { titre: string; obligatoire: boolean }> = {
  diplome: { titre: "Diplôme de docteur en médecine", obligatoire: true },
  onmg: { titre: "Attestation d'inscription à l'Ordre des médecins à jour", obligatoire: true },
  maritime: { titre: "Formation ou spécialisation en médecine maritime (si acquise)", obligatoire: false },
};

export interface DemandeAgrement {
  id: number;
  numero: string;
  creeLe: string;
  type: "initiale" | "renouvellement";
  ancienNumero?: string | undefined;
  nom: string;
  prenom: string;
  onmg: string;
  structure: string;
  tel: string;
  email: string;
  identifiant: string;
  motDePasse: string;
  pieces: Partial<Record<PieceAgrement, string>>;
  /** Contrôle des pièces par le RH. */
  controles: Partial<Record<PieceAgrement, boolean>>;
  statut: StatutDemande;
  instruitPar?: string | undefined;
  instruitLe?: string | undefined;
  decidePar?: string | undefined;
  decideLe?: string | undefined;
  motif?: string | undefined;
  medecinNumero?: string | undefined;
}

export const STATUT_DEMANDE: Record<StatutDemande, { libelle: string; ton: string }> = {
  en_instruction: { libelle: "En instruction (RH)", ton: "bg-warning/15 text-warning" },
  attente_directeur: { libelle: "En attente de signature du Directeur", ton: "bg-secondary/15 text-secondary" },
  assermente: { libelle: "Agréé DGMM", ton: "bg-success/12 text-success" },
  rejete: { libelle: "Rejetée", ton: "bg-destructive/12 text-destructive" },
};

/* ---------- Règles ---------- */

export const normNom = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/^DR\.?\s+/, "").replace(/[^A-Z ]/g, " ").replace(/\s+/g, " ").trim();

export function ajouterAns(dateIso: string, ans: number): string {
  const d = new Date(dateIso.slice(0, 10) + "T12:00:00");
  d.setFullYear(d.getFullYear() + ans);
  return d.toISOString().slice(0, 10);
}

export type EtatAgrement = "valide" | "a_renouveler" | "expire";
/** Agrément à renouveler dans les 90 jours, expiré au-delà de la date. */
export function etatAgrement(m: Pick<MedecinAgree, "expireLe">, now = new Date()): { etat: EtatAgrement; jours: number } {
  const jours = Math.ceil((new Date(m.expireLe + "T23:59:59").getTime() - now.getTime()) / 86_400_000);
  return { etat: jours < 0 ? "expire" : jours <= 90 ? "a_renouveler" : "valide", jours };
}

/** Médecin d'une visite : par numéro d'agrément enregistré, sinon par le nom du praticien ou du signataire. */
export function medecinDeVisite(v: { agrement?: string | undefined; praticien: string; signataire?: string | undefined }, medecins: MedecinAgree[]): MedecinAgree | undefined {
  if (v.agrement) {
    const m = medecins.find((x) => x.numero === v.agrement);
    if (m) return m;
  }
  const noms = [v.signataire, v.praticien].filter(Boolean).map((n) => normNom(n!));
  return medecins.find((m) => noms.includes(normNom(m.nomAffiche)));
}

/* ---------- Stockage ---------- */

interface Etat {
  medecins: MedecinAgree[];
  demandes: DemandeAgrement[];
}
const KEY = "dgmm-medecins-v1";
const VIDE: Etat = { medecins: [], demandes: [] };
const listeners = new Set<() => void>();
let cache: Etat | null = null;

function exemples(): Etat {
  const dans = (j: number) => new Date(Date.now() + j * 86_400_000).toISOString().slice(0, 10);
  return {
    medecins: [
      { id: 1, numero: "AGM-2024-0007", nom: "MOUGOULA", prenom: "Christian", nomAffiche: "Dr MOUGOULA Christian", onmg: "0981-GAB", structure: "CMGM-OWE", agreeLe: "2024-03-15", expireLe: "2027-03-15", username: "mdt", historique: [{ date: "2024-03-15T10:00:00.000Z", action: "Assermentation initiale", par: "Directeur des Gens de Mer" }] },
      { id: 2, numero: "AGM-2023-0003", nom: "KONGO", prenom: "A.", nomAffiche: "Dr KONGO A.", onmg: "0754-GAB", structure: "CLI-POG", agreeLe: ajouterAns(dans(45), -3), expireLe: dans(45), historique: [{ date: ajouterAns(dans(45), -3) + "T10:00:00.000Z", action: "Assermentation initiale", par: "Directeur des Gens de Mer" }] },
    ],
    demandes: [
      {
        id: 1, numero: `DAG-${new Date().getFullYear()}-0001`, creeLe: new Date(Date.now() - 3 * 86_400_000).toISOString(), type: "initiale",
        nom: "MAPANGOU", prenom: "Christian", onmg: "1422-GAB", structure: "CMGM-OWE", tel: "077 00 00 00", email: "demo@exemple.ga",
        identifiant: "mapangou", motDePasse: "azerty", pieces: { diplome: "diplome-medecine.pdf", onmg: "attestation-ordre.pdf" }, controles: {}, statut: "en_instruction",
      },
    ],
  };
}

function lire(): Etat {
  if (typeof window === "undefined") return VIDE;
  if (!cache) {
    try {
      const brut = window.localStorage.getItem(KEY);
      cache = brut ? { ...VIDE, ...(JSON.parse(brut) as Partial<Etat>) } : exemples();
    } catch {
      cache = VIDE;
    }
  }
  return cache;
}
function ecrire(e: Etat): string | null {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(e));
  } catch {
    return "Espace de stockage plein : impossible d'enregistrer.";
  }
  cache = e;
  listeners.forEach((l) => l());
  return null;
}

export function useMedecins(): Etat {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, lire, () => VIDE);
}
export const getMedecins = () => lire();

/** Médecins agréés disposant d'un compte, agrément non expiré (pour la connexion). */
let memoComptes: { source: Etat | null; jour: string; liste: { username: string; password: string; nom: string }[] } = { source: null, jour: "", liste: [] };
export function comptesMedecins(): { username: string; password: string; nom: string }[] {
  // Mémorisé : la même liste est rendue tant que le registre et le jour ne changent pas.
  const e = lire();
  const jour = new Date().toISOString().slice(0, 10);
  if (memoComptes.source !== e || memoComptes.jour !== jour)
    memoComptes = { source: e, jour, liste: e.medecins.filter((m) => m.username && m.password && etatAgrement(m).etat !== "expire").map((m) => ({ username: m.username!, password: m.password!, nom: m.nomAffiche })) };
  return memoComptes.liste;
}
/** Médecin agréé associé à un compte de connexion. */
export const medecinDuCompte = (username: string) => lire().medecins.find((m) => m.username === username);
/** Noms des médecins agréés en cours de validité (choix du médecin examinateur). */
export const nomsMedecinsActifs = () => lire().medecins.filter((m) => etatAgrement(m).etat !== "expire").map((m) => m.nomAffiche);

/* ---------- Actions ---------- */

export type NouvelleDemande = Omit<DemandeAgrement, "id" | "numero" | "creeLe" | "controles" | "statut">;

export function deposerDemandeAgrement(d: NouvelleDemande): DemandeAgrement | string {
  const e = lire();
  if (d.type === "renouvellement" && !e.medecins.some((m) => m.numero === d.ancienNumero?.trim().toUpperCase() || m.onmg === d.onmg.trim()))
    return "Ancien numéro d'agrément inconnu : vérifiez-le ou déposez une première demande.";
  const id = Math.max(0, ...e.demandes.map((x) => x.id)) + 1;
  const n: DemandeAgrement = { ...d, ancienNumero: d.ancienNumero?.trim().toUpperCase() || undefined, id, numero: `DAG-${new Date().getFullYear()}-${String(id).padStart(4, "0")}`, creeLe: new Date().toISOString(), controles: {}, statut: "en_instruction" };
  const err = ecrire({ ...e, demandes: [n, ...e.demandes] });
  return err ?? n;
}

export function controlerPiece(id: number, piece: PieceAgrement, conforme: boolean) {
  const e = lire();
  ecrire({ ...e, demandes: e.demandes.map((d) => (d.id === id ? { ...d, controles: { ...d.controles, [piece]: conforme } } : d)) });
}

/** Pièces obligatoires jointes et déclarées conformes par le RH. */
export const piecesConformes = (d: DemandeAgrement) =>
  (Object.keys(PIECES_AGREMENT) as PieceAgrement[]).every((p) => !PIECES_AGREMENT[p].obligatoire || (d.pieces[p] && d.controles[p] === true)) &&
  (Object.keys(d.controles) as PieceAgrement[]).every((p) => d.controles[p] !== false);

export function transmettreAuDirecteur(id: number, par: string): DemandeAgrement | undefined {
  const e = lire();
  const d = e.demandes.find((x) => x.id === id);
  if (!d || d.statut !== "en_instruction" || !piecesConformes(d)) return undefined;
  const maj = { ...d, statut: "attente_directeur" as const, instruitPar: par, instruitLe: new Date().toISOString() };
  ecrire({ ...e, demandes: e.demandes.map((x) => (x.id === id ? maj : x)) });
  return maj;
}

export function rejeterDemande(id: number, par: string, motif: string): DemandeAgrement | undefined {
  const e = lire();
  const d = e.demandes.find((x) => x.id === id);
  if (!d || d.statut === "assermente" || d.statut === "rejete") return undefined;
  const maj = { ...d, statut: "rejete" as const, decidePar: par, decideLe: new Date().toISOString(), motif };
  ecrire({ ...e, demandes: e.demandes.map((x) => (x.id === id ? maj : x)) });
  return maj;
}

/**
 * Assermentation par le Directeur : crée le médecin agréé (ou prolonge son agrément de 3 ans
 * en cas de renouvellement) et ouvre son compte rattaché à sa structure.
 */
export function assermenter(id: number, par: string, now = new Date()): MedecinAgree | undefined {
  const e = lire();
  const d = e.demandes.find((x) => x.id === id);
  if (!d || d.statut !== "attente_directeur") return undefined;
  const ajd = now.toISOString().slice(0, 10);
  const existant = e.medecins.find((m) => (d.ancienNumero && m.numero === d.ancienNumero) || m.onmg === d.onmg);
  let medecin: MedecinAgree;
  let medecins: MedecinAgree[];
  if (existant) {
    // Renouvellement : la nouvelle période part de l'échéance si elle n'est pas dépassée.
    const depart = existant.expireLe > ajd ? existant.expireLe : ajd;
    medecin = {
      ...existant, structure: d.structure, expireLe: ajouterAns(depart, DUREE_AGREMENT_ANS), username: existant.username ?? d.identifiant, password: existant.password ?? d.motDePasse,
      historique: [...existant.historique, { date: now.toISOString(), action: `Renouvellement jusqu'au ${ajouterAns(depart, DUREE_AGREMENT_ANS)}`, par }],
    };
    medecins = e.medecins.map((m) => (m.id === existant.id ? medecin : m));
  } else {
    const idm = Math.max(0, ...e.medecins.map((m) => m.id)) + 1;
    const rang = e.medecins.filter((m) => m.numero.startsWith(`AGM-${now.getFullYear()}-`)).length + 1;
    medecin = {
      id: idm, numero: `AGM-${now.getFullYear()}-${String(10 + rang).padStart(4, "0")}`, nom: d.nom.toUpperCase(), prenom: d.prenom, nomAffiche: `Dr ${d.nom.toUpperCase()} ${d.prenom}`,
      onmg: d.onmg, structure: d.structure, agreeLe: ajd, expireLe: ajouterAns(ajd, DUREE_AGREMENT_ANS), username: d.identifiant, password: d.motDePasse,
      historique: [{ date: now.toISOString(), action: "Assermentation initiale", par }],
    };
    medecins = [...e.medecins, medecin];
  }
  const demandes = e.demandes.map((x) => (x.id === id ? { ...x, statut: "assermente" as const, decidePar: par, decideLe: now.toISOString(), medecinNumero: medecin.numero } : x));
  ecrire({ medecins, demandes });
  return medecin;
}

/** Identifiant de connexion libre (comptes du personnel et médecins). */
export function identifiantPris(id: string, autres: string[]): boolean {
  const e = lire();
  return autres.includes(id) || e.medecins.some((m) => m.username === id) || e.demandes.some((d) => d.identifiant === id && d.statut !== "rejete");
}

/** Rattache une visite au médecin examinateur agréé (numéro d'agrément et structure). */
export function lienMedecin(praticien: string): { agrement?: string | undefined; structure?: string | undefined } {
  const m = medecinDeVisite({ praticien }, lire().medecins);
  return m ? { agrement: m.numero, structure: m.structure } : {};
}

/** Le compte connecté est-il un médecin agréé dont l'agrément a expiré ? */
export function agrementExpire(username: string): boolean {
  const m = medecinDuCompte(username);
  return !!m && etatAgrement(m).etat === "expire";
}
