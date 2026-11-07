import { useSyncExternalStore } from "react";

/** Préférences d'affichage propres à chaque poste (mémorisées localement). */
export interface Prefs {
  densite: "confort" | "compact";
  contraste: "normal" | "eleve";
  /** Thème : suit le système par défaut, ou forcé en clair / nuit. */
  theme: "systeme" | "clair" | "sombre";
  tourVu: boolean;
  /** Animations d'ambiance des journées spéciales (neige, confettis…). */
  animationsSaison: boolean;
}

const KEY = "dgmm-prefs";
const DEFAULT: Prefs = { densite: "confort", contraste: "normal", theme: "systeme", tourVu: false, animationsSaison: true };
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

export function systemeSombre(): boolean {
  return (
    typeof window !== "undefined" && !!window.matchMedia?.("(prefers-color-scheme: dark)").matches
  );
}

export function estSombre(p: Prefs = read()): boolean {
  return p.theme === "sombre" || (p.theme === "systeme" && systemeSombre());
}

let ecouteSysteme = false;
export function appliquerPrefs(p: Prefs = read()) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  // Les modes « compact » et « contraste élevé » ne sont plus proposés : affichage standard.
  html.dataset["density"] = "confort";
  html.dataset["contrast"] = "normal";
  const sombre = estSombre(p);
  html.classList.toggle("dark", sombre);
  html.style.colorScheme = sombre ? "dark" : "light";
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", sombre ? "#0d1526" : "#0a192f");
  // Suit le changement de thème du système tant que l'utilisateur n'a pas choisi.
  if (!ecouteSysteme && window.matchMedia) {
    ecouteSysteme = true;
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (read().theme === "systeme") {
        appliquerPrefs(read());
        listeners.forEach((l) => l());
      }
    });
  }
}

/** Bascule clair ⇄ nuit avec une transition douce. */
export function basculerTheme() {
  const html = document.documentElement;
  html.classList.add("theme-transition");
  setPrefs({ theme: estSombre() ? "clair" : "sombre" });
  window.setTimeout(() => html.classList.remove("theme-transition"), 320);
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
