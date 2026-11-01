import { useSyncExternalStore } from "react";
import { ageFrom, certificateStatus, DAY, type CertStatus } from "./rules";

export type Etat = "en_attente" | "validee" | "rejetee";
export type OuiNon = "oui" | "non" | "";

export interface Marin {
  id: number;
  nip: string;
  livret: string;
  nom: string;
  prenom: string;
  sexe: "M" | "F" | "";
  dateNaissance: string;
  profession: string;
  nationalite: string;
  entreprise: string;
  tel1: string;
  tel2: string;
  quartier: string;
  email: string;
  signeParticulier: string;
  couleurYeux: string;
  couleurCheveux: string;
  taille: string;
  quartierInscription: string;
  dateMariage: string;
  lieuMariage: string;
  documents: Partial<Record<DocKey, string>>;
  validationAdmin: Etat;
  validationMedicale: Etat;
  login: string;
  mdp: string;
  creePar: string;
  creeLe: string;
  modifieLe: string;
}

export type DocKey = "photo" | "piece" | "certificat" | "residence" | "contrat" | "livret";
export const DOC_LABELS: Record<DocKey, string> = {
  photo: "Photo d'identité",
  piece: "Pièce d'identité",
  certificat: "Certificat d'aptitude",
  residence: "Certificat de résidence",
  contrat: "Contrat de travail",
  livret: "Livret maritime (ancien)",
};

export interface Stcw {
  identiteVerifiee: OuiNon;
  acuiteVisuelle: OuiNon;
  auditiveSansAide: OuiNon;
  acuiteAuditive: OuiNon;
  couleurs: OuiNon;
  dateTestCouleurs: string;
  veille: OuiNon;
  aidesVisuelles: OuiNon;
  exemptAffection: OuiNon;
  verdict: "apte" | "apte_restrictions" | "inapte" | "";
  details: string;
  dateDelivrance: string;
  validJusquau: string;
}

export interface Visite {
  id: number;
  numero: string;
  marinId: number;
  praticien: string;
  creeLe: string;
  traiteLe: string;
  examens: { taille: string; poids: string; tension: string; pouls: string; vision: string; audition: string; observations: string };
  complementaires: string;
  recommandations: string;
  documents: { type: string; nom: string; date: string }[];
  stcw: Stcw;
  signee: boolean;
  signataire: string;
}

interface State {
  marins: Marin[];
  visites: Visite[];
}

const KEY = "dgmm-gdm-v1";

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}
function daysAgo(n: number) {
  return new Date(Date.now() - n * DAY).toISOString();
}

export const QUARTIERS = ["Libreville", "Port-Gentil", "Owendo", "Mayumba", "Lambaréné", "Gamba", "Cocobeach"];
export const NATIONALITES = ["Gabonaise", "Camerounaise", "Congolaise", "Équato-guinéenne", "Sénégalaise", "Française", "Autre"];
export const QUARTIERS_RESIDENCE = ["Santa Barbara / Pog", "Mounadji / Pog", "Mini-prix / Pog", "Akébé / Lbv", "Nzeng-Ayong / Lbv", "Owendo", "Autre"];
export const ENTREPRISES = ["SNAT Gabon", "Bourbon Offshore", "Gabon Port Management", "Satram", "Perenco Marine", "Edelweiss Maritime"];
export const PRATICIENS = ["Dr MÉDECIN DU TRAVAIL", "Dr KONGO A."];

function genNip(id: number, d = new Date()) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `${15100 + id}-${yy}${mm}-DGM`;
}

function emptyStcw(): Stcw {
  return {
    identiteVerifiee: "", acuiteVisuelle: "", auditiveSansAide: "", acuiteAuditive: "", couleurs: "",
    dateTestCouleurs: "", veille: "", aidesVisuelles: "", exemptAffection: "", verdict: "", details: "",
    dateDelivrance: "", validJusquau: "",
  };
}
export { emptyStcw };

