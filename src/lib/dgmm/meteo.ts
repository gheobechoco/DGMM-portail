// Météo réelle (Open-Meteo, sans clé) pour l'ambiance de la carte 3D du trajet.

export interface Meteo {
  temperature: number;
  /** Code météo OMM (WMO) : 0 ciel clair … 95-99 orage. */
  code: number;
  /** Vent à 10 m, en km/h. */
  vent: number;
  /** Heure de la mesure (ISO, heure locale du lieu). */
  heure: string;
}

export type Ciel = "degage" | "nuageux" | "brouillard" | "pluie" | "orage";

/** Traduction des codes OMM en libellé simple ; « mauvais » déclenche l'ambiance tempête. */
export function decrireMeteo(code: number): { ciel: Ciel; libelle: string; mauvais: boolean } {
  if (code === 0) return { ciel: "degage", libelle: "Ciel dégagé", mauvais: false };
  if (code <= 3) return { ciel: "nuageux", libelle: code === 3 ? "Couvert" : "Peu nuageux", mauvais: false };
  if (code === 45 || code === 48) return { ciel: "brouillard", libelle: "Brouillard", mauvais: false };
  if (code >= 95) return { ciel: "orage", libelle: "Orage", mauvais: true };
  if (code >= 80) return { ciel: "pluie", libelle: "Averses", mauvais: true };
  if (code >= 61) return { ciel: "pluie", libelle: "Pluie", mauvais: true };
  if (code >= 51) return { ciel: "pluie", libelle: "Bruine", mauvais: true };
  return { ciel: "nuageux", libelle: "Nuageux", mauvais: false };
}

const DUREE_CACHE = 15 * 60_000;

/** Météo actuelle au point donné ; garde le résultat 15 minutes pour ne pas solliciter l'API à chaque visite. */
export async function meteoActuelle(lat: number, lng: number, signal?: AbortSignal): Promise<Meteo> {
  const cle = `dgmm-meteo:${lat.toFixed(2)},${lng.toFixed(2)}`;
  try {
    const brut = sessionStorage.getItem(cle);
    if (brut) {
      const { t, m } = JSON.parse(brut) as { t: number; m: Meteo };
      if (Date.now() - t < DUREE_CACHE) return m;
    }
  } catch {
    /* cache indisponible */
  }
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`;
  const r = await fetch(url, signal ? { signal } : {});
  if (!r.ok) throw new Error(`Open-Meteo ${r.status}`);
  const d = (await r.json()) as { current?: { temperature_2m?: number; weather_code?: number; wind_speed_10m?: number; time?: string } };
  const c = d.current;
  if (!c || typeof c.temperature_2m !== "number" || typeof c.weather_code !== "number") throw new Error("Réponse météo incomplète");
  const m: Meteo = { temperature: Math.round(c.temperature_2m), code: c.weather_code, vent: Math.round(c.wind_speed_10m ?? 0), heure: c.time ?? "" };
  try {
    sessionStorage.setItem(cle, JSON.stringify({ t: Date.now(), m }));
  } catch {
    /* cache indisponible */
  }
  return m;
}
