import { useSyncExternalStore } from "react";
import { TOUS_NAVIRES } from "@/lib/dgmm/maritime";
import { empreinte, journaliser } from "@/lib/dgmm/store";
import type { DemandeArmateur } from "@/lib/dgmm/inscriptions";
import { nomNormalise } from "@/lib/dgmm/registre";

/**
 * Sécurité des navires : inspection à bord, certificats et double verrouillage.
 *
 * 1. L'inspecteur de la sécurité des navires contrôle à bord, fait co-signer son rapport par
 *    le commandant, saisit chaque certificat (scan, durée accordée, date d'effet) puis scelle :
 *    le navire passe « En attente de visa RH ».
 * 2. Le responsable RH de la DGMM vise (ou refuse, motif à l'appui) : le navire passe au vert,
 *    appareillage autorisé, jusqu'à l'échéance du certificat le plus court.
 *
 * Les durées proposées sont réglementaires ou d'usage et restent à valider par la DGMM.
 */

export type GroupeCertificat = "technique" | "sanitaire";
export type NatureCertificat = "periodique" | "escale" | "registre";

export interface DefCertificat {
  id: string;
  titre: string;
  groupe: GroupeCertificat;
  nature: NatureCertificat;
  detail: string;
  /** Durées proposées à l'appréciation de l'inspecteur (mois) ; la dernière est le maximum. */
  durees?: number[];
  variantes?: string[];
}

export const CERTIFICATS_NAVIRE: DefCertificat[] = [
  { id: "navigabilite", titre: "Certificat de navigabilité", groupe: "technique", nature: "periodique", detail: "Solidité de la coque, stabilité, machines de propulsion.", durees: [3, 6, 12] },
  { id: "franc_bord", titre: "Certificat de franc-bord", groupe: "technique", nature: "periodique", detail: "Limite maximale de chargement.", durees: [3, 6, 12] },
  { id: "armement", titre: "Sécurité du matériel d'armement", groupe: "technique", nature: "periodique", detail: "Embarcations et radeaux, gilets, fusées, extincteurs.", durees: [3, 6, 12] },
  { id: "radio", titre: "Sécurité radio (SMDSM)", groupe: "technique", nature: "periodique", detail: "Radios, balises de détresse satellitaires, radars.", durees: [3, 6, 12] },
  { id: "sanitaire", titre: "Contrôle sanitaire du navire", groupe: "sanitaire", nature: "periodique", detail: "Exemption (SSCEC) si l'hygiène est parfaite, ou contrôle (SSCC) après désinfection.", durees: [6], variantes: ["Exemption de contrôle (SSCEC)", "Contrôle sanitaire (SSCC)"] },
  { id: "pharmacie", titre: "Pharmacie de bord (Medical Chest)", groupe: "sanitaire", nature: "periodique", detail: "Dotation médicale conforme à l'effectif, aucun médicament périmé.", durees: [12] },
  { id: "eau", titre: "Analyse de l'eau potable", groupe: "sanitaire", nature: "periodique", detail: "Rapport de laboratoire : absence de bactéries dans les caisses d'eau douce.", durees: [3] },
  { id: "mlc3", titre: "Alimentation et logement (MLC, titre 3)", groupe: "sanitaire", nature: "periodique", detail: "Cuisines, cambuse et chambres froides, salubrité des cabines.", durees: [6, 12] },
  { id: "dms", titre: "Déclaration maritime de santé", groupe: "sanitaire", nature: "escale", detail: "Signée par le commandant à chaque escale : aucune maladie contagieuse ou suspecte à bord." },
  { id: "dechets", titre: "Registre des ordures (Garbage Record Book)", groupe: "sanitaire", nature: "registre", detail: "Élimination des déchets tracée ; vérifié à chaque inspection." },
];

export interface SaisieCertificat {
  conforme: boolean;
  scan?: string | undefined;
  dureeMois?: number | undefined;
  effet?: string | undefined;
  echeance?: string | undefined;
  variante?: string | undefined;
  observation?: string | undefined;
}

export type StatutInspection = "en_attente_visa" | "vise" | "visa_refuse";

