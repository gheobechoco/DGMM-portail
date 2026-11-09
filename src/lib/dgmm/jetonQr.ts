// Jetons des QR codes : le lien ouvre la bonne page ET transporte l'essentiel du document,
// scellé par une empreinte. Ainsi, scanné depuis n'importe quel téléphone (même sans les
// données du poste qui a émis le document), le QR affiche le document approprié.
import { empreinte } from "@/lib/dgmm/store";

const SEL = "DGMM-GDM|jeton|v1";

/** Certificat médical d'aptitude. */
export interface JetonCertificat {
  t: "c";
  num: string; // numéro du certificat
  nom: string;
  nip: string;
  fct?: string | undefined; // fonction
  nee?: string | undefined; // date de naissance
  nat?: string | undefined; // nationalité
  v: string; // verdict
  del: string; // date de délivrance
  fin: string; // fin de validité
  res?: string | undefined; // restrictions
  med: string; // médecin signataire
  visa?: string | undefined; // visa DGMM (auteur · date)
  rev?: 1 | undefined; // révoqué
}

/** Livret maritime (fascicule). */
export interface JetonLivret {
  t: "l";
  nip: string;
  nom: string;
  nat?: string | undefined;
  fct?: string | undefined;
  liv: string;
  fin?: string | undefined; // fin du certificat médical
  ok?: 1 | undefined; // visa accordé
  mer?: number | undefined; // jours de service en mer validés
}

/** Récépissé de pré-inscription. */
export interface JetonRecepisse {
  t: "p";
  num: string;
  nom: string;
  fct?: string | undefined;
  nee?: string | undefined;
  st: string; // code de la station
  le: string; // date de dépôt
  rdv?: string | undefined;
}

export type Jeton = JetonCertificat | JetonLivret | JetonRecepisse;

function b64urlEncode(txt: string): string {
  const bytes = new TextEncoder().encode(txt);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(pad);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** Retire les champs vides pour garder un QR lisible. */
function compact<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== "" && v !== null)) as T;
}

/** Encode un jeton : « données.sceau ». */
export function encoderJeton(j: Jeton): string {
  const json = JSON.stringify(compact(j));
  return `${b64urlEncode(json)}.${empreinte(`${SEL}|${json}`).slice(0, 12)}`;
}

/** Décode un jeton ; « intact » est faux si le contenu a été modifié après émission. */
export function decoderJeton(s: string | undefined | null): { jeton: Jeton; intact: boolean } | null {
  if (!s) return null;
  const [corps, sceau] = s.split(".");
  if (!corps) return null;
  try {
    const json = b64urlDecode(corps);
    const jeton = JSON.parse(json) as Jeton;
    if (!jeton || typeof jeton !== "object" || !("t" in jeton)) return null;
    return { jeton, intact: !!sceau && empreinte(`${SEL}|${json}`).slice(0, 12) === sceau };
  } catch {
    return null;
  }
}

const origine = () => (typeof window !== "undefined" ? window.location.origin : "");

export const lienCertificat = (code: string, j: JetonCertificat) =>
  `${origine()}/verifier/certificat/${encodeURIComponent(code)}?source=qr&d=${encoderJeton(j)}`;

export const lienLivret = (j: JetonLivret) =>
  `${origine()}/verifier/${encodeURIComponent(j.nip)}?source=qr&d=${encoderJeton(j)}`;

export const lienRecepisse = (j: JetonRecepisse) =>
  `${origine()}/suivi-demande?numero=${encodeURIComponent(j.num)}&d=${encoderJeton(j)}`;

/**
 * Interprète ce qu'un scanner a lu : lien complet du portail, ancien format « DGMM-PRE:… »
 * ou numéro saisi à la main. Renvoie le type et l'identifiant utiles.
 */
export function lireCodeScanne(brut: string): { type: "recepisse" | "certificat" | "livret" | "inconnu"; id: string; d?: string | undefined } {
  const v = brut.trim();
  if (/^DGMM-PRE:/i.test(v)) return { type: "recepisse", id: v.replace(/^DGMM-PRE:/i, "").toUpperCase() };
  try {
    const u = new URL(v);
    const d = u.searchParams.get("d") ?? undefined;
    if (u.pathname.startsWith("/suivi-demande")) return { type: "recepisse", id: (u.searchParams.get("numero") ?? "").toUpperCase(), d };
    const m = u.pathname.match(/\/verifier\/(certificat\/)?([^/?#]+)/);
    if (m) return { type: m[1] ? "certificat" : "livret", id: decodeURIComponent(m[2]!), d };
  } catch {
    /* pas un lien */
  }
  const id = v.toUpperCase();
  if (/^PRE-/.test(id)) return { type: "recepisse", id };
  if (/^GAB-DGMM-/.test(id)) return { type: "certificat", id };
  return { type: id ? "livret" : "inconnu", id };
}
