import { useSyncExternalStore } from "react";
import { ageFrom, certificateStatus, DAY, type CertStatus } from "./rules";
import { ACCOUNTS } from "./auth";
import { TOUS_NAVIRES, type TypeFlotte } from "./maritime";

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
  situationMatrimoniale?: string | undefined;
  historique?: Evenement[] | undefined;
  embarquements?: Embarquement[] | undefined;
  alertes?: { sms: boolean; email: boolean } | undefined;
  documents: Partial<Record<DocKey, string>>;
  validationAdmin: Etat;
  validationMedicale: Etat;
  login: string;
  mdp: string;
  creePar: string;
  creeLe: string;
  modifieLe: string;
}

export interface Evenement {
  date: string;
  action: string;
  auteur: string;
  type: "creation" | "modification" | "admin" | "medical" | "livret";
}

/** Ligne du relevé des services en mer (sea service) inscrite au livret. */
export interface Embarquement {
  id: number;
  navire: string;
  imo: string;
  typeNavire: TypeFlotte | string;
  jauge: number;
  armateur: string;
  fonction: string;
  embarquement: string;
  debarquement: string;
  saisiPar: string;
  saisiLe: string;
}

/** Rôle d'équipage déclaré par un armateur pour un appareillage. */
export interface RoleEquipage {
  id: number;
  armateur: string;
  navire: string;
  appareillage: string;
  membres: { marinId: number; fonction: string }[];
  creeLe: string;
  modifieLe: string;
}

/** Entrée du journal d'audit, chaînée à la précédente par son empreinte. */
export interface AuditEntry {
  seq: number;
  date: string;
  acteur: string;
  role: string;
  action: string;
  cible: string;
  poste: string;
  prev: string;
  hash: string;
}

export type DocKey = "photo" | "piece" | "certificat" | "residence" | "contrat" | "livret";
export const DOC_LABELS: Record<DocKey, string> = {
  photo: "Photo d'identité",
  piece: "CNI / Passeport",
  certificat: "Certificat d'aptitude",
  residence: "Justificatif de domicile",
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
  visionBinoculaire: OuiNon;
  communicationUrgence: OuiNon;
  aidesVisuelles: OuiNon;
  exemptAffection: OuiNon;
  verdict: Verdict;
  details: string;
  dateDelivrance: string;
  validJusquau: string;
}

export type Verdict = "apte" | "apte_restrictions" | "inapte_temporaire" | "inapte" | "";
export const VERDICT_LABELS: Record<Verdict, string> = {
  apte: "Apte sans restriction",
  apte_restrictions: "Apte avec restrictions",
  inapte_temporaire: "Inapte temporaire",
  inapte: "Inapte définitif",
  "": "Non renseigné",
};
export function isInapte(v: Verdict) {
  return v === "inapte" || v === "inapte_temporaire";
}

export interface Visite {
  id: number;
  numero: string;
  marinId: number;
  praticien: string;
  creeLe: string;
  traiteLe: string;
  examens: {
    taille: string;
    poids: string;
    tension: string;
    pouls: string;
    vision: string;
    visionCorrigee?: string | undefined;
    audition: string;
    observations: string;
  };
  complementaires: string;
  recommandations: string;
  documents: { type: string; nom: string; date: string }[];
  stcw: Stcw;
  signee: boolean;
  signataire: string;
  revoquee?: boolean | undefined;
  motifRevocation?: string | undefined;
}

interface State {
  marins: Marin[];
  visites: Visite[];
  roles: RoleEquipage[];
  audit: AuditEntry[];
}

const KEY = "dgmm-gdm-v3";

/** Empreinte 64 bits (deux FNV-1a) — démonstration ; en production : SHA-256 côté serveur. */
export function empreinte(src: string): string {
  let h1 = 0x811c9dc5,
    h2 = 0x01000193;
  for (let i = 0; i < src.length; i++) {
    h1 = Math.imul(h1 ^ src.charCodeAt(i), 16777619);
    h2 = Math.imul(h2 ^ src.charCodeAt(i), 2246822519);
  }
  const part = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  return `${part(h1)}${part(h2)}`;
}

