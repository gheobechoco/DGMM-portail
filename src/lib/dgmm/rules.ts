// Règles métier pures (testées dans src/test/dgmm-rules.test.ts).

export type Role = "gestionnaire_mm" | "rh_marine" | "medecin" | "gestionnaire_medical";

export type Permission =
  | "dashboard"
  | "marins"
  | "marins.creer"
  | "marins.valider_admin"
  | "marins.livret"
  | "visites"
  | "visites.saisir"
  | "visites.signer"
  | "certificats.imprimer"
  | "audit"
  | "embarquements";

/**
 * Matrice des droits (RBAC) :
 * - Gestionnaire MM : pilotage complet, fiches en écriture, enrôlement, validation administrative,
 *   délivrance du livret, impression des certificats.
 * - RH Marine : pilotage restreint RH, fiches en écriture, enrôlement, validation administrative.
 * - Médecin du travail : tableau de bord santé, fiches en lecture seule, saisie et signature des visites,
 *   impression des certificats.
 * - Gestionnaire médical : tableau de bord santé, fiches en lecture seule, saisie des visites (sans signature),
 *   impression des certificats.
 */
const PERMISSIONS: Record<Role, Permission[]> = {
  gestionnaire_mm: [
    "dashboard",
    "marins",
    "marins.creer",
    "marins.valider_admin",
    "marins.livret",
    "visites",
    "certificats.imprimer",
    "audit",
    "embarquements",
  ],
  rh_marine: ["dashboard", "marins", "marins.creer", "marins.valider_admin", "embarquements"],
  medecin: [
    "dashboard",
    "marins",
    "visites",
    "visites.saisir",
    "visites.signer",
    "certificats.imprimer",
  ],
  gestionnaire_medical: [
    "dashboard",
    "marins",
    "visites",
    "visites.saisir",
    "certificats.imprimer",
  ],
};

/** Profil de tableau de bord : pilotage administratif ou santé. */
export function profil(role: Role): "pilotage" | "medical" {
  return role === "medecin" || role === "gestionnaire_medical" ? "medical" : "pilotage";
}

export function can(role: Role | undefined, perm: Permission): boolean {
  if (!role) return false;
  return PERMISSIONS[role].includes(perm);
}

export const DAY = 24 * 60 * 60 * 1000;

export type CertStatus = "valide" | "expire_bientot" | "expire" | "aucun";

/** Un certificat est « à renouveler » s'il expire dans 30 jours ou moins. */
export function certificateStatus(
  validUntil: string | undefined | null,
  now: Date = new Date(),
): CertStatus {
  if (!validUntil) return "aucun";
  const end = new Date(validUntil + "T23:59:59").getTime();
  const diff = end - now.getTime();
  if (diff < 0) return "expire";
  if (diff <= 30 * DAY) return "expire_bientot";
  return "valide";
}

/** Une inscription est « en souffrance » après plus de 7 jours d'attente. */
export function isOverdueRegistration(createdAt: string, now: Date = new Date()): boolean {
  return now.getTime() - new Date(createdAt).getTime() > 7 * DAY;
}

export function ageFrom(dateNaissance: string | undefined, now: Date = new Date()): number | null {
  if (!dateNaissance) return null;
  const d = new Date(dateNaissance);
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export function ageBracket(age: number | null): string {
  if (age === null) return "Non renseigné";
  if (age < 25) return "Moins de 25 ans";
  if (age < 35) return "25 à 34 ans";
  if (age < 45) return "35 à 44 ans";
  if (age < 55) return "45 à 54 ans";
  return "55 ans et plus";
}