export interface Inspection {
  id: number;
  numero: string;
  navireId: string;
  navire: string;
  imo: string;
  armateur: string;
  date: string;
  port: string;
  inspecteur: string;
  commandant: string;
  rapport: string;
  certificats: Record<string, SaisieCertificat>;
  statut: StatutInspection;
  scelleLe: string;
  /** Empreinte du contenu au scellement : toute modification ultérieure se voit. */
  sceau: string;
  viseLe?: string | undefined;
  visePar?: string | undefined;
  motifRefus?: string | undefined;
}

export interface FicheNavire {
  id: string;
  nom: string;
  imo: string;
  armateur: string;
  type: string;
  jauge: number;
  portAttache?: string | undefined;
  indicatif?: string | undefined;
  classe?: string | undefined;
}

/* ---------- Registre ---------- */

export const idNavire = (imo: string, nom: string) => (imo ? `IMO${imo.replace(/\D/g, "")}` : nomNormalise(nom));

/** Navires sous pavillon gabonais : référentiel + flottes des armateurs dont le compte est ouvert. */
export function registreNavires(demandes: DemandeArmateur[]): FicheNavire[] {
  const out = new Map<string, FicheNavire>();
  TOUS_NAVIRES.forEach((n) => out.set(idNavire(n.imo, n.nom), { id: idNavire(n.imo, n.nom), nom: n.nom, imo: n.imo, armateur: n.armateur, type: n.type, jauge: n.jauge }));
  demandes
    .filter((d) => d.statut === "validee")
    .forEach((d) => {
      const flotte = d.flotte?.filter((n) => n.nomStatut === "approuve");
      if (flotte?.length)
        flotte.forEach((n) => {
          const imo = n.imo.replace("IMO", "");
          out.set(idNavire(imo, n.nom), { id: idNavire(imo, n.nom), nom: n.nom, imo, armateur: d.raisonSociale, type: d.segment, jauge: n.jauge, portAttache: n.portAttache, indicatif: n.indicatif || undefined, classe: n.classe });
        });
      else d.navires.forEach((n) => out.set(idNavire(n.imo, n.nom), { id: idNavire(n.imo, n.nom), nom: n.nom, imo: n.imo, armateur: d.raisonSociale, type: n.type, jauge: n.jauge }));
    });
  return [...out.values()].sort((a, b) => a.armateur.localeCompare(b.armateur) || a.nom.localeCompare(b.nom));
}

/* ---------- Règles ---------- */

export function ajouterMois(dateIso: string, mois: number): string {
  const d = new Date(dateIso + "T12:00:00");
  d.setMonth(d.getMonth() + mois);
  return d.toISOString().slice(0, 10);
}

/** Ce qui manque pour pouvoir sceller : chaque certificat contrôlé, conforme et complet. */
export function manquesScellement(i: Pick<Inspection, "port" | "commandant" | "rapport" | "certificats">): string[] {
  const m: string[] = [];
  if (!i.port) m.push("Port de l'inspection");
  if (!i.commandant.trim()) m.push("Nom du commandant co-signataire");
  if (!i.rapport) m.push("Rapport d'inspection co-signé (scan)");
  for (const c of CERTIFICATS_NAVIRE) {
    const s = i.certificats[c.id];
    if (!s?.conforme) { m.push(`${c.titre} : non conforme ou non contrôlé`); continue; }
    if (c.nature === "registre") continue;
    if (!s.scan) m.push(`${c.titre} : scan manquant`);
    if (c.nature === "periodique") {
      if (!s.dureeMois || !s.effet) m.push(`${c.titre} : durée ou date d'effet manquante`);
      if (c.variantes && !s.variante) m.push(`${c.titre} : préciser exemption ou contrôle`);
    }
    if (c.nature === "escale" && !s.effet) m.push(`${c.titre} : date de la déclaration`);
  }
  return m;
}

/** Certificat le plus fragile : échéance la plus proche (c'est elle qui fixe la date de surveillance). */
export function echeanceCritique(i: Pick<Inspection, "certificats">): { id: string; titre: string; echeance: string } | null {
  let best: { id: string; titre: string; echeance: string } | null = null;
  for (const c of CERTIFICATS_NAVIRE) {
    const e = i.certificats[c.id]?.echeance;
    if (c.nature === "periodique" && e && (!best || e < best.echeance)) best = { id: c.id, titre: c.titre, echeance: e };
  }
  return best;
}

