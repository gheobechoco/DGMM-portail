import { useSyncExternalStore } from "react";
import type { Navire, TypeFlotte } from "@/lib/dgmm/maritime";
import type { DocKey } from "@/lib/dgmm/store";

/**
 * Demandes déposées depuis les pages publiques :
 * - pré-inscription d'un marin (prise de rendez-vous ; l'enrôlement reste fait par l'agent DGMM) ;
 * - demande d'ouverture de compte d'un armateur (validée par l'administrateur système).
 */
export type StatutPre = "en_attente" | "convertie" | "classee";
export type StatutArm = "en_attente" | "validee" | "refusee";

export interface PreInscription {
  id: number;
  numero: string;
  creeLe: string;
  statut: StatutPre;
  nom: string;
  prenom: string;
  sexe: string;
  dateNaissance: string;
  nationalite: string;
  tel: string;
  email: string;
  profession: string;
  station: string;
  entreprise: string;
  rdv: string;
  lieuNaissance?: string;
  numeroPiece?: string;
  adresse?: string;
  urgenceNom?: string;
  urgenceTel?: string;
  experience?: string;
  pieces?: string[];
  documents?: Partial<Record<DocKey, string>>;
  marinId?: number | undefined;
  motif?: string | undefined;
  traitePar?: string | undefined;
}

export interface DemandeArmateur {
  id: number;
  numero: string;
  creeLe: string;
  statut: StatutArm;
  raisonSociale: string;
  rccm: string;
  nif: string;
  ville: string;
  pays: string;
  segment: TypeFlotte;
  contactNom: string;
  contactFonction: string;
  tel: string;
  email: string;
  navires: Navire[];
  identifiant: string;
  motDePasse: string;
  adresseSiege?: string;
  dpaNom?: string;
  dpaTel?: string;
  flotteDetails?: { imo: string; indicatif: string; mmsi: string; portAttache: string }[];
  pieces?: string[];
  motif?: string | undefined;
  traitePar?: string | undefined;
}

interface Etat {
  pre: PreInscription[];
  armateurs: DemandeArmateur[];
}

const KEY = "dgmm-inscriptions";
const VIDE: Etat = { pre: [], armateurs: [] };
const listeners = new Set<() => void>();
let cache: Etat | null = null;

function lire(): Etat {
  if (typeof window === "undefined") return VIDE;
  if (!cache) {
    try {
      cache = {
        ...VIDE,
        ...(JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Partial<Etat>),
      };
    } catch {
      cache = VIDE;
    }
  }
  return cache;
}
function ecrire(e: Etat) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(e));
  } catch (error) {
    throw new Error(
      "Impossible d'enregistrer la demande : le stockage local est plein ou indisponible. Réduisez la taille des pièces jointes et réessayez.",
      { cause: error },
    );
  }
  cache = e;
  listeners.forEach((l) => l());
}
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      cache = null;
      listeners.forEach((l) => l());
    }
  });
}

export function useInscriptions(): Etat {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    lire,
    () => VIDE,
  );
}
export function getInscriptions(): Etat {
  return lire();
}

const numero = (prefixe: string, n: number) =>
  `${prefixe}-${new Date().getFullYear()}-${String(n).padStart(4, "0")}`;

export function deposerPreInscription(
  d: Omit<PreInscription, "id" | "numero" | "creeLe" | "statut">,
): PreInscription {
  const e = lire();
  const id = Math.max(0, ...e.pre.map((x) => x.id)) + 1;
  const p: PreInscription = {
    ...d,
    id,
    numero: numero("PRE", id),
    creeLe: new Date().toISOString(),
    statut: "en_attente",
  };
  ecrire({ ...e, pre: [p, ...e.pre] });
  return p;
}

/** Ajoute une fois deux demandes fictives pour essayer le parcours guichet et le scan QR. */
export function chargerDemosPreInscription(marinId: number): PreInscription[] {
  const e = lire();
  const now = Date.now();
  const exemples: Omit<PreInscription, "id" | "creeLe">[] = [
    {
      numero: "PRE-DEMO-CREE",
      statut: "convertie",
      nom: "HAPPI",
      prenom: "Éric",
      sexe: "M",
      dateNaissance: "2004-06-14",
      nationalite: "Gabonaise",
      tel: "070000000",
      email: "demo.happi@example.ga",
      profession: "Matelot",
      station: "ST-OWE",
      entreprise: "",
      rdv: "",
      documents: { piece: "cni-demo.jpg", photo: "photo-demo.jpg" },
      pieces: ["cni-demo.jpg", "photo-demo.jpg"],
      marinId,
      traitePar: "Démonstration DGMM",
    },
    {
      numero: "PRE-DEMO-ATTENTE",
      statut: "en_attente",
      nom: "MABIKA",
      prenom: "Laure",
      sexe: "F",
      dateNaissance: "2006-02-18",
      nationalite: "Gabonaise",
      tel: "070000001",
      email: "demo.mabika@example.ga",
      profession: "Élève officier",
      station: "ST-OWE",
      entreprise: "",
      rdv: "",
      documents: { piece: "cni-demo.jpg", photo: "photo-demo.jpg" },
      pieces: ["cni-demo.jpg", "photo-demo.jpg"],
    },
  ];
  const ajoutes = exemples
    .filter((exemple) => !e.pre.some((p) => p.numero === exemple.numero))
    .map((exemple, index) => ({
      ...exemple,
      id: Math.max(0, ...e.pre.map((p) => p.id)) + index + 1,
      creeLe: new Date(now - (index + 1) * 86400000).toISOString(),
    }));
  if (ajoutes.length) ecrire({ ...e, pre: [...ajoutes, ...e.pre] });
  return [...ajoutes, ...e.pre.filter((p) => exemples.some((x) => x.numero === p.numero))];
}

export function traiterPreInscription(id: number, patch: Partial<PreInscription>) {
  const e = lire();
  ecrire({ ...e, pre: e.pre.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
}

export function deposerDemandeArmateur(
  d: Omit<DemandeArmateur, "id" | "numero" | "creeLe" | "statut">,
): DemandeArmateur {
  const e = lire();
  const id = Math.max(0, ...e.armateurs.map((x) => x.id)) + 1;
  const a: DemandeArmateur = {
    ...d,
    id,
    numero: numero("ARM", id),
    creeLe: new Date().toISOString(),
    statut: "en_attente",
  };
  ecrire({ ...e, armateurs: [a, ...e.armateurs] });
  return a;
}

export function traiterDemandeArmateur(id: number, patch: Partial<DemandeArmateur>) {
  const e = lire();
  ecrire({ ...e, armateurs: e.armateurs.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
}

/** Retrouve une demande par son numéro (suivi par le demandeur). */
export function suiviDemande(num: string): PreInscription | DemandeArmateur | null {
  const n = num.trim().toUpperCase();
  const e = lire();
  return e.pre.find((x) => x.numero === n) ?? e.armateurs.find((x) => x.numero === n) ?? null;
}