function auditPayload(e: Omit<AuditEntry, "hash">) {
  return `${e.seq}|${e.date}|${e.acteur}|${e.role}|${e.action}|${e.cible}|${e.poste}|${e.prev}`;
}

function roleDe(acteur: string): string {
  return (
    ACCOUNTS.find((a) => a.nom === acteur)?.roleLabel ??
    (acteur.startsWith("Armateur") ? "Armateur" : acteur.startsWith("Marin") ? "Marin" : "Agent")
  );
}

function poste(): string {
  if (typeof navigator === "undefined") return "serveur";
  const ua = navigator.userAgent;
  const nav = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Navigateur";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return `${nav}${os ? ` / ${os}` : ""}`;
}

function appendAudit(
  audit: AuditEntry[],
  acteur: string,
  action: string,
  cible: string,
  date = nowIso(),
  post = poste(),
): AuditEntry[] {
  const last = audit[audit.length - 1];
  const base = {
    seq: (last?.seq ?? 0) + 1,
    date,
    acteur,
    role: roleDe(acteur),
    action,
    cible,
    poste: post,
    prev: last?.hash ?? "0".repeat(16),
  };
  return [...audit, { ...base, hash: empreinte(auditPayload(base)) }];
}

/** Vérifie la chaîne d'empreintes : renvoie le n° de la première entrée altérée, ou null. */
export function verifierAudit(audit: AuditEntry[]): number | null {
  let prev = "0".repeat(16);
  for (const e of audit) {
    const { hash, ...base } = e;
    if (e.prev !== prev || empreinte(auditPayload(base)) !== hash) return e.seq;
    prev = hash;
  }
  return null;
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}
function daysAgo(n: number) {
  return new Date(Date.now() - n * DAY).toISOString();
}

export const QUARTIERS = [
  "Libreville",
  "Port-Gentil",
  "Owendo",
  "Mayumba",
  "Lambaréné",
  "Gamba",
  "Cocobeach",
];
export const NATIONALITES = [
  "Gabonaise",
  "Camerounaise",
  "Congolaise",
  "Équato-guinéenne",
  "Sénégalaise",
  "Française",
  "Autre",
];
export const QUARTIERS_RESIDENCE = [
  "Santa Barbara / Pog",
  "Mounadji / Pog",
  "Mini-prix / Pog",
  "Akébé / Lbv",
  "Nzeng-Ayong / Lbv",
  "Owendo",
  "Autre",
];
export const ENTREPRISES = [
  "SNAT Gabon",
  "Bourbon Offshore",
  "Gabon Port Management",
  "Satram",
  "Perenco Marine",
  "Edelweiss Maritime",
];
export const PRATICIENS = ["Dr MÉDECIN DU TRAVAIL", "Dr KONGO A."];

function genNip(id: number, d = new Date()) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `${15100 + id}-${yy}${mm}-DGM`;
}

function emptyStcw(): Stcw {
  return {
    identiteVerifiee: "",
    acuiteVisuelle: "",
    auditiveSansAide: "",
    acuiteAuditive: "",
    couleurs: "",
    dateTestCouleurs: "",
    veille: "",
    visionBinoculaire: "",
    communicationUrgence: "",
    aidesVisuelles: "",
    exemptAffection: "",
    verdict: "",
    details: "",
    dateDelivrance: "",
    validJusquau: "",
  };
}
export { emptyStcw };