export type EtatNavire = "autorise" | "a_surveiller" | "expire" | "attente_visa" | "visa_refuse" | "non_inspecte";

export const ETAT_NAVIRE: Record<EtatNavire, { libelle: string; ton: string; point: string }> = {
  autorise: { libelle: "Conforme — appareillage autorisé", ton: "bg-success/12 text-success", point: "bg-success" },
  a_surveiller: { libelle: "Autorisé — certificat à renouveler", ton: "bg-warning/15 text-warning", point: "bg-warning" },
  expire: { libelle: "Certificat expiré — appareillage interdit", ton: "bg-destructive/12 text-destructive", point: "bg-destructive" },
  attente_visa: { libelle: "En attente de visa RH", ton: "bg-gold/20 text-primary", point: "bg-gold" },
  visa_refuse: { libelle: "Visa refusé — nouvelle inspection requise", ton: "bg-destructive/12 text-destructive", point: "bg-destructive" },
  non_inspecte: { libelle: "Aucune inspection enregistrée", ton: "bg-muted text-muted-foreground", point: "bg-muted-foreground" },
};

export const joursAvant = (dateIso: string, now = new Date()) => Math.ceil((new Date(dateIso + "T23:59:59").getTime() - now.getTime()) / 86_400_000);

/** État d'un navire d'après sa dernière inspection. */
export function etatNavire(inspections: Inspection[], navireId: string, now = new Date()): { etat: EtatNavire; derniere?: Inspection | undefined; critique?: ReturnType<typeof echeanceCritique> | undefined; jours?: number | undefined } {
  const derniere = inspections.filter((i) => i.navireId === navireId).sort((a, b) => b.scelleLe.localeCompare(a.scelleLe))[0];
  if (!derniere) return { etat: "non_inspecte" };
  if (derniere.statut === "en_attente_visa") return { etat: "attente_visa", derniere };
  if (derniere.statut === "visa_refuse") return { etat: "visa_refuse", derniere };
  const critique = echeanceCritique(derniere);
  if (!critique) return { etat: "autorise", derniere };
  const jours = joursAvant(critique.echeance, now);
  return { etat: jours < 0 ? "expire" : jours <= 30 ? "a_surveiller" : "autorise", derniere, critique, jours };
}

/** Un navire peut-il appareiller (rôle d'équipage) ? */
export const peutAppareiller = (e: EtatNavire) => e === "autorise" || e === "a_surveiller";

/* ---------- Stockage ---------- */

const KEY = "dgmm-navires-v1";
const VIDE: Inspection[] = [];
const listeners = new Set<() => void>();
let cache: Inspection[] | null = null;

const contenu = (i: Inspection) => JSON.stringify([i.navireId, i.date, i.port, i.inspecteur, i.commandant, i.rapport, i.certificats]);

/** Jeu de démonstration : la plupart des navires visés, un à surveiller, un en attente de visa, un jamais inspecté. */
function exemples(): Inspection[] {
  const ajd = new Date().toISOString().slice(0, 10);
  const moins = (j: number) => new Date(Date.now() - j * 86_400_000).toISOString().slice(0, 10);
  const certs = (effet: string, eauEffet = effet): Record<string, SaisieCertificat> =>
    Object.fromEntries(
      CERTIFICATS_NAVIRE.map((c) => {
        if (c.nature === "registre") return [c.id, { conforme: true, observation: "Registre à jour." }];
        if (c.nature === "escale") return [c.id, { conforme: true, scan: "dms.pdf", effet }];
        const duree = c.durees![c.durees!.length - 1]!;
        const e = c.id === "eau" ? eauEffet : effet;
        return [c.id, { conforme: true, scan: `${c.id}.pdf`, dureeMois: duree, effet: e, echeance: ajouterMois(e, duree), ...(c.variantes ? { variante: c.variantes[0] } : {}) }];
      }),
    );
  const navires = TOUS_NAVIRES.filter((n) => n.nom !== "FV Banio");
  return navires.map((n, k) => {
    const effet = moins(20 + k * 9);
    // Un navire voit son analyse d'eau expirer dans moins de 30 jours ; le dernier attend le visa.
    const i: Inspection = {
      id: k + 1, numero: `INS-${new Date().getFullYear()}-${String(k + 1).padStart(4, "0")}`, navireId: idNavire(n.imo, n.nom), navire: n.nom, imo: n.imo, armateur: n.armateur,
      date: effet, port: k % 2 ? "Port-Gentil" : "Owendo", inspecteur: "NZE OBIANG Hervé", commandant: "Commandant de bord", rapport: "rapport-cosigne.pdf",
      certificats: certs(effet, k === 1 ? moins(70) : moins(4 + k)), statut: k === navires.length - 1 ? "en_attente_visa" : "vise",
      scelleLe: effet + "T15:00:00.000Z", sceau: "", ...(k === navires.length - 1 ? {} : { viseLe: effet + "T17:00:00.000Z", visePar: "Agent DGMM — RH Marine" }),
    };
    if (k === navires.length - 1) { i.date = ajd; i.scelleLe = new Date().toISOString(); }
    i.sceau = empreinte(contenu(i));
    return i;
  });
}

