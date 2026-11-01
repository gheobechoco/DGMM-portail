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
  { username: "marin", password: "azerty", nom: "ABIAGHE PEMBA Norha", role: "gestionnaire_mm", roleLabel: "Gestionnaire MM" },
  { username: "archivagehospit", password: "azerty", nom: "Agent RH Marine", role: "rh_marine", roleLabel: "Gestionnaire RH Marine" },
  { username: "mdt", password: "azerty", nom: "Dr MÉDECIN DU TRAVAIL", role: "medecin", roleLabel: "Médecin du travail" },
  { username: "kongoa", password: "azerty", nom: "Dr KONGO A.", role: "gestionnaire_medical", roleLabel: "Gestionnaire médical" },
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
  const acc = ACCOUNTS.find((a) => a.username === username.trim().toLowerCase() && a.password === password);
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
