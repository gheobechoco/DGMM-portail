import { useSyncExternalStore } from "react";
import type { Role } from "./rules";

export interface Account {
  username: string;
  password: string;
  nom: string;
  role: Role;
  roleLabel: string;
}

// Comptes de démonstration (identiques à la recette).
export const ACCOUNTS: Account[] = [
  {
    username: "marin",
    password: "azerty",
    nom: "ABIAGHE PEMBA Norha",
    role: "gestionnaire_mm",
    roleLabel: "Directeur des Gens de Mer",
  },
  {
    username: "archivagehospit",
    password: "azerty",
    nom: "Agent des Gens de Mer",
    role: "rh_marine",
    roleLabel: "Agent DGMM — enrôlement",
  },
  {
    username: "mdt",
    password: "azerty",
    nom: "Dr MOUGOULA Christian",
    role: "medecin",
    roleLabel: "Médecin du travail",
  },
  {
    username: "kongoa",
    password: "azerty",
    nom: "Dr KONGO A.",
    role: "gestionnaire_medical",
    roleLabel: "Gestionnaire médical",
  },
];

const KEY = "dgmm-session";
const listeners = new Set<() => void>();
let cached: string | null | undefined;

function read(): string | null {
  if (typeof window === "undefined") return null;
  if (cached === undefined) cached = window.localStorage.getItem(KEY);
  return cached;
}

export function getSession(): Account | null {
  const u = read();
  return ACCOUNTS.find((a) => a.username === u) ?? null;
}

export function login(username: string, password: string): Account | null {
  const acc = ACCOUNTS.find(
    (a) => a.username === username.trim().toLowerCase() && a.password === password,
  );
  if (!acc) return null;
  window.localStorage.setItem(KEY, acc.username);
  cached = acc.username;
  listeners.forEach((l) => l());
  return acc;
}

export function logout() {
  window.localStorage.removeItem(KEY);
  cached = null;
  listeners.forEach((l) => l());
}

export function useSession(): Account | null {
  const u = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => null,
  );
  return ACCOUNTS.find((a) => a.username === u) ?? null;
}

/* ---------- Sessions des espaces externes (marins, armateurs) ---------- */

function sessionStore(key: string) {
  const ls = new Set<() => void>();
  let c: string | null | undefined;
  const readKey = () => {
    if (typeof window === "undefined") return null;
    if (c === undefined) c = window.localStorage.getItem(key);
    return c;
  };
  const write = (v: string | null) => {
    if (v === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, v);
    c = v;
    ls.forEach((l) => l());
  };
  const use = () =>
    useSyncExternalStore(
      (l) => {
        ls.add(l);
        return () => ls.delete(l);
      },
      readKey,
      () => null,
    );
  return { read: readKey, write, use };
}

/** Session de l'espace marin : contient l'identifiant interne du marin. */
export const marinSession = sessionStore("dgmm-marin-session");

export interface ArmateurAccount {
  username: string;
  password: string;
  entreprise: string;
  contact: string;
}

// Comptes armateurs de démonstration.
export const ARMATEUR_ACCOUNTS: ArmateurAccount[] = [
  {
    username: "perenco",
    password: "azerty",
    entreprise: "Perenco Marine",
    contact: "Service armement Perenco",
  },
  {
    username: "bourbon",
    password: "azerty",
    entreprise: "Bourbon Offshore",
    contact: "Crewing Bourbon Gabon",
  },
  { username: "snat", password: "azerty", entreprise: "SNAT Gabon", contact: "Armement SNAT" },
];
export const armateurSession = sessionStore("dgmm-armateur-session");

export function loginArmateur(username: string, password: string): ArmateurAccount | null {
  const a = ARMATEUR_ACCOUNTS.find(
    (x) => x.username === username.trim().toLowerCase() && x.password === password,
  );
  if (a) armateurSession.write(a.username);
  return a ?? null;
}
export function useArmateur(): ArmateurAccount | null {
  const u = armateurSession.use();
  return ARMATEUR_ACCOUNTS.find((a) => a.username === u) ?? null;
}