function seed(): State {
  const raw: [string, string, "M" | "F", number, string, Etat, Etat, number, Partial<Marin>?][] = [
    ["DONGO", "Renade", "M", 45, "Capitaine", "validee", "validee", 12, { quartierInscription: "Port-Gentil", couleurYeux: "Marron", couleurCheveux: "Noir", taille: "178", signeParticulier: "Néant" }],
    ["HAPPI", "Éric", "M", 22, "Matelot", "validee", "validee", 160],
    ["ATENDE", "Mélissa", "F", 24, "Officier pont", "validee", "validee", 170, { quartierInscription: "Libreville", couleurYeux: "Noir", couleurCheveux: "Noir", taille: "165", signeParticulier: "Néant" }],
    ["IBINGA", "Jean", "M", 36, "Mécanicien", "validee", "en_attente", 150],
    ["MBOUMA", "René", "M", 39, "Chef mécanicien", "validee", "validee", 240],
    ["ABAGHA BRAD", "Brunel Rosy", "F", 19, "Élève officier", "validee", "en_attente", 250],
    ["ABA A ESSONO", "Tanguy", "M", 45, "Maître d'équipage", "validee", "validee", 300],
    ["IBRAHIM", "Maurice", "M", 51, "Cuisinier de bord", "validee", "validee", 280],
    ["NZAMBA", "Prisca", "F", 28, "Officier radio", "validee", "validee", 90],
    ["OBAME", "Serge", "M", 33, "Matelot", "validee", "rejetee", 70],
    ["MOUSSAVOU", "Arnaud", "M", 21, "Matelot", "validee", "en_attente", 40],
    ["NDONG", "Cyrille", "M", 23, "Pilote", "validee", "validee", 30],
    ["KOUMBA", "Ghislain", "M", 47, "Capitaine", "validee", "validee", 400],
    ["MABIKA", "Laure", "F", 20, "Élève officier", "validee", "en_attente", 25],
    ["ESSONO", "Dieudonné", "M", 37, "Mécanicien", "validee", "validee", 200],
    ["BOUANGA", "Divine", "F", 23, "Officier pont", "validee", "en_attente", 20],
    ["MINTSA", "Paul", "M", 40, "Matelot", "en_attente", "en_attente", 3],
    ["OYONO", "Clarisse", "F", 29, "Hôtesse de bord", "en_attente", "en_attente", 9],
    ["LEKOGO", "Fabrice", "M", 31, "Matelot", "en_attente", "en_attente", 11],
    ["NGUEMA", "Hervé", "M", 26, "Mécanicien", "en_attente", "en_attente", 14],
    ["MOUELE", "Sandrine", "F", 22, "Matelot", "en_attente", "en_attente", 18],
    ["ONDO", "Rodrigue", "M", 34, "Pilote", "en_attente", "en_attente", 21],
    ["TCHIBINDA", "Marc", "M", 44, "Matelot", "rejetee", "en_attente", 60],
  ];
  const now = new Date();
  const marins: Marin[] = raw.map(([nom, prenom, sexe, age, profession, va, vm, created, extra], i) => {
    const id = i + 1;
    const birth = new Date(now.getFullYear() - age, (i * 5) % 12, 1 + (i % 27));
    return {
      id,
      nip: genNip(id, new Date(Date.now() - created * DAY)),
      livret: va === "validee" && vm === "validee" ? `LM-${String(id).padStart(5, "0")}` : "",
      nom, prenom, sexe,
      dateNaissance: iso(birth),
      profession,
      nationalite: i % 7 === 3 ? "Camerounaise" : "Gabonaise",
      entreprise: ENTREPRISES[i % ENTREPRISES.length]!,
      tel1: `07${String(7452017 + i * 1311).slice(0, 7)}`,
      tel2: "",
      quartier: QUARTIERS_RESIDENCE[i % QUARTIERS_RESIDENCE.length]!,
      email: `${prenom.split(" ")[0]!.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}.${nom.split(" ")[0]!.toLowerCase()}@exemple.ga`,
      signeParticulier: "", couleurYeux: "", couleurCheveux: "", taille: "",
      quartierInscription: i % 3 === 0 ? "Port-Gentil" : i % 3 === 1 ? "Libreville" : "",
      dateMariage: "", lieuMariage: "",
      documents: va === "validee" ? { photo: "photo.jpg", piece: "cni.pdf", residence: "residence.pdf", contrat: "contrat.pdf" } : { piece: "cni.pdf" },
      validationAdmin: va,
      validationMedicale: vm,
      login: `${nom.split(" ")[0]!.toLowerCase()}${id}`,
      mdp: Math.random().toString(36).slice(2, 7),
      creePar: i % 2 ? "Agent DGMM" : "Dr MÉDECIN DU TRAVAIL",
      creeLe: daysAgo(created),
      modifieLe: daysAgo(Math.max(0, created - 3)),
      ...extra,
    };
  });
  // Visites : certificats valides, expirant bientôt et expirés.
  const visitePlan: [number, number][] = [
    [1, 400], [2, 200], [3, 15], [5, -20], [7, 300], [8, 25], [9, 500], [12, -5], [13, 600], [15, 180],
  ];
  const visites: Visite[] = visitePlan.map(([marinId, validDays], i) => {
    const id = 3850 + i;
    const created = new Date(Date.now() - (validDays > 0 ? 365 * 2 * DAY - validDays * DAY : 730 * DAY - validDays * DAY));
    const deliv = new Date(Date.now() - Math.max(1, 730 - validDays) * DAY);
    const s: Stcw = {
      identiteVerifiee: "oui", acuiteVisuelle: "oui", auditiveSansAide: "oui", acuiteAuditive: "oui", couleurs: "oui",
      dateTestCouleurs: iso(deliv), veille: "oui", aidesVisuelles: i % 3 === 0 ? "oui" : "non", exemptAffection: "oui",
      verdict: "apte", details: "", dateDelivrance: iso(deliv), validJusquau: iso(new Date(Date.now() + validDays * DAY)),
    };
    void created;
    return {
      id,
      numero: `${id}-${String(deliv.getFullYear()).slice(2)}${String(deliv.getMonth() + 1).padStart(2, "0")}-VM`,
      marinId,
      praticien: PRATICIENS[i % 2]!,
      creeLe: deliv.toISOString(),
      traiteLe: deliv.toISOString(),
      examens: { taille: "175", poids: "74", tension: "12/8", pouls: "72", vision: "10/10", audition: "Normale", observations: "RAS" },
      complementaires: "Glycémie, NFS : normales.",
      recommandations: "Hydratation régulière, port des EPI.",
      documents: [],
      stcw: s,
      signee: true,
      signataire: PRATICIENS[i % 2]!,
    };
  });
  return { marins, visites };
}