function seed(): State {
  const raw: [string, string, "M" | "F", number, string, Etat, Etat, number, Partial<Marin>?][] = [
    [
      "DONGO",
      "Renade",
      "M",
      45,
      "Capitaine",
      "validee",
      "validee",
      12,
      {
        quartierInscription: "Port-Gentil",
        couleurYeux: "Marron",
        couleurCheveux: "Noir",
        taille: "178",
        signeParticulier: "Néant",
      },
    ],
    ["HAPPI", "Éric", "M", 22, "Matelot", "validee", "validee", 160],
    [
      "ATENDE",
      "Mélissa",
      "F",
      24,
      "Officier pont",
      "validee",
      "validee",
      170,
      {
        quartierInscription: "Libreville",
        couleurYeux: "Noir",
        couleurCheveux: "Noir",
        taille: "165",
        signeParticulier: "Néant",
      },
    ],
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
  const marins: Marin[] = raw.map(
    ([nom, prenom, sexe, age, profession, va, vm, created, extra], i) => {
      const id = i + 1;
      const birth = new Date(now.getFullYear() - age, (i * 5) % 12, 1 + (i % 27));
      return {
        id,
        nip: genNip(id, new Date(Date.now() - created * DAY)),
        livret: va === "validee" && vm === "validee" ? `LM-${String(id).padStart(5, "0")}` : "",
        nom,
        prenom,
        sexe,
        dateNaissance: iso(birth),
        profession,
        nationalite:
          i % 7 === 3
            ? "Camerounaise"
            : i % 9 === 5
              ? "Française"
              : i % 11 === 8
                ? "Congolaise"
                : "Gabonaise",
        entreprise: ENTREPRISES[i % ENTREPRISES.length]!,
        tel1: `07${String(7452017 + i * 1311).slice(0, 7)}`,
        tel2: "",
        quartier: QUARTIERS_RESIDENCE[i % QUARTIERS_RESIDENCE.length]!,
        email: `${prenom
          .split(" ")[0]!
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")}.${nom.split(" ")[0]!.toLowerCase()}@exemple.ga`,
        signeParticulier: "",
        couleurYeux: "",
        couleurCheveux: "",
        taille: "",
        quartierInscription: i % 3 === 0 ? "Port-Gentil" : i % 3 === 1 ? "Libreville" : "",
        dateMariage: "",
        lieuMariage: "",
        documents:
          va === "validee"
            ? {
                photo: "photo.jpg",
                piece: "cni.pdf",
                residence: "residence.pdf",
                contrat: "contrat.pdf",
              }
            : { piece: "cni.pdf" },
        validationAdmin: va,
        validationMedicale: vm,
        login: `${nom.split(" ")[0]!.toLowerCase()}${id}`,
        mdp: "azerty",
        creePar: i % 2 ? "Agent DGMM" : "Dr MÉDECIN DU TRAVAIL",
        creeLe: daysAgo(created),
        modifieLe: daysAgo(Math.max(0, created - 3)),
        ...extra,
      };
    },
  );
  // Visites : certificats valides, expirant bientôt et expirés.
  const visitePlan: [number, number, Verdict, string?][] = [
    [1, 400, "apte"],
    [2, 200, "apte"],
    [3, 15, "apte"],
    [5, -20, "apte"],
    [7, 300, "apte_restrictions", "Port obligatoire de verres correcteurs."],
    [8, 25, "apte"],
    [9, 500, "apte"],
    [12, -5, "apte"],
    [13, 600, "apte_restrictions", "Navigation côtière uniquement."],
    [15, 180, "apte"],
    [10, 90, "inapte_temporaire", "Hypertension non contrôlée — nouvelle évaluation dans 3 mois."],
  ];
  const visites: Visite[] = visitePlan.map(([marinId, validDays, verdict, details], i) => {
    const id = 3850 + i;
    const created = new Date(
      Date.now() - (validDays > 0 ? 365 * 2 * DAY - validDays * DAY : 730 * DAY - validDays * DAY),
    );
    const deliv = new Date(Date.now() - Math.max(1, 730 - validDays) * DAY);
    const s: Stcw = {
      identiteVerifiee: "oui",
      acuiteVisuelle: "oui",
      auditiveSansAide: "oui",
      acuiteAuditive: "oui",
      couleurs: "oui",
      dateTestCouleurs: iso(deliv),
      veille: "oui",
      visionBinoculaire: "oui",
      communicationUrgence: "oui",
      aidesVisuelles: verdict === "apte_restrictions" || i % 3 === 0 ? "oui" : "non",
      exemptAffection: verdict === "inapte_temporaire" ? "non" : "oui",
      verdict,
      details: details ?? "",
      dateDelivrance: isInapte(verdict) ? "" : iso(deliv),
      validJusquau: isInapte(verdict) ? "" : iso(new Date(Date.now() + validDays * DAY)),
    };
    void created;
    return {
      id,
      numero: `${id}-${String(deliv.getFullYear()).slice(2)}${String(deliv.getMonth() + 1).padStart(2, "0")}-VM`,
      marinId,
      praticien: PRATICIENS[i % 2]!,
      creeLe: deliv.toISOString(),
      traiteLe: deliv.toISOString(),
      examens: {
        taille: "175",
        poids: "74",
        tension: verdict === "inapte_temporaire" ? "16/10" : "12/8",
        pouls: "72",
        vision: verdict === "apte_restrictions" ? "6/10" : "10/10",
        visionCorrigee: "10/10",
        audition: "Normale",
        observations: "RAS",
      },
      complementaires: "Glycémie, NFS : normales.",
      recommandations: "Hydratation régulière, port des EPI.",
      documents: [],
      stcw: s,
      signee: true,
      signataire: PRATICIENS[i % 2]!,
    };
  });
  // Visite du jour en cours de saisie (brouillon).
  visites.push({
    id: 3870,
    numero: `3870-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}-VM`,
    marinId: 4,
    praticien: PRATICIENS[0]!,
    creeLe: new Date(Date.now() - 2 * 3600000).toISOString(),
    traiteLe: new Date(Date.now() - 2 * 3600000).toISOString(),
    examens: {
      taille: "172",
      poids: "80",
      tension: "13/8",
      pouls: "76",
      vision: "",
      audition: "",
      observations: "",
    },
    complementaires: "",
    recommandations: "",
    documents: [],
    stcw: emptyStcw(),
    signee: false,
    signataire: "",
  });
  for (const m of marins) {
    const h: Evenement[] = [
      { date: m.creeLe, action: "Dossier créé", auteur: m.creePar, type: "creation" },
    ];
    if (m.validationAdmin !== "en_attente")
      h.push({
        date: m.modifieLe,
        action:
          m.validationAdmin === "validee"
            ? "Validation administrative accordée"
            : "Dossier rejeté par l'administration",
        auteur: "Agent DGMM",
        type: "admin",
      });
    m.historique = h;
  }
  for (const v of visites.filter((x) => x.signee)) {
    marins
      .find((m) => m.id === v.marinId)
      ?.historique?.push({
        date: v.traiteLe,
        action: `Visite ${v.numero} signée — ${VERDICT_LABELS[v.stcw.verdict]}`,
        auteur: v.signataire,
        type: "medical",
      });
  }
  for (const m of marins.filter((x) => x.livret)) {
    m.historique?.push({
      date: m.modifieLe,
      action: `Livret ${m.livret} délivré`,
      auteur: "Gestionnaire MM",
      type: "livret",
    });
  }
  // Relevé des services en mer pour les marins validés.
  let embId = 1;
  for (const m of marins.filter((x) => x.validationAdmin === "validee")) {
    const flotte = TOUS_NAVIRES.filter((n) => n.armateur === m.entreprise);
    const n = 1 + (m.id % 3);
    const list: Embarquement[] = [];
    let fin = 20 + (m.id % 5) * 9;
    for (let k = 0; k < n; k++) {
      const nav =
        flotte[k % Math.max(1, flotte.length)] ?? TOUS_NAVIRES[m.id % TOUS_NAVIRES.length]!;
      const duree = 60 + ((m.id * 37 + k * 53) % 150);
      const deb = fin + duree;
      list.push({
        id: embId++,
        navire: nav.nom,
        imo: nav.imo,
        typeNavire: nav.type,
        jauge: nav.jauge,
        armateur: nav.armateur,
        fonction: m.profession,
        embarquement: iso(new Date(Date.now() - deb * DAY)),
        debarquement: k === 0 && m.id % 4 === 0 ? "" : iso(new Date(Date.now() - fin * DAY)),
        saisiPar: "Agent DGMM",
        saisiLe: daysAgo(fin),
      });
      fin = deb + 15 + k * 11;
    }
    m.embarquements = list;
  }
  // Rôle d'équipage déclaré par Perenco Marine.
  const perenco = marins.filter((m) => m.entreprise === "Perenco Marine");
  const roles: RoleEquipage[] = [
    {
      id: 1,
      armateur: "Perenco Marine",
      navire: "Perenco Mandji",
      appareillage: iso(new Date(Date.now() + 6 * DAY)),
      membres: [
        ...perenco.map((m) => ({ marinId: m.id, fonction: m.profession })),
        { marinId: 3, fonction: "Officier de quart pont" },
      ],
      creeLe: daysAgo(4),
      modifieLe: daysAgo(2),
    },
  ];
  // Journal d'audit initial reconstitué à partir des historiques.
  const evts = marins
    .flatMap((m) =>
      (m.historique ?? []).map((e) => ({ ...e, cible: `${m.nom} ${m.prenom} (${m.nip})` })),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  let audit: AuditEntry[] = [];
  for (const e of evts)
    audit = appendAudit(audit, e.auteur, e.action, e.cible, e.date, "Chrome / Windows");
  return { marins, visites, roles, audit };
}

let state: State | null = null;
const listeners = new Set<() => void>();

function load(): State {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<State>;
      return {
        marins: parsed.marins ?? [],
        visites: parsed.visites ?? [],
        roles: parsed.roles ?? [],
        audit: parsed.audit ?? [],
      };
    }
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

/** Enregistre le nouvel état ; si `log` est fourni, ajoute une entrée chaînée au journal d'audit. */
function set(next: State, log?: { acteur: string; action: string; cible: string }) {
  state = log
    ? { ...next, audit: appendAudit(next.audit, log.acteur, log.action, log.cible) }
    : next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      console.warn("Stockage local plein : les dernières modifications ne seront pas conservées.");
    }
  }
  listeners.forEach((l) => l());
}

