import { useSyncExternalStore } from "react";
import type { HabillageId } from "@/lib/dgmm/saisons";

/**
 * Réglages du système, modifiés par l'administrateur.
 * Les données du portail sont conservées dans ce navigateur : ces réglages s'appliquent
 * à tous les comptes qui utilisent ce poste.
 */
export interface Systeme {
  /** calendrier : habillage du jour ; force : un habillage choisi ; desactive : sceau nu. */
  habillageMode: "calendrier" | "force" | "desactive";
  habillageForce: HabillageId;
  /** Événements retirés du calendrier. */
  evenementsInactifs: HabillageId[];
  /** Animations d'ambiance autorisées pour tous. */
  animations: boolean;
  intensite: "legere" | "normale" | "forte";
  maintenance: { actif: boolean; message: string };
}

const KEY = "dgmm-systeme";
const DEFAUT: Systeme = {
  habillageMode: "calendrier",
  habillageForce: "noel",
  evenementsInactifs: [],
  animations: true,
  intensite: "normale",
  maintenance: {
    actif: false,
    message: "Maintenance programmée : le portail peut être indisponible quelques minutes.",
  },
};

const listeners = new Set<() => void>();
let cache: Systeme | null = null;

function lire(): Systeme {
  if (typeof window === "undefined") return DEFAUT;
  if (!cache) {
    try {
      const brut = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Partial<Systeme>;
      cache = { ...DEFAUT, ...brut, maintenance: { ...DEFAUT.maintenance, ...brut.maintenance } };
    } catch {
      cache = DEFAUT;
    }
  }
  return cache;
}

export function getSysteme(): Systeme {
  return lire();
}

export function setSysteme(patch: Partial<Systeme>) {
  cache = { ...lire(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* stockage indisponible : réglage valable jusqu'au rechargement */
  }
  listeners.forEach((l) => l());
}

export function reinitialiserSysteme() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* rien à faire */
  }
  cache = null;
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  // Un autre onglet a changé les réglages : on les relit.
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      cache = null;
      listeners.forEach((l) => l());
    }
  });
}

export function useSysteme(): Systeme {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    lire,
    () => DEFAUT,
  );
}

export const INTENSITE: Record<Systeme["intensite"], number> = { legere: 0.5, normale: 1, forte: 1.7 };