function lire(): Inspection[] {
  if (typeof window === "undefined") return VIDE;
  if (!cache) {
    try {
      const brut = window.localStorage.getItem(KEY);
      cache = brut ? (JSON.parse(brut) as Inspection[]) : exemples();
    } catch {
      cache = [];
    }
  }
  return cache;
}
function ecrire(l: Inspection[]): string | null {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(l));
  } catch {
    return "Espace de stockage plein : impossible d'enregistrer l'inspection.";
  }
  cache = l;
  listeners.forEach((f) => f());
  return null;
}

export function useInspections(): Inspection[] {
  return useSyncExternalStore((f) => { listeners.add(f); return () => listeners.delete(f); }, lire, () => VIDE);
}
export const getInspections = () => lire();

export const sceauIntact = (i: Inspection) => empreinte(contenu(i)) === i.sceau;

export type NouvelleInspection = Pick<Inspection, "navireId" | "navire" | "imo" | "armateur" | "date" | "port" | "inspecteur" | "commandant" | "rapport" | "certificats">;

/** Scellement par l'inspecteur : le dossier part au visa du RH. */
export function scellerInspection(d: NouvelleInspection): Inspection | string {
  const manques = manquesScellement(d);
  if (manques.length) return `Inspection incomplète : ${manques[0]}`;
  const l = lire();
  const id = Math.max(0, ...l.map((x) => x.id)) + 1;
  const certificats = Object.fromEntries(
    Object.entries(d.certificats).map(([k, s]) => [k, s.dureeMois && s.effet ? { ...s, echeance: ajouterMois(s.effet, s.dureeMois) } : s]),
  );
  const i: Inspection = { ...d, certificats, id, numero: `INS-${new Date().getFullYear()}-${String(id).padStart(4, "0")}`, statut: "en_attente_visa", scelleLe: new Date().toISOString(), sceau: "" };
  i.sceau = empreinte(contenu(i));
  const err = ecrire([i, ...l]);
  if (err) return err;
  journaliser(d.inspecteur, `Inspection ${i.numero} scellée (${d.port}) : transmise au visa RH`, `${d.navire}${d.imo ? ` (OMI ${d.imo})` : ""}`);
  return i;
}

/** Visa du RH : le navire passe au vert (ou refus motivé). */
export function viserInspection(id: number, par: string, decision: "vise" | "visa_refuse", motif?: string) {
  const l = lire();
  const i = l.find((x) => x.id === id);
  if (!i || i.statut !== "en_attente_visa") return;
  if (decision === "vise" && !sceauIntact(i)) return;
  ecrire(l.map((x) => (x.id === id ? { ...x, statut: decision, viseLe: new Date().toISOString(), visePar: par, motifRefus: decision === "visa_refuse" ? motif : undefined } : x)));
  journaliser(par, decision === "vise" ? `Visa RH de l'inspection ${i.numero} : appareillage autorisé` : `Visa RH refusé pour l'inspection ${i.numero} : ${motif ?? ""}`, `${i.navire}${i.imo ? ` (OMI ${i.imo})` : ""}`);
}