let state: State | null = null;
const listeners = new Set<() => void>();

function load(): State {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    /* ignore */
  }
  const s = seed();
  window.localStorage.setItem(KEY, JSON.stringify(s));
  return s;
}

function get(): State {
  if (!state) state = load();
  return state;
}
const serverState = seed();

function set(next: State) {
  state = next;
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useDgmm<T>(select: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => select(get()), () => select(serverState));
}
export function useMarins() {
  return useDgmm((s) => s.marins);
}
export function useVisites() {
  return useDgmm((s) => s.visites);
}

export function nowIso() {
  return new Date().toISOString();
}

export function saveMarin(input: Omit<Marin, "id" | "nip" | "login" | "mdp" | "creeLe" | "modifieLe" | "creePar" | "livret" | "validationAdmin" | "validationMedicale"> & { id?: number }, auteur: string): Marin {
  const s = get();
  if (input.id) {
    const marins = s.marins.map((m) => (m.id === input.id ? { ...m, ...input, id: m.id, modifieLe: nowIso() } : m));
    set({ ...s, marins });
    return marins.find((m) => m.id === input.id)!;
  }
  const id = Math.max(0, ...s.marins.map((m) => m.id)) + 1;
  const m: Marin = {
    ...input,
    id,
    nip: genNip(id),
    livret: "",
    login: `${(input.nom.split(" ")[0] ?? "").toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")}${id}`,
    mdp: Math.random().toString(36).slice(2, 8),
    validationAdmin: "en_attente",
    validationMedicale: "en_attente",
    creePar: auteur,
    creeLe: nowIso(),
    modifieLe: nowIso(),
  };
  set({ ...s, marins: [m, ...s.marins] });
  return m;
}

