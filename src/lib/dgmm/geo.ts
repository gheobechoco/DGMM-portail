/**
 * Référentiel géographique du portail : stations maritimes, entreprises maritimes et
 * quartiers de résidence.
 *
 * Les coordonnées sont des positions approximatives (centre du quartier, du port ou de
 * l'immeuble indiqué) : elles servent à situer les lieux sur la carte et à préparer un
 * itinéraire. Pour un guidage précis, le lien Google Maps reprend l'adresse et le point.
 */

export interface Lieu {
  nom: string;
  lat: number;
  lng: number;
  adresse: string;
  tel?: string | undefined;
  reperes?: string | undefined;
}

export interface EntrepriseMaritime extends Lieu {
  role: string;
  /** Codes des stations maritimes de rattachement (formalités d'escale, de douane, de sécurité). */
  stations: string[];
  hub: "Libreville / Owendo" | "Port-Gentil" | "Mayumba";
}

/** Position des stations maritimes (codes de maritime.ts). */
export const POSITION_STATION: Record<string, { lat: number; lng: number; adresse: string }> = {
  "ST-LBV": { lat: 0.3927, lng: 9.4436, adresse: "Port-Môle, boulevard Triomphal, Libreville" },
  "ST-OWE": { lat: 0.2915, lng: 9.4985, adresse: "Zone portuaire d'Owendo" },
  "ST-POG": { lat: -0.7166, lng: 8.7787, adresse: "Port Môle de Port-Gentil" },
  "ST-KAN": { lat: 0.1717, lng: 10.1167, adresse: "Débarcadère de Kango, rive du Komo" },
  "ST-LAM": { lat: -0.7001, lng: 10.2406, adresse: "Débarcadère de Lambaréné, Ogooué" },
  "ST-COC": { lat: 0.9995, lng: 9.5831, adresse: "Port de Cocobeach" },
  "ST-MAY": { lat: -3.4325, lng: 10.6549, adresse: "Port de Mayumba" },
  "ST-OMB": { lat: -1.5741, lng: 9.2611, adresse: "Débarcadère d'Omboué, lagune Fernan-Vaz" },
  "ST-GAM": { lat: -2.6514, lng: 10.0006, adresse: "Terminal de Gamba" },
};

/** Entreprises maritimes et représentants d'armateurs (adresses communiquées par la DGMM). */
export const ENTREPRISES_MARITIMES: EntrepriseMaritime[] = [
  { nom: "CMA CGM Gabon", role: "Armateur mondial (conteneurs et logistique)", hub: "Libreville / Owendo", stations: ["ST-OWE", "ST-LBV", "ST-POG"], adresse: "Immeuble Owendo Business Center, 5ᵉ étage, Carrefour SNI, Owendo", tel: "+241 11 79 18 25", reperes: "Au grand carrefour de la SNI à Owendo, bâtiment très visible.", lat: 0.3008, lng: 9.5034 },
  { nom: "Maersk Gabon", role: "Armateur mondial (transport de conteneurs)", hub: "Libreville / Owendo", stations: ["ST-OWE", "ST-LBV", "ST-POG"], adresse: "Immeuble Owendo Business Center, bâtiment B, 3ᵉ étage, Carrefour SNI, Owendo", tel: "+241 11 70 31 36", reperes: "Même complexe que CMA CGM, au Carrefour SNI.", lat: 0.3004, lng: 9.5039 },
  { nom: "MSC Gabon", role: "Armateur mondial (fret maritime)", hub: "Libreville / Owendo", stations: ["ST-OWE", "ST-LBV"], adresse: "Immeuble Owendo Business Center, bâtiment A, 2ᵉ étage, Carrefour SNI, Owendo", tel: "+241 01 70 51 35", reperes: "Dans le complexe centralisé des consignataires, Carrefour SNI.", lat: 0.3011, lng: 9.5029 },
  { nom: "SOTRASMAR", role: "Transport maritime, pilotage et logistique", hub: "Libreville / Owendo", stations: ["ST-POG", "ST-OWE", "ST-LBV"], adresse: "Immeuble Owendo Business Center, zone B, 4ᵉ étage, Owendo", tel: "+241 11 70 13 89", reperes: "Hub d'affaires de l'Owendo Business Center.", lat: 0.3001, lng: 9.5042 },
  { nom: "AGL Gabon", role: "Consignataire et agent de plusieurs armateurs (Africa Global Logistics)", hub: "Libreville / Owendo", stations: ["ST-OWE", "ST-LBV", "ST-POG"], adresse: "Zone portuaire d'Owendo, BP 77, Libreville", tel: "+241 11 79 41 00", reperes: "En descendant vers les installations de la zone portuaire.", lat: 0.2878, lng: 9.4962 },
  { nom: "CMA CGM Port-Gentil", role: "Agence de l'armateur CMA CGM", hub: "Port-Gentil", stations: ["ST-POG"], adresse: "Centre commercial Rekangalt, BP 3590, Port-Gentil", tel: "+241 11 79 18 82", reperes: "En plein cœur commercial de Port-Gentil.", lat: -0.7189, lng: 8.7824 },
  { nom: "ART Gabon", role: "Consignation de navires et fret multimodal (Action Rapide Transit)", hub: "Port-Gentil", stations: ["ST-POG"], adresse: "Quartier Littoral, à côté de CIS, BP 569, Port-Gentil", tel: "+241 11 56 03 80", reperes: "Zone littorale logistique, à proximité immédiate de CIS.", lat: -0.7068, lng: 8.7806 },
  { nom: "Sogakai", role: "Armateur local (ravitailleurs offshore, PSV)", hub: "Port-Gentil", stations: ["ST-POG"], adresse: "Nouveau Port, Port-Gentil", tel: "+241 062 62 06 97", reperes: "Au niveau des quais du Nouveau Port pétrolier et offshore.", lat: -0.6946, lng: 8.7921 },
  { nom: "NLS Gabon", role: "Logistique maritime et support aux armateurs", hub: "Port-Gentil", stations: ["ST-POG"], adresse: "Siège social, BP 1316, Port-Gentil", tel: "+241 11 55 07 11", reperes: "Proche des zones d'activités maritimes de la ville.", lat: -0.7142, lng: 8.7861 },
];