function cible(m: Marin | undefined) {
  return m ? `${m.nom} ${m.prenom} (${m.nip})` : "—";
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useDgmm<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => select(get()),
    () => select(serverState),
  );
}
export function useMarins() {
  return useDgmm((s) => s.marins);
}
export function useVisites() {
  return useDgmm((s) => s.visites);
}
export function useRoles() {
  return useDgmm((s) => s.roles);
}
export function useAudit() {
  return useDgmm((s) => s.audit);
}

/** Trace une consultation ou une action sans modification de données. */
export function journaliser(acteur: string, action: string, cibleTxt: string) {
  set(get(), { acteur, action, cible: cibleTxt });
}

export function nowIso() {
  return new Date().toISOString();
}

function withEvent(m: Marin, action: string, auteur: string, type: Evenement["type"]): Marin {
  return { ...m, historique: [...(m.historique ?? []), { date: nowIso(), action, auteur, type }] };
}

export function saveMarin(
  input: Omit<
    Marin,
    | "id"
    | "nip"
    | "login"
    | "mdp"
    | "creeLe"
    | "modifieLe"
    | "creePar"
    | "livret"
    | "validationAdmin"
    | "validationMedicale"
    | "historique"
  > & { id?: number },
  auteur: string,
): Marin {
  const s = get();
  if (input.id) {
    const marins = s.marins.map((m) =>
      m.id === input.id
        ? withEvent(
            { ...m, ...input, id: m.id, modifieLe: nowIso() },
            "Dossier modifié",
            auteur,
            "modification",
          )
        : m,
    );
    const saved = marins.find((m) => m.id === input.id)!;
    set(
      { ...s, marins },
      { acteur: auteur, action: "Modification du dossier", cible: cible(saved) },
    );
    return saved;
  }
  const id = Math.max(0, ...s.marins.map((m) => m.id)) + 1;
  const m: Marin = {
    ...input,
    id,
    nip: genNip(id),
    livret: "",
    login: `${(input.nom.split(" ")[0] ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[^a-z]/g, "")}${id}`,
    mdp: Math.random().toString(36).slice(2, 8),
    embarquements: [],
    validationAdmin: "en_attente",
    validationMedicale: "en_attente",
    creePar: auteur,
    creeLe: nowIso(),
    modifieLe: nowIso(),
    historique: [{ date: nowIso(), action: "Dossier créé — enrôlement", auteur, type: "creation" }],
  };
  set(
    { ...s, marins: [m, ...s.marins] },
    { acteur: auteur, action: "Enrôlement d'un nouveau marin", cible: cible(m) },
  );
  return m;
}