export function updateMarin(id: number, patch: Partial<Marin>) {
  const s = get();
  set({ ...s, marins: s.marins.map((m) => (m.id === id ? { ...m, ...patch, modifieLe: nowIso() } : m)) });
}

export function saveVisite(v: Omit<Visite, "id" | "numero" | "creeLe" | "traiteLe"> & { id?: number }): Visite {
  const s = get();
  let saved: Visite;
  let visites: Visite[];
  if (v.id) {
    visites = s.visites.map((x) => (x.id === v.id ? { ...x, ...v, id: x.id, traiteLe: nowIso() } : x));
    saved = visites.find((x) => x.id === v.id)!;
  } else {
    const id = Math.max(3800, ...s.visites.map((x) => x.id)) + 1;
    const d = new Date();
    saved = {
      ...v,
      id,
      numero: `${id}-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}-VM`,
      creeLe: nowIso(),
      traiteLe: nowIso(),
    };
    visites = [saved, ...s.visites];
  }
  let marins = s.marins;
  if (saved.signee && saved.stcw.verdict) {
    marins = marins.map((m) =>
      m.id === saved.marinId
        ? { ...m, validationMedicale: saved.stcw.verdict === "inapte" ? "rejetee" : "validee", modifieLe: nowIso() }
        : m,
    );
  }
  set({ marins, visites });
  return saved;
}

export function setValidationAdmin(id: number, etat: Etat) {
  updateMarin(id, { validationAdmin: etat });
}

/** Attribue un numéro de livret maritime au marin (s'il n'en a pas déjà un). */
export function delivrerLivret(id: number): string {
  const s = get();
  const m = s.marins.find((x) => x.id === id);
  if (!m) return "";
  if (m.livret) return m.livret;
  const livret = `LM-${String(id).padStart(5, "0")}`;
  updateMarin(id, { livret });
  return livret;
}

export function resetDemo() {
  set(seed());
}

/** Dernier certificat signé d'un marin. */
export function lastCertificate(visites: Visite[], marinId: number): Visite | undefined {
  return visites
    .filter((v) => v.marinId === marinId && v.signee && v.stcw.verdict !== "inapte" && v.stcw.validJusquau)
    .sort((a, b) => b.stcw.validJusquau.localeCompare(a.stcw.validJusquau))[0];
}

export function marinCertStatus(visites: Visite[], marinId: number, now = new Date()): CertStatus {
  return certificateStatus(lastCertificate(visites, marinId)?.stcw.validJusquau, now);
}

const REQUIRED_LIVRET: (keyof Marin)[] = ["dateNaissance", "taille", "couleurYeux", "couleurCheveux", "quartierInscription", "signeParticulier"];
export function dossierIncomplet(m: Marin): boolean {
  return REQUIRED_LIVRET.some((k) => !m[k]) || !m.documents.photo || !m.documents.piece;
}
export function manquants(m: Marin): string[] {
  const labels: Partial<Record<keyof Marin, string>> = {
    dateNaissance: "Date de naissance", taille: "Taille", couleurYeux: "Couleur des yeux",
    couleurCheveux: "Couleur des cheveux", quartierInscription: "Quartier d'inscription", signeParticulier: "Signe particulier",
  };
  const out = REQUIRED_LIVRET.filter((k) => !m[k]).map((k) => labels[k]!);
  if (!m.documents.photo) out.push("Photo d'identité");
  if (!m.documents.piece) out.push("Pièce d'identité");
  return out;
}

export function eligibleLivret(m: Marin, visites: Visite[], now = new Date()): boolean {
  const st = marinCertStatus(visites, m.id, now);
  return m.validationAdmin === "validee" && m.validationMedicale === "validee" && (st === "valide" || st === "expire_bientot") && !dossierIncomplet(m);
}

export function fullName(m?: Marin) {
  return m ? `${m.nom} ${m.prenom}`.trim() : "—";
}
export function age(m: Marin) {
  return ageFrom(m.dateNaissance);
}

export function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