/** Bureaux des armateurs du jeu de démonstration (positions indicatives dans leur ville). */
const SIEGES_DEMO: Record<string, { lat: number; lng: number; adresse: string; stations: string[] }> = {
  "SNAT Gabon": { lat: 0.2962, lng: 9.5011, adresse: "Zone portuaire d'Owendo", stations: ["ST-OWE", "ST-LBV"] },
  "Gabon Port Management": { lat: 0.2897, lng: 9.4974, adresse: "Port d'Owendo", stations: ["ST-OWE"] },
  "Bourbon Offshore": { lat: -0.7052, lng: 8.7899, adresse: "Zone industrielle OPRAG, Port-Gentil", stations: ["ST-POG"] },
  Satram: { lat: -0.7203, lng: 8.7768, adresse: "Port Môle, Port-Gentil", stations: ["ST-POG"] },
  "Perenco Marine": { lat: -0.7008, lng: 8.7856, adresse: "Base logistique, Port-Gentil", stations: ["ST-POG"] },
  "Edelweiss Maritime": { lat: -3.4292, lng: 10.6501, adresse: "Port de pêche de Mayumba", stations: ["ST-MAY"] },
};

/** Centre approximatif des quartiers de résidence proposés à l'enrôlement. */
export const POSITION_QUARTIER: Record<string, { lat: number; lng: number; ville: string }> = {
  "Santa Barbara / Pog": { lat: -0.7124, lng: 8.7812, ville: "Port-Gentil" },
  "Mounadji / Pog": { lat: -0.7372, lng: 8.7705, ville: "Port-Gentil" },
  "Mini-prix / Pog": { lat: -0.7246, lng: 8.7884, ville: "Port-Gentil" },
  "Akébé / Lbv": { lat: 0.3882, lng: 9.4603, ville: "Libreville" },
  "Nzeng-Ayong / Lbv": { lat: 0.4337, lng: 9.4958, ville: "Libreville" },
  Owendo: { lat: 0.2960, lng: 9.5080, ville: "Owendo" },
};

/** Lieu de travail d'un marin : le bureau de sa compagnie. */
export function lieuEntreprise(nom: string): (Lieu & { stations: string[] }) | null {
  const e = ENTREPRISES_MARITIMES.find((x) => x.nom === nom);
  if (e) return e;
  const d = SIEGES_DEMO[nom];
  return d ? { nom, ...d } : null;
}

/* ---------- Distances et durées ---------- */

const R = 6371;
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type Mode = "voiture" | "pied";
export interface Trajet {
  km: number;
  minutes: number;
  /** Tracé suivant les routes (si le service d'itinéraire a répondu), sinon ligne directe. */
  trace: [number, number][];
  source: "route" | "estimation";
}

/** Estimation hors ligne : détour moyen de 30 % ; 28 km/h en ville en voiture, 4,8 km/h à pied. */
export function estimer(a: { lat: number; lng: number }, b: { lat: number; lng: number }, mode: Mode): Trajet {
  const km = distanceKm(a, b) * 1.3;
  const minutes = (km / (mode === "voiture" ? 28 : 4.8)) * 60;
  return { km, minutes, trace: [[a.lng, a.lat], [b.lng, b.lat]], source: "estimation" };
}

/** Itinéraire par les routes (OpenStreetMap, service FOSSGIS) ; repli sur l'estimation. */
export async function itineraire(a: { lat: number; lng: number }, b: { lat: number; lng: number }, mode: Mode): Promise<Trajet> {
  const profil = mode === "voiture" ? "routed-car/route/v1/driving" : "routed-foot/route/v1/foot";
  const url = `https://routing.openstreetmap.de/${profil}/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
  try {
    const ctrl = new AbortController();
    const t = window.setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(url, { signal: ctrl.signal });
    window.clearTimeout(t);
    const j = (await r.json()) as { routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[] };
    const route = j.routes?.[0];
    if (!route) return estimer(a, b, mode);
    return { km: route.distance / 1000, minutes: route.duration / 60, trace: route.geometry.coordinates, source: "route" };
  } catch {
    return estimer(a, b, mode);
  }
}

export function duree(minutes: number): string {
  if (minutes < 1) return "moins d'une minute";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60), m = Math.round(minutes % 60);
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

/** Lien d'itinéraire Google Maps (sans clé) ; origine facultative = position actuelle. */
export function lienGoogleMaps(dest: { lat: number; lng: number }, origine?: { lat: number; lng: number } | null, mode: Mode = "voiture"): string {
  const p = new URLSearchParams({ api: "1", destination: `${dest.lat},${dest.lng}`, travelmode: mode === "voiture" ? "driving" : "walking" });
  if (origine) p.set("origin", `${origine.lat},${origine.lng}`);
  return `https://www.google.com/maps/dir/?${p.toString()}`;
}
