import { useSyncExternalStore } from "react";
import { ageFrom, canIssueLivret, certificateStatus, DAY, type CertStatus } from "./rules";
import { ACCOUNTS } from "./auth";
import { TOUS_NAVIRES, type TypeFlotte } from "./maritime";

export type Etat = "en_attente" | "transmis_direction" | "validee" | "rejetee";
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
  /** Station maritime d'attache (référentiel DGMM : ST-OWE, ST-POG…). */
  station?: string | undefined;
  /** Description physique : poids en kg (la taille est dans `taille`). */
  poids?: string | undefined;
  /** Signature du marin, tracée à l'écran lors de l'enrôlement (image PNG en data URL). */
  signature?: string | undefined;
  /** Position du domicile placée par le marin sur la carte (sinon : centre de son quartier). */
  domicile?: { lat: number; lng: number } | undefined;
  historique?: Evenement[] | undefined;
  embarquements?: Embarquement[] | undefined;
  alertes?: { sms: boolean; email: boolean } | undefined;
  documents: Partial<Record<DocKey, string>>;
  piecesEnLigne?: DocKey[] | undefined;
  verificationPieces?: Partial<
    Record<DocKey, { conforme: boolean; verifiePar: string; verifieLe: string }>
  >;
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
  roleId?: number | undefined;
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
  statut: "en_attente_validation" | "valide_dgmm" | "rejete";
  justificatifTampon?: string | undefined;
  motifRejet?: string | undefined;
  validePar?: string | undefined;
  valideLe?: string | undefined;
  stationValidation?: string | undefined;
}

