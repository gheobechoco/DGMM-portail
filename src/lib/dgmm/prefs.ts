import { useSyncExternalStore } from "react";

/** Préférences d'affichage propres à chaque poste (mémorisées localement). */
export interface Prefs {
  densite: "confort" | "compact";
  contraste: "normal" | "eleve";
  tourVu: boolean;
}

const KEY = "dgmm-prefs";
const DEFAULT: Prefs = { densite: "confort", contraste: "normal", tourVu: false };
const listeners = new Set<() => void>();
let cache: Prefs | null = null;

function read(): Prefs {
  if (typeof window === "undefined") return DEFAULT;
  if (!cache) {
    try {
      cache = {
        ...DEFAULT,
        ...(JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Partial<Prefs>),
      };
    } catch {
      cache = DEFAULT;
    }
  }
  return cache;
}

export function appliquerPrefs(p: Prefs = read()) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset["density"] = p.densite;
  document.documentElement.dataset["contrast"] = p.contraste;
}

export function setPrefs(patch: Partial<Prefs>) {
  cache = { ...read(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* stockage indisponible : préférence non mémorisée */
  }
  appliquerPrefs(cache);
  listeners.forEach((l) => l());
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => DEFAULT,
  );
}