export function updateMarin(id: number, patch: Partial<Marin>) {
  const s = get();
  set({
    ...s,
    marins: s.marins.map((m) => (m.id === id ? { ...m, ...patch, modifieLe: nowIso() } : m)),
  });
}

export function saveVisite(
  v: Omit<Visite, "id" | "numero" | "creeLe" | "traiteLe"> & { id?: number },
): Visite {
  const s = get();
  let saved: Visite;
  let visites: Visite[];
  if (v.id) {
    visites = s.visites.map((x) =>
      x.id === v.id ? { ...x, ...v, id: x.id, traiteLe: nowIso() } : x,
    );
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
        ? withEvent(
            {
              ...m,
              validationMedicale: isInapte(saved.stcw.verdict) ? "rejetee" : "validee",
              modifieLe: nowIso(),
            },
            `Visite ${saved.numero} signée — ${VERDICT_LABELS[saved.stcw.verdict]}`,
            saved.signataire,
            "medical",
          )
        : m,
    );
  }
  set(
    { ...s, marins, visites },
    {
      acteur: saved.signee ? saved.signataire : saved.praticien,
      action: saved.signee
        ? `Signature du certificat ${saved.numero} — ${VERDICT_LABELS[saved.stcw.verdict]}`
        : `Saisie de la visite ${saved.numero} (brouillon)`,
      cible: cible(marins.find((m) => m.id === saved.marinId)),
    },
  );
  return saved;
}