/** Rôle d'équipage déclaré par un armateur pour un appareillage. */
export interface RoleEquipage {
  id: number;
  armateur: string;
  navire: string;
  navireImo?: string | undefined;
  typeNavire?: string | undefined;
  jauge?: number | undefined;
  appareillage: string;
  membres: { marinId: number; fonction: string }[];
  justificatifDebarquement?: string | undefined;
  roleDebarquementSoumisLe?: string | undefined;
  roleDebarquementSoumisPar?: string | undefined;
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

export type DocKey =
  | "photo"
  | "photoSupplementaire"
  | "piece"
  | "naissance"
  | "casier"
  | "stcw"
  | "certificat"
  | "residence"
  | "contrat"
  | "livret";
export const DOC_LABELS: Record<DocKey, string> = {
  photo: "Photo d'identité",
  photoSupplementaire: "Deuxième photo d'identité",
  piece: "CNI / Passeport",
  naissance: "Acte de naissance",
  casier: "Casier judiciaire",
  stcw: "Diplômes / certificats STCW",
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
    ecg?: string | undefined;
    observations: string;
  };
  /** Antécédents médicaux relevés lors de la visite. */
  antecedents?: string | undefined;
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

const KEY = "dgmm-gdm-v7";

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

/** Compagnies proposées dans les formulaires : armateurs de démonstration et entreprises maritimes du Gabon. */
export const ENTREPRISES_CHOIX = [
  ...ENTREPRISES,
  "CMA CGM Gabon",
  "Maersk Gabon",
  "MSC Gabon",
  "AGL Gabon",
  "SOTRASMAR",
  "ART Gabon",
  "Sogakai",
  "NLS Gabon",
];
const ENTREPRISE_VILLE = [
  "Owendo",
  "Port-Gentil",
  "Owendo",
  "Port-Gentil",
  "Port-Gentil",
  "Mayumba",
];
export const PRATICIENS = ["Dr MOUGOULA Christian", "Dr KONGO A."];

/** Signature manuscrite de démonstration (SVG en data URL). */
function signatureDemo(nom: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="70"><text x="10" y="48" font-family="Brush Script MT, Segoe Script, cursive" font-size="34" fill="#13294B">${nom.replace(/[<>&]/g, "")}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** NIP : GAB-AAAA-NNNNNN (année d'enrôlement). */
function genNip(id: number, d = new Date()) {
  return `GAB-${d.getFullYear()}-${String(1200 + id).padStart(6, "0")}`;
}
/** Livret maritime : LIV-GA-AAAA-NNNN. */
function genLivret(id: number, d = new Date()) {
  return `LIV-GA-${d.getFullYear()}-${String(800 + id).padStart(4, "0")}`;
}
/** N° de visite / certificat médical : VM-AAAA-NNNN. */
function genNumero(id: number, d = new Date()) {
  return `VM-${d.getFullYear()}-${String(id - 3800).padStart(4, "0")}`;
}
const STATION_PAR_VILLE: Record<string, string> = {
  Libreville: "ST-LBV",
  Owendo: "ST-OWE",
  "Port-Gentil": "ST-POG",
  Mayumba: "ST-MAY",
};

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
    ["HAPPI", "Éric", "M", 22, "Matelot", "validee", "validee", 160, { nip: "GAB-2026-001202" }],
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
    ["IBINGA", "Jean", "M", 36, "Mécanicien", "en_attente", "en_attente", 150],
    ["MBOUMA", "René", "M", 39, "Chef mécanicien", "validee", "validee", 240],
    ["ABAGHA BRAD", "Brunel Rosy", "F", 19, "Élève officier", "en_attente", "en_attente", 250],
    ["ABA A ESSONO", "Tanguy", "M", 45, "Maître d'équipage", "validee", "validee", 300],
    ["IBRAHIM", "Maurice", "M", 51, "Cuisinier de bord", "validee", "validee", 280],
    ["NZAMBA", "Prisca", "F", 28, "Officier radio", "validee", "validee", 90],
    ["OBAME", "Serge", "M", 33, "Matelot", "validee", "rejetee", 70],
    ["MOUSSAVOU", "Arnaud", "M", 21, "Matelot", "en_attente", "en_attente", 40],
    ["NDONG", "Cyrille", "M", 23, "Pilote", "validee", "validee", 30],
    ["KOUMBA", "Ghislain", "M", 47, "Capitaine", "validee", "validee", 400],
    ["MABIKA", "Laure", "F", 20, "Élève officier", "en_attente", "en_attente", 25],
    ["ESSONO", "Dieudonné", "M", 37, "Mécanicien", "validee", "validee", 200],
    ["BOUANGA", "Divine", "F", 23, "Officier pont", "en_attente", "en_attente", 20],
    ["MINTSA", "Paul", "M", 40, "Matelot", "en_attente", "en_attente", 3],
    ["OYONO", "Clarisse", "F", 29, "Hôtesse de bord", "en_attente", "en_attente", 9],
    ["LEKOGO", "Fabrice", "M", 31, "Matelot", "en_attente", "en_attente", 11],
    ["NGUEMA", "Hervé", "M", 26, "Mécanicien", "en_attente", "en_attente", 14],
    ["MOUELE", "Sandrine", "F", 22, "Matelot", "en_attente", "validee", 18],
    ["ONDO", "Rodrigue", "M", 34, "Pilote", "en_attente", "validee", 21],
    ["TCHIBINDA", "Marc", "M", 44, "Matelot", "rejetee", "en_attente", 60],
    // Marin de référence du dossier technique DGMM.
    [
      "OBAME NGUEMA",
      "Jean-Pierre",
      "M",
      38,
      "Second Capitaine",
      "validee",
      "validee",
      600,
      {
        nip: "GAB-2024-001284",
        livret: "LIV-GA-2024-0891",
        dateNaissance: "1988-06-14",
        nationalite: "Gabonaise",
        entreprise: "SNAT Gabon",
        station: "ST-OWE",
        quartierInscription: "Libreville",
        taille: "178",
        poids: "76",
        couleurYeux: "Marron",
        couleurCheveux: "Noir",
        signeParticulier: "Cicatrice de 3 cm à l'avant-bras gauche",
        situationMatrimoniale: "Marié(e)",
      },
    ],
  ];
  const now = new Date();
  const marins: Marin[] = raw.map(
    ([nom, prenom, sexe, age, profession, va, vm, created, extra], i) => {
      const id = i + 1;
      const birth = new Date(now.getFullYear() - age, (i * 5) % 12, 1 + (i % 27));
      return {
        id,
        nip: genNip(id, new Date(Date.now() - created * DAY)),
        livret:
          va === "validee" && vm === "validee"
            ? genLivret(id, new Date(Date.now() - Math.max(0, created - 30) * DAY))
            : "",
        station:
          i % 9 === 4
            ? "ST-KAN"
            : i % 11 === 6
              ? "ST-LAM"
              : i % 13 === 7
                ? "ST-COC"
                : (STATION_PAR_VILLE[ENTREPRISE_VILLE[i % ENTREPRISES.length]!] ?? "ST-OWE"),
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
          va === "validee" || vm === "validee"
            ? {
                photo: "photo.jpg",
                piece: "cni.pdf",
                naissance: "acte-naissance.pdf",
                casier: "casier-judiciaire.pdf",
                stcw: "certificats-stcw.pdf",
                residence: "residence.pdf",
                contrat: "contrat.pdf",
              }
            : { piece: "cni.pdf" },
        validationAdmin: va,
        validationMedicale: vm,
        login: `${nom.split(" ")[0]!.toLowerCase()}${id}`,
        mdp: "azerty",
        creePar: i % 2 ? "Agent DGMM" : "Agent des Gens de Mer",
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
    // Circuit DGMM : visite médicale faite, visa administratif en attente des pièces.
    [21, 729, "apte"],
    [22, 728, "apte"],
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
      numero: genNumero(id, deliv),
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
    numero: genNumero(3870, now),
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
  // Visite de référence du dossier technique : OBAME NGUEMA Jean-Pierre, Dr MOUGOULA.
  visites.push({
    id: 3842,
    numero: "VM-2026-0042",
    marinId: 24,
    praticien: "Dr MOUGOULA Christian",
    creeLe: "2026-03-15T09:30:00.000Z",
    traiteLe: "2026-03-15T10:12:00.000Z",
    examens: {
      taille: "178",
      poids: "76",
      tension: "12/8",
      pouls: "68",
      vision: "OD 10/10 · OG 9/10",
      visionCorrigee: "OD 10/10 · OG 9/10 (avec correction)",
      audition: "Normale bilatérale",
      ecg: "Normal sans anomalie de rythme",
      observations: "Bon état général.",
    },
    antecedents: "Myopie corrigée. Aucun antécédent cardio-vasculaire.",
    complementaires: "ECG de repos : normal.",
    recommandations: "Port des verres correcteurs en service de quart.",
    documents: [],
    stcw: {
      identiteVerifiee: "oui",
      acuiteVisuelle: "oui",
      visionBinoculaire: "oui",
      aidesVisuelles: "oui",
      couleurs: "oui",
      dateTestCouleurs: "2026-03-15",
      auditiveSansAide: "oui",
      acuiteAuditive: "oui",
      communicationUrgence: "oui",
      veille: "oui",
      exemptAffection: "oui",
      verdict: "apte_restrictions",
      details: "Verres correcteurs obligatoires pour le quart de nuit.",
      dateDelivrance: "2026-03-15",
      validJusquau: "2028-03-14",
    },
    signee: true,
    signataire: "Dr MOUGOULA Christian",
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
            ? "Visa administratif DGMM accordé"
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
      action: `Délivrance du livret maritime ${m.livret}`,
      auteur: "Gestionnaire MM",
      type: "livret",
    });
  }
  // Signature (démonstration) et poids des marins validés.
  for (const m of marins.filter((x) => x.validationAdmin === "validee")) {
    m.signature = signatureDemo(`${m.prenom.split(" ")[0]} ${m.nom.split(" ")[0]}`);
    m.poids = m.poids ?? String(62 + ((m.id * 7) % 25));
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
        statut: "valide_dgmm",
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
  // Rôles d'équipage de démonstration : un rôle par navire des armateurs disposant d'un compte,
  // avec un embarquement ouvert (équipage actuellement en mer) rattaché à chaque rôle.
  const roles: RoleEquipage[] = [];
  const rolesDemo = ["Perenco Marine", "Bourbon Offshore", "SNAT Gabon"];
  for (const nomArm of rolesDemo) {
    const navs = TOUS_NAVIRES.filter((n) => n.armateur === nomArm);
    const equipe = marins.filter(
      (m) => m.entreprise === nomArm && m.validationAdmin === "validee",
    );
    // Démo : compléter l'effectif (2 marins par navire) avec des marins validés sans armateur de démo.
    const libres = marins.filter(
      (m) => m.validationAdmin === "validee" && !rolesDemo.includes(m.entreprise) && m.id !== 3,
    );
    while (equipe.length < navs.length * 2 && libres.length) {
      const m = libres.shift()!;
      m.entreprise = nomArm;
      equipe.push(m);
    }
    navs.forEach((nav, idx) => {
      const membresNav = equipe.filter((_, i) => i % navs.length === idx);
      if (nomArm === "Perenco Marine" && idx === 0 && !membresNav.some((m) => m.id === 3)) {
        const m3 = marins.find((m) => m.id === 3);
        if (m3 && !rolesDemo.includes(m3.entreprise)) membresNav.push(m3);
      }
      if (!membresNav.length) return;
      const roleId = roles.length + 1;
      const depart = 8 + idx * 11 + rolesDemo.indexOf(nomArm) * 5;
      roles.push({
        id: roleId,
        armateur: nomArm,
        navire: nav.nom,
        navireImo: nav.imo,
        typeNavire: nav.type,
        jauge: nav.jauge,
        appareillage: iso(new Date(Date.now() - depart * DAY)),
        membres: membresNav.map((m) => ({
          marinId: m.id,
          fonction: m.id === 3 && nomArm === "Perenco Marine" ? "Officier de quart pont" : m.profession,
        })),
        creeLe: daysAgo(depart + 2),
        modifieLe: daysAgo(depart),
      });
      for (const m of membresNav) {
        const debutIso = iso(new Date(Date.now() - depart * DAY));
        const veille = iso(new Date(Date.now() - (depart + 1) * DAY));
        const hist = (m.embarquements ?? []).map((e) =>
          !e.debarquement || e.debarquement > debutIso
            ? { ...e, debarquement: e.embarquement < veille ? veille : e.embarquement }
            : e,
        );
        hist.push({
          id: embId++,
          roleId,
          statut: "valide_dgmm",
          navire: nav.nom,
          imo: nav.imo,
          typeNavire: nav.type,
          jauge: nav.jauge,
          armateur: nomArm,
          fonction: m.id === 3 && nomArm === "Perenco Marine" ? "Officier de quart pont" : m.profession,
          embarquement: debutIso,
          debarquement: "",
          saisiPar: `Armateur ${nomArm}`,
          saisiLe: daysAgo(depart),
        });
        m.embarquements = hist;
      }
    });
  }
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
        // Migration : l'ancien bloc « biometrie » (empreintes simulées) est supprimé, seule la signature est conservée.
        marins: (parsed.marins ?? []).map((m) => {
          const ancien = m as Marin & { biometrie?: { signature?: string } };
          const { biometrie, ...reste } = ancien;
          return {
            ...reste,
            signature: reste.signature ?? biometrie?.signature,
            embarquements: (reste.embarquements ?? []).map((e) => ({
              ...e,
              statut: e.statut ?? "valide_dgmm",
            })),
          };
        }),
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
function set(next: State, log?: { acteur: string; action: string; cible: string; poste?: string | undefined }) {
  const updated = log
    ? { ...next, audit: appendAudit(next.audit, log.acteur, log.action, log.cible, nowIso(), log.poste ?? poste()) }
    : next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(updated));
    } catch (error) {
      throw new Error(
        "Impossible d'enregistrer les modifications : le stockage local est plein ou indisponible.",
        { cause: error },
      );
    }
  }
  state = updated;
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
export function journaliser(acteur: string, action: string, cibleTxt: string, opts?: { masquerPoste?: boolean }) {
  // Signalement anonyme : le poste (navigateur, système) n'est pas inscrit au journal.
  set(get(), { acteur, action, cible: cibleTxt, poste: opts?.masquerPoste ? "masqué" : undefined });
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
      numero: genNumero(id, d),
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
  const cibleMarin = s.marins.find((m) => m.id === id);
  if (
    !cibleMarin ||
    cibleMarin.validationAdmin !== "transmis_direction" ||
    (etat !== "validee" && etat !== "rejetee") ||
    (etat === "validee" && motifVisa(cibleMarin, s.visites))
  )
    return;
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

export function transmettreDossierDirection(id: number, auteur: string) {
  const s = get();
  const marin = s.marins.find((m) => m.id === id);
  const originauxNonVerifies = (marin?.piecesEnLigne ?? []).some(
    (piece) => !marin?.verificationPieces?.[piece]?.conforme,
  );
  if (!marin || marin.validationAdmin !== "en_attente" || originauxNonVerifies) return false;
  const action = "Dossier transmis à la Direction pour visa régalien";
  set(
    {
      ...s,
      marins: s.marins.map((m) =>
        m.id === id
          ? withEvent(
              { ...m, validationAdmin: "transmis_direction", modifieLe: nowIso() },
              action,
              auteur,
              "admin",
            )
          : m,
      ),
    },
    { acteur: auteur, action, cible: cible(marin) },
  );
  return true;
}

export function verifierOriginalPiece(
  id: number,
  piece: DocKey,
  conforme: boolean,
  auteur: string,
) {
  const s = get();
  const marin = s.marins.find((m) => m.id === id);
  if (!marin || !marin.documents[piece]) return false;
  const date = nowIso();
  const action = `Original physique ${conforme ? "vérifié conforme" : "non conforme"} — ${DOC_LABELS[piece]}`;
  set(
    {
      ...s,
      marins: s.marins.map((m) =>
        m.id === id
          ? withEvent(
              {
                ...m,
                verificationPieces: {
                  ...m.verificationPieces,
                  [piece]: { conforme, verifiePar: auteur, verifieLe: date },
                },
                modifieLe: date,
              },
              action,
              auteur,
              "admin",
            )
          : m,
      ),
    },
    { acteur: auteur, action, cible: cible(marin) },
  );
  return true;
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

/**
 * Code de validation imprimé dans le QR du certificat : GAB-DGMM-AAAA-MED-NNNN-XXXX.
 * Le suffixe de contrôle empêche de parcourir les certificats en devinant les numéros.
 */
export function codeValidation(v: Visite, nip: string): string {
  const src = `${v.id}|${v.numero}|${nip}|${v.signataire}|${v.stcw.dateDelivrance}|DGMM`;
  let h = 0x811c9dc5;
  for (let k = 0; k < src.length; k++) h = Math.imul(h ^ src.charCodeAt(k), 16777619);
  const annee = (v.stcw.dateDelivrance || v.traiteLe).slice(0, 4);
  const seq = v.numero.split("-").pop() ?? String(v.id);
  return `GAB-DGMM-${annee}-MED-${seq}-${(h >>> 0).toString(36).toUpperCase().padStart(4, "0").slice(-4)}`;
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
  const livret = genLivret(id);
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
  e: Omit<Embarquement, "id" | "saisiLe" | "saisiPar" | "statut"> & {
    statut?: Embarquement["statut"];
  },
  auteur: string,
) {
  const s = get();
  const m = s.marins.find((x) => x.id === marinId);
  if (!m) return;
  const id = Math.max(0, ...s.marins.flatMap((x) => (x.embarquements ?? []).map((y) => y.id))) + 1;
  const emb: Embarquement = {
    ...e,
    statut: e.statut ?? "valide_dgmm",
    id,
    saisiPar: auteur,
    saisiLe: nowIso(),
  };
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
  void marinId;
  void embId;
  void debarquement;
  void auteur;
  throw new Error(
    "Un débarquement doit être déclaré par l'armateur puis visé par la DGMM via le lot d'équipage.",
  );
}

export function joursEmbarquement(e: Embarquement, now = new Date()): number {
  const fin = e.debarquement ? new Date(e.debarquement) : now;
  if (!Number.isFinite(fin.getTime())) return 0;
  const dateLocale = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const debutJour = Date.parse(`${e.embarquement.slice(0, 10)}T00:00:00Z`);
  const finJour = Date.parse(`${(e.debarquement || dateLocale(fin)).slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(debutJour) || !Number.isFinite(finJour)) return 0;
  return Math.max(0, Math.floor((finJour - debutJour) / DAY) + 1);
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
  let nextEmbId =
    Math.max(0, ...s.marins.flatMap((m) => (m.embarquements ?? []).map((e) => e.id))) + 1;
  const navire = TOUS_NAVIRES.find((n) => n.nom === saved.navire);
  const marins = s.marins.map((m) => {
    const membre = saved.membres.find((x) => x.marinId === m.id);
    if (!membre || (m.embarquements ?? []).some((e) => e.roleId === saved.id)) return m;
    const embarquement: Embarquement = {
      id: nextEmbId++,
      roleId: saved.id,
      navire: saved.navire,
      imo: saved.navireImo ?? navire?.imo ?? "",
      typeNavire: saved.typeNavire ?? navire?.type ?? "",
      jauge: saved.jauge ?? navire?.jauge ?? 0,
      armateur: saved.armateur,
      fonction: membre.fonction,
      embarquement: saved.appareillage,
      debarquement: "",
      saisiPar: acteur,
      saisiLe: nowIso(),
      statut: "valide_dgmm",
    };
    return withEvent(
      { ...m, embarquements: [...(m.embarquements ?? []), embarquement], modifieLe: nowIso() },
      `Embarquement déclaré sur ${saved.navire} au rôle ${saved.id}`,
      acteur,
      "modification",
    );
  });
  set(
    { ...s, roles, marins },
    {
      acteur,
      action: `Déclaration du rôle d'équipage — ${saved.navire} (${saved.membres.length} marins)`,
      cible: saved.armateur,
    },
  );
  return saved;
}

export interface SelectionDebarquement {
  marinId: number;
  embId: number;
  dateDebarquement: string;
  justificatif: string;
}

export function soumettreDebarquementLot(
  armateur: string,
  roleId: number,
  selections: SelectionDebarquement[],
  auteur: string,
  justificatifRole?: string,
): void {
  const s = get();
  const role = s.roles.find((x) => x.id === roleId && x.armateur === armateur);
  if (!role) throw new Error("Rôle d'équipage introuvable pour cet armateur.");
  if (!selections.length) throw new Error("Sélectionnez au moins un marin à débarquer.");
  const vus = new Set<string>();
  const lignes = selections.map((selection) => {
    const cle = `${selection.marinId}:${selection.embId}`;
    if (vus.has(cle)) throw new Error("Un marin figure plusieurs fois dans le lot.");
    vus.add(cle);
    const marin = s.marins.find((m) => m.id === selection.marinId);
    const embarquement = marin?.embarquements?.find((e) => e.id === selection.embId);
    if (
      !marin ||
      marin.entreprise !== armateur ||
      !role.membres.some((x) => x.marinId === marin.id)
    )
      throw new Error("Un marin sélectionné ne relève pas de ce rôle ou de cet armateur.");
    if (
      !embarquement ||
      embarquement.roleId !== roleId ||
      (embarquement.statut !== "valide_dgmm" && embarquement.statut !== "rejete")
    )
      throw new Error(`L'embarquement de ${fullName(marin)} n'est pas disponible pour ce lot.`);
    if (!selection.dateDebarquement || selection.dateDebarquement < embarquement.embarquement)
      throw new Error(`La date de débarquement de ${fullName(marin)} est invalide.`);
    if (!selection.justificatif)
      throw new Error(`Joignez le justificatif du tampon pour ${fullName(marin)}.`);
    return { marin, embarquement, selection };
  });
  const now = nowIso();
  const ids = new Set(lignes.map(({ marin }) => marin.id));
  const marins = s.marins.map((m) => {
    if (!ids.has(m.id)) return m;
    const selectionsParId = new Map(
      lignes
        .filter((ligne) => ligne.marin.id === m.id)
        .map(({ embarquement, selection }) => [embarquement.id, selection]),
    );
    return withEvent(
      {
        ...m,
        embarquements: (m.embarquements ?? []).map((emb) => {
          const selection = selectionsParId.get(emb.id);
          if (!selection) return emb;
          return {
            ...emb,
            debarquement: selection.dateDebarquement,
            justificatifTampon: selection.justificatif,
            statut: "en_attente_validation" as const,
            motifRejet: undefined,
            validePar: undefined,
            valideLe: undefined,
            stationValidation: undefined,
          };
        }),
        modifieLe: now,
      },
      `Débarquement transmis à la DGMM — rôle ${roleId}`,
      auteur,
      "modification",
    );
  });
  const roles = s.roles.map((r) =>
    r.id === roleId
      ? {
          ...r,
          justificatifDebarquement: justificatifRole ?? r.justificatifDebarquement,
          roleDebarquementSoumisLe: now,
          roleDebarquementSoumisPar: auteur,
          modifieLe: now,
        }
      : r,
  );
  set(
    { ...s, marins, roles },
    {
      acteur: auteur,
      action: `Débarquement groupé transmis — rôle ${roleId}, ${lignes.length} marin(s)`,
      cible: `${armateur} — ${role.navire}`,
    },
  );
}

export function validerRoleEquipageDgmm(roleId: number, station: string, agent: string): number {
  const s = get();
  const role = s.roles.find((r) => r.id === roleId);
  if (!role) throw new Error("Rôle d'équipage introuvable.");
  if (!station.trim()) throw new Error("Sélectionnez une station de validation.");
  const pending = s.marins.flatMap((marin) =>
    (marin.embarquements ?? [])
      .filter((emb) => emb.roleId === roleId && emb.statut === "en_attente_validation")
      .map((emb) => ({ marin, emb })),
  );
  if (!pending.length) throw new Error("Aucun débarquement en attente pour ce rôle.");
  if (!role.justificatifDebarquement)
    throw new Error("Le rôle de désarmement global doit être joint au dossier.");
  if (pending.some(({ emb }) => !emb.debarquement || !emb.justificatifTampon))
    throw new Error("Chaque débarquement doit comporter une date et le justificatif du tampon.");
  const now = nowIso();
  const joursCredites = pending.reduce((total, { emb }) => total + joursEmbarquement(emb), 0);
  const cles = new Set(pending.map(({ marin, emb }) => `${marin.id}:${emb.id}`));
  const marins = s.marins.map((m) => {
    const lignes = pending.filter((x) => x.marin.id === m.id);
    if (!lignes.length) return m;
    return withEvent(
      {
        ...m,
        embarquements: (m.embarquements ?? []).map((emb) =>
          cles.has(`${m.id}:${emb.id}`)
            ? {
                ...emb,
                statut: "valide_dgmm" as const,
                validePar: agent,
                valideLe: now,
                stationValidation: station,
              }
            : emb,
        ),
        modifieLe: now,
      },
      `Débarquement visé par la DGMM — ${station}; ${lignes.reduce((sum, x) => sum + joursEmbarquement(x.emb), 0)} jour(s) crédité(s)`,
      agent,
      "admin",
    );
  });
  set(
    { ...s, marins },
    {
      acteur: agent,
      action: `Visa DGMM du rôle ${roleId} — ${pending.length} marin(s), ${joursCredites} jour(s) crédités à ${station}`,
      cible: `${role.armateur} — ${role.navire}`,
    },
  );
  return joursCredites;
}

export function rejeterEmbarquementDgmm(
  marinId: number,
  embId: number,
  motif: string,
  agent: string,
): void {
  const s = get();
  const marin = s.marins.find((m) => m.id === marinId);
  const embarquement = marin?.embarquements?.find((e) => e.id === embId);
  if (!marin || !embarquement || embarquement.statut !== "en_attente_validation")
    throw new Error("Débarquement introuvable ou déjà traité.");
  if (!motif.trim()) throw new Error("Indiquez le motif du rejet.");
  const now = nowIso();
  const action = `Débarquement rejeté par la DGMM — ${motif.trim()}`;
  set(
    {
      ...s,
      marins: s.marins.map((m) =>
        m.id === marinId
          ? withEvent(
              {
                ...m,
                embarquements: (m.embarquements ?? []).map((emb) =>
                  emb.id === embId
                    ? { ...emb, statut: "rejete" as const, motifRejet: motif.trim() }
                    : emb,
                ),
                modifieLe: now,
              },
              action,
              agent,
              "admin",
            )
          : m,
      ),
    },
    { acteur: agent, action, cible: cible(marin) },
  );
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

export function resetDemo(auteur = "Administrateur système") {
  set(seed(), {
    acteur: auteur,
    action: "Réinitialisation des données de démonstration",
    cible: "Système",
  });
}

/** Clé de stockage des données (version du schéma). */
export const CLE_DONNEES = KEY;

/** Sauvegarde complète (JSON) : marins, visites, rôles d'équipage, journal d'audit. */
export function exporterDonnees(): string {
  const s = get();
  return JSON.stringify({ format: "dgmm-gdm", version: KEY, exporteLe: nowIso(), ...s }, null, 2);
}

/** Restaure une sauvegarde après contrôle de sa forme. Renvoie un message d'erreur, ou null. */
export function importerDonnees(json: string, auteur: string): string | null {
  let d: Partial<State> & { format?: string };
  try {
    d = JSON.parse(json) as Partial<State> & { format?: string };
  } catch {
    return "Le fichier n'est pas un JSON valide.";
  }
  if (d.format !== "dgmm-gdm") return "Ce fichier n'est pas une sauvegarde du portail DGMM.";
  if (!Array.isArray(d.marins) || !Array.isArray(d.visites) || !Array.isArray(d.audit))
    return "Sauvegarde incomplète : marins, visites ou journal d'audit manquants.";
  set(
    {
      marins: d.marins.map((marin) => ({
        ...marin,
        embarquements: (marin.embarquements ?? []).map((emb) => ({
          ...emb,
          statut: emb.statut ?? "valide_dgmm",
        })),
      })),
      visites: d.visites,
      roles: Array.isArray(d.roles) ? d.roles : [],
      audit: d.audit,
    },
    {
      acteur: auteur,
      action: `Restauration d'une sauvegarde (${d.marins.length} marins)`,
      cible: "Système",
    },
  );
  return null;
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
  return (
    REQUIRED_LIVRET.some((k) => !m[k]) || !m.documents.photo || !m.documents.piece || !m.signature
  );
}
export function manquants(m: Marin): string[] {
  const labels: Partial<Record<keyof Marin, string>> = {
    dateNaissance: "Date de naissance",
    taille: "Taille",
    couleurYeux: "Couleur des yeux",
    couleurCheveux: "Couleur des cheveux",
    quartierInscription: "Quartier d'inscription",
    signeParticulier: "Signes particuliers",
  };
  const out = REQUIRED_LIVRET.filter((k) => !m[k]).map((k) => labels[k]!);
  if (!m.documents.photo) out.push("Photo d'identité");
  if (!m.documents.piece) out.push("Pièce d'identité");
  if (!m.signature) out.push("Signature du titulaire");
  return out;
}

/** Pièces exigées par l'agent DGMM pour apposer le visa administratif. */
export const PIECES_VISA: DocKey[] = ["photo", "piece", "naissance", "casier", "stcw"];

/**
 * Circuit DGMM : la visite médicale d'aptitude précède le dépôt des pièces.
 * Renvoie ce qui bloque le visa administratif, ou null.
 */
export function motifVisa(m: Marin, visites: Visite[], now = new Date()): string | null {
  const st = marinCertStatus(visites, m.id, now);
  if (st !== "valide" && st !== "expire_bientot")
    return "Certificat d'aptitude du Médecin des Gens de Mer requis (visite médicale préalable).";
  const manque = PIECES_VISA.filter((k) => !m.documents[k]).map((k) => DOC_LABELS[k]);
  if (manque.length) return `Pièces manquantes : ${manque.join(", ")}.`;
  const originauxNonVerifies = (m.piecesEnLigne ?? []).filter(
    (piece) => !m.verificationPieces?.[piece]?.conforme,
  );
  if (originauxNonVerifies.length)
    return `Originaux papier à vérifier : ${originauxNonVerifies.map((piece) => DOC_LABELS[piece]).join(", ")}.`;
  return null;
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

/** Motif bloquant la délivrance du livret (règle DGMM + certificat en cours + dossier complet), ou null. */
export function motifLivret(m: Marin, visites: Visite[], now = new Date()): string | null {
  const base = canIssueLivret(m);
  if (!base.canIssue) return base.motif ?? "Conditions non remplies.";
  const st = marinCertStatus(visites, m.id, now);
  if (st !== "valide" && st !== "expire_bientot") return "Certificat médical STCW valide requis.";
  if (dossierIncomplet(m)) return `Dossier incomplet : ${manquants(m).join(", ")}.`;
  return null;
}
