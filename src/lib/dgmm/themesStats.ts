import { can, profil, type Permission, type Role } from "@/lib/dgmm/rules";

/** Thèmes de la section « Statistiques » (barre latérale et page /espace/statistiques). */
export type ThemeStats =
  | "pilotage" | "medical" | "equipages" | "preinscriptions" | "livrets" | "audit"
  | "navires" | "contrats" | "alertes" | "medecins" | "systeme";

export const THEMES_STATS: { id: ThemeStats; label: string; perm: Permission; pilotageSeulement?: boolean }[] = [
  { id: "pilotage", label: "Pilotage et conformité", perm: "dashboard", pilotageSeulement: true },
  { id: "medical", label: "Activité médicale", perm: "visites" },
  { id: "preinscriptions", label: "Pré-inscriptions", perm: "marins.enroler" },
  { id: "livrets", label: "Fascicules / livrets", perm: "livrets.delivrer" },
  { id: "equipages", label: "Rôles d'équipage", perm: "roles.lecture" },
  { id: "navires", label: "Navires et certificats", perm: "navires" },
  { id: "contrats", label: "Contrats (CEM)", perm: "contrats" },
  { id: "alertes", label: "Alertes des marins", perm: "alertes" },
  { id: "medecins", label: "Médecins agréés", perm: "medecins" },
  { id: "audit", label: "Journal d'audit", perm: "audit" },
  { id: "systeme", label: "Système", perm: "systeme" },
];

export const themesPour = (role: Role) =>
  THEMES_STATS.filter((t) => can(role, t.perm) && (!t.pilotageSeulement || profil(role) === "pilotage"));