export function setValidationAdmin(id: number, etat: Etat, auteur = "Agent DGMM", motif = "") {
  const s = get();
  const action =
    etat === "validee"
      ? "Validation administrative accordée"
      : `Dossier rejeté par l'administration${motif ? ` : ${motif}` : ""}`;
  set(
    {
      ...s,
      marins: s.marins.map((m) =>
        m.id === id
          ? withEvent({ ...m, validationAdmin: etat, modifieLe: nowIso() }, action, auteur, "admin")
          : m,
      ),
    },
    {
      acteur: auteur,
      action: etat === "validee" ? "Visa administratif DGMM accordé" : action,
      cible: cible(s.marins.find((m) => m.id === id)),
    },
  );
}

/** Révoque un certificat signé (il n'est plus valable, la vérification QR l'indique). */
export function revoquerCertificat(id: number, motif: string, auteur: string) {
  const s = get();
  const v = s.visites.find((x) => x.id === id);
  if (!v) return;
  set(
    {
      ...s,
      visites: s.visites.map((x) =>
        x.id === id ? { ...x, revoquee: true, motifRevocation: motif } : x,
      ),
      marins: s.marins.map((m) =>
        m.id === v.marinId
          ? withEvent(
              { ...m, validationMedicale: "en_attente", modifieLe: nowIso() },
              `Certificat ${v.numero} révoqué : ${motif}`,
              auteur,
              "medical",
            )
          : m,
      ),
    },
    {
      acteur: auteur,
      action: `Révocation du certificat ${v.numero} : ${motif}`,
      cible: cible(s.marins.find((m) => m.id === v.marinId)),
    },
  );
}

/** Code de validation imprimé dans le QR du certificat (empreinte non devinable du certificat). */
export function codeValidation(v: Visite, nip: string): string {
  const src = `${v.id}|${v.numero}|${nip}|${v.signataire}|${v.stcw.dateDelivrance}|DGMM`;
  let h1 = 0x811c9dc5,
    h2 = 0x01000193;
  for (let i = 0; i < src.length; i++) {
    h1 = Math.imul(h1 ^ src.charCodeAt(i), 16777619);
    h2 = Math.imul(h2 ^ src.charCodeAt(i), 2246822519);
  }
  const part = (n: number) => (n >>> 0).toString(36).toUpperCase().padStart(6, "0").slice(-6);
  return `${v.id}-${part(h1)}${part(h2)}`;
}

export type EtatCertificat =
  "valide" | "expire_bientot" | "expire" | "revoque" | "inapte" | "brouillon";
export function etatCertificat(v: Visite, now = new Date()): EtatCertificat {
  if (!v.signee) return "brouillon";
  if (v.revoquee) return "revoque";
  if (isInapte(v.stcw.verdict)) return "inapte";
  const st = certificateStatus(v.stcw.validJusquau, now);
  return st === "aucun" ? "expire" : st;
}

/** Attribue un numéro de livret maritime au marin (s'il n'en a pas déjà un). */
export function delivrerLivret(id: number, auteur = "Gestionnaire MM"): string {
  const s = get();
  const m = s.marins.find((x) => x.id === id);
  if (!m) return "";
  if (m.livret) return m.livret;
  const livret = `LM-${String(id).padStart(5, "0")}`;
  set(
    {
      ...s,
      marins: s.marins.map((x) =>
        x.id === id
          ? withEvent(
              { ...x, livret, modifieLe: nowIso() },
              `Livret ${livret} délivré`,
              auteur,
              "livret",
            )
          : x,
      ),
    },
    { acteur: auteur, action: `Délivrance du livret maritime ${livret}`, cible: cible(m) },
  );
  return livret;
}

/* ---------- Services en mer ---------- */

export function ajouterEmbarquement(
  marinId: number,
  e: Omit<Embarquement, "id" | "saisiLe" | "saisiPar">,
  auteur: string,
) {
  const s = get();
  const m = s.marins.find((x) => x.id === marinId);
  if (!m) return;
  const id = Math.max(0, ...s.marins.flatMap((x) => (x.embarquements ?? []).map((y) => y.id))) + 1;
  const emb: Embarquement = { ...e, id, saisiPar: auteur, saisiLe: nowIso() };
  set(
    {
      ...s,
      marins: s.marins.map((x) =>
        x.id === marinId
          ? withEvent(
              { ...x, embarquements: [...(x.embarquements ?? []), emb], modifieLe: nowIso() },
              `Embarquement inscrit : ${e.navire} (${e.fonction})`,
              auteur,
              "modification",
            )
          : x,
      ),
    },
    { acteur: auteur, action: `Inscription d'un embarquement sur ${e.navire}`, cible: cible(m) },
  );
}

export function cloturerEmbarquement(
  marinId: number,
  embId: number,
  debarquement: string,
  auteur: string,
) {
  const s = get();
  const m = s.marins.find((x) => x.id === marinId);
  set(
    {
      ...s,
      marins: s.marins.map((x) =>
        x.id === marinId
          ? {
              ...x,
              embarquements: (x.embarquements ?? []).map((y) =>
                y.id === embId ? { ...y, debarquement } : y,
              ),
              modifieLe: nowIso(),
            }
          : x,
      ),
    },
    { acteur: auteur, action: `Débarquement enregistré le ${debarquement}`, cible: cible(m) },
  );
}

export function joursEmbarquement(e: Embarquement, now = new Date()): number {
  const fin = e.debarquement ? new Date(e.debarquement) : now;
  return Math.max(0, Math.round((fin.getTime() - new Date(e.embarquement).getTime()) / DAY) + 1);
}

/* ---------- Rôles d'équipage (armateurs) ---------- */

export function saveRole(
  r: Omit<RoleEquipage, "id" | "creeLe" | "modifieLe"> & { id?: number },
  acteur: string,
): RoleEquipage {
  const s = get();
  let saved: RoleEquipage;
  let roles: RoleEquipage[];
  if (r.id) {
    roles = s.roles.map((x) => (x.id === r.id ? { ...x, ...r, id: x.id, modifieLe: nowIso() } : x));
    saved = roles.find((x) => x.id === r.id)!;
  } else {
    saved = {
      ...r,
      id: Math.max(0, ...s.roles.map((x) => x.id)) + 1,
      creeLe: nowIso(),
      modifieLe: nowIso(),
    };
    roles = [saved, ...s.roles];
  }
  set(
    { ...s, roles },
    {
      acteur,
      action: `Déclaration du rôle d'équipage — ${saved.navire} (${saved.membres.length} marins)`,
      cible: saved.armateur,
    },
  );
  return saved;
}

export function setAlertes(marinId: number, alertes: { sms: boolean; email: boolean }) {
  const s = get();
  const m = s.marins.find((x) => x.id === marinId);
  set(
    { ...s, marins: s.marins.map((x) => (x.id === marinId ? { ...x, alertes } : x)) },
    {
      acteur: `Marin ${m?.nip ?? ""}`,
      action: "Préférences d'alerte d'expiration modifiées",
      cible: cible(m),
    },
  );
}

export function resetDemo() {
  set(seed());
}

/** Dernier certificat signé d'un marin. */
export function lastCertificate(visites: Visite[], marinId: number): Visite | undefined {
  return visites
    .filter(
      (v) =>
        v.marinId === marinId &&
        v.signee &&
        !v.revoquee &&
        !isInapte(v.stcw.verdict) &&
        v.stcw.validJusquau,
    )
    .sort((a, b) => b.stcw.validJusquau.localeCompare(a.stcw.validJusquau))[0];
}

export function marinCertStatus(visites: Visite[], marinId: number, now = new Date()): CertStatus {
  return certificateStatus(lastCertificate(visites, marinId)?.stcw.validJusquau, now);
}

const REQUIRED_LIVRET: (keyof Marin)[] = [
  "dateNaissance",
  "taille",
  "couleurYeux",
  "couleurCheveux",
  "quartierInscription",
  "signeParticulier",
];
export function dossierIncomplet(m: Marin): boolean {
  return REQUIRED_LIVRET.some((k) => !m[k]) || !m.documents.photo || !m.documents.piece;
}
export function manquants(m: Marin): string[] {
  const labels: Partial<Record<keyof Marin, string>> = {
    dateNaissance: "Date de naissance",
    taille: "Taille",
    couleurYeux: "Couleur des yeux",
    couleurCheveux: "Couleur des cheveux",
    quartierInscription: "Quartier d'inscription",
    signeParticulier: "Signe particulier",
  };
  const out = REQUIRED_LIVRET.filter((k) => !m[k]).map((k) => labels[k]!);
  if (!m.documents.photo) out.push("Photo d'identité");
  if (!m.documents.piece) out.push("Pièce d'identité");
  return out;
}

export function eligibleLivret(m: Marin, visites: Visite[], now = new Date()): boolean {
  const st = marinCertStatus(visites, m.id, now);
  return (
    m.validationAdmin === "validee" &&
    m.validationMedicale === "validee" &&
    (st === "valide" || st === "expire_bientot") &&
    !dossierIncomplet(m)
  );
}

export function fullName(m?: Marin) {
  return m ? `${m.nom} ${m.prenom}`.trim() : "—";
}
export function age(m: Marin) {
  return ageFrom(m.dateNaissance);
}

export function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Une pièce jointe est stockée sous forme « nom » (démo) ou « nom::dataURL » (fichier réellement chargé). */
export function parseDoc(
  v: string | undefined,
): { nom: string; url?: string | undefined; image: boolean; pdf: boolean } | null {
  if (!v) return null;
  if (v.startsWith("data:")) return { nom: "Photo d'identité", url: v, image: true, pdf: false };
  const i = v.indexOf("::");
  const nom = i >= 0 ? v.slice(0, i) : v;
  const url = i >= 0 ? v.slice(i + 2) : undefined;
  return {
    nom,
    url,
    image: !!url?.startsWith("data:image"),
    pdf: !!url?.startsWith("data:application/pdf"),
  };
}

/* ---------- Niveau de conformité STCW (jauges) ---------- */

/** Émeraude : conforme · Ambre : à renouveler sous 60 j · Rubis : expiré / inapte / absent · Ardoise : visite en brouillon. */
export type Niveau = "conforme" | "alerte" | "non_conforme" | "brouillon";

export function niveauConformite(m: Marin, visites: Visite[], date: Date = new Date()): Niveau {
  const cert = lastCertificate(visites, m.id);
  if (cert) {
    const fin = new Date(cert.stcw.validJusquau + "T23:59:59").getTime();
    const jours = (fin - date.getTime()) / DAY;
    if (jours >= 0) return jours <= 60 ? "alerte" : "conforme";
  }
  if (visites.some((v) => v.marinId === m.id && !v.signee)) return "brouillon";
  return "non_conforme";
}
