import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Map as CarteML, Marker, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Cloud, CloudFog, CloudLightning, CloudRain, Sun, Wind } from "lucide-react";
import { AMBIANCES, BLEU_TRACE, STYLE_MAQUETTE, STYLE_PLAN, STYLE_SATELLITE } from "@/lib/dgmm/styleCarte";
import { decrireMeteo, meteoActuelle, type Ciel, type Meteo } from "@/lib/dgmm/meteo";

const ICONE_CIEL: Record<Ciel, typeof Sun> = { degage: Sun, nuageux: Cloud, brouillard: CloudFog, pluie: CloudRain, orage: CloudLightning };

/**
 * Carte 3D (MapLibre) : fond « Maquette 3D » (blanc minimaliste, par défaut), « Plan »
 * façon Google Maps ou « Satellite » ; données OpenStreetMap (OpenFreeMap).
 * Elle place des points (domicile, lieu de travail, station, entreprise) et peut
 * « raconter » un trajet : la caméra survole chaque étape pendant que le tracé se dessine.
 */

export type TypePoint = "domicile" | "travail" | "station" | "entreprise";

export interface PointCarte {
  id: string;
  nom: string;
  detail?: string | undefined;
  lat: number;
  lng: number;
  type: TypePoint;
}

export interface TraceCarte {
  id: string;
  coords: [number, number][];
  couleur: string;
}

export interface Carte3DRef {
  rejouer: () => void;
  allerA: (id: string) => void;
  vueGenerale: () => void;
}

export type FondCarte = "maquette" | "plan" | "satellite";
const STYLE_DE: Record<FondCarte, StyleSpecification> = { maquette: STYLE_MAQUETTE, plan: STYLE_PLAN, satellite: STYLE_SATELLITE };
const LIBELLE_FOND: Record<FondCarte, string> = { maquette: "Maquette 3D", plan: "Plan", satellite: "Satellite" };

/** Distance approximative en kilomètres entre deux points [lng, lat]. */
function km(a: [number, number], b: [number, number]): number {
  const r = Math.PI / 180;
  const dLat = (b[1] - a[1]) * r, dLng = (b[0] - a[0]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}
const STYLE_SECOURS: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "fond", type: "background", paint: { "background-color": "#dfe8f2" } }],
};

export const COULEUR_POINT: Record<TypePoint, string> = {
  domicile: "#1F8A4C",
  travail: "#D4A11E",
  station: "#13294B",
  entreprise: "#2F6FB5",
};
const LETTRE: Record<TypePoint, string> = { domicile: "⌂", travail: "◆", station: "⚓", entreprise: "●" };

function marqueur(p: PointCarte, onClick?: (() => void) | undefined): HTMLElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "carte-marqueur";
  el.style.setProperty("--c", COULEUR_POINT[p.type]);
  el.setAttribute("aria-label", `${p.nom}${p.detail ? `, ${p.detail}` : ""}`);
  el.innerHTML = `<span class="carte-marqueur-corps"><span class="carte-marqueur-pin"><span>${LETTRE[p.type]}</span></span><span class="carte-marqueur-nom"></span></span>`;
  (el.querySelector(".carte-marqueur-nom") as HTMLElement).textContent = p.nom;
  if (onClick) el.addEventListener("click", onClick);
  return el;
}

function longueurs(c: [number, number][]): number[] {
  const out = [0];
  for (let i = 1; i < c.length; i++) {
    const [a, b] = [c[i - 1]!, c[i]!];
    out.push(out[i - 1]! + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  return out;
}

/** Portion du tracé parcourue à la fraction t (0 → 1). */
function portion(c: [number, number][], cumul: number[], t: number): [number, number][] {
  if (c.length < 2) return c;
  const total = cumul[cumul.length - 1]!;
  const cible = total * t;
  const res: [number, number][] = [c[0]!];
  for (let i = 1; i < c.length; i++) {
    if (cumul[i]! <= cible) res.push(c[i]!);
    else {
      const k = (cible - cumul[i - 1]!) / (cumul[i]! - cumul[i - 1]! || 1);
      const [a, b] = [c[i - 1]!, c[i]!];
      res.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
      break;
    }
  }
  return res;
}

export const Carte3D = forwardRef<
  Carte3DRef,
  {
    points: PointCarte[];
    traces?: TraceCarte[] | undefined;
    /** Ordre des étapes du récit animé (identifiants de points). */
    recit?: string[] | undefined;
    onCarteClic?: ((p: { lat: number; lng: number }) => void) | undefined;
    onPointClic?: ((id: string) => void) | undefined;
    className?: string | undefined;
    /** Météo réelle du lieu : la maquette passe en ambiance « tempête » s'il pleut ou s'il y a de l'orage. */
    meteo?: { lat: number; lng: number; lieu: string } | undefined;
  }
>(function Carte3D({ points, traces = [], recit, onCarteClic, onPointClic, className, meteo }, ref) {
  const boite = useRef<HTMLDivElement>(null);
  const carte = useRef<CarteML | null>(null);
  const marqueurs = useRef<Marker[]>([]);
  const lib = useRef<typeof import("maplibre-gl") | null>(null);
  const secoursActif = useRef(false);
  const anim = useRef(0);
  const [pret, setPret] = useState(false);
  const [secours, setSecours] = useState(false);
  const [fond, setFond] = useState<FondCarte>("maquette");
  const fondRef = useRef<FondCarte>("maquette");
  fondRef.current = fond;
  /** Vrai dès qu'un fond réel a fini de charger son style (les tuiles peuvent encore arriver). */
  const fondCharge = useRef(false);
  // Météo réelle (seulement si la page la demande) et simulation pour la démonstration.
  const [releve, setReleve] = useState<Meteo | null>(null);
  const [statutMeteo, setStatutMeteo] = useState<"chargement" | "ok" | "indispo">("chargement");
  const [simule, setSimule] = useState(false);
  const ciel = simule ? "orage" : releve ? decrireMeteo(releve.code).ciel : null;
  const tempete = !!meteo && (simule || (!!releve && decrireMeteo(releve.code).mauvais));
  const tempeteRef = useRef(false);
  tempeteRef.current = tempete;
  const etat = useRef({ points, traces, recit, onCarteClic, onPointClic });
  etat.current = { points, traces, recit, onCarteClic, onPointClic };

  const reduit = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const vueGenerale = (duree = 1800) => {
    const m = carte.current, L = lib.current;
    const pts = etat.current.points;
    if (!m || !L || !pts.length) return;
    const b = new L.LngLatBounds();
    pts.forEach((p) => b.extend([p.lng, p.lat]));
    etat.current.traces.forEach((t) => t.coords.forEach((c) => b.extend(c)));
    m.fitBounds(b, { padding: 90, pitch: 50, bearing: -15, duration: reduit() ? 0 : duree, maxZoom: 15 });
  };

  /** Couleurs de la maquette selon la météo (sans recharger le style : les tracés restent). */
  const appliquerAmbiance = () => {
    const m = carte.current;
    if (!m || fondRef.current !== "maquette" || secoursActif.current) return;
    const a = AMBIANCES[tempeteRef.current ? "tempete" : "calme"];
    for (const [couche, peinture] of Object.entries(a.couches)) {
      if (!m.getLayer(couche)) continue;
      for (const [prop, valeur] of Object.entries(peinture)) m.setPaintProperty(couche, prop, valeur);
    }
    m.setLight({ anchor: "viewport", position: [1.4, 215, 35], ...a.lumiere });
  };

  const dessinerTraces = (t: number | null, enCours?: string) => {
    const m = carte.current;
    if (!m) return;
    const src = m.getSource("traces") as { setData?: (d: unknown) => void } | undefined;
    if (!src?.setData) return;
    const traces = etat.current.traces;
    const ordre = etat.current.recit ?? [];
    const features = traces.map((tr) => {
      let coords = tr.coords;
      if (t !== null) {
        const idx = traces.findIndex((x) => x.id === enCours);
        const moi = traces.findIndex((x) => x.id === tr.id);
        if (enCours && moi > idx) coords = [];
        else if (tr.id === enCours) coords = portion(tr.coords, longueurs(tr.coords), t);
      }
      return { type: "Feature", properties: { couleur: tr.couleur }, geometry: { type: "LineString", coordinates: coords.length > 1 ? coords : [] } };
    });
    void ordre;
    src.setData({ type: "FeatureCollection", features });
    // Point mobile en tête du tracé pendant l'animation (masqué au repos).
    const tete = m.getSource("tete") as { setData?: (d: unknown) => void } | undefined;
    const enCoursF = t !== null && enCours ? features[traces.findIndex((x) => x.id === enCours)] : undefined;
    const c = enCoursF?.geometry.coordinates as [number, number][] | undefined;
    tete?.setData?.({ type: "FeatureCollection", features: c && c.length ? [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: c[c.length - 1] } }] : [] });
  };

  const rejouer = () => {
    const m = carte.current;
    if (!m) return;
    cancelAnimationFrame(anim.current);
    const pts = etat.current.points;
    const ids = etat.current.recit ?? [];
    const etapes = ids.map((id) => pts.find((p) => p.id === id)).filter(Boolean) as PointCarte[];
    const traces = etat.current.traces;
    if (reduit() || etapes.length < 2) {
      dessinerTraces(null);
      vueGenerale(0);
      return;
    }
    let i = 0;
    const survoler = (p: PointCarte, ensuite: () => void) => {
      m.flyTo({ center: [p.lng, p.lat], zoom: 16, pitch: 62, bearing: -20 + i * 35, duration: 2600, essential: true });
      m.once("moveend", () => window.setTimeout(ensuite, 700));
    };
    const tracer = (tr: TraceCarte | undefined, ensuite: () => void) => {
      if (!tr) return ensuite();
      const L = lib.current!;
      const cumul = longueurs(tr.coords);
      const long = tr.coords.length > 1 ? km(tr.coords[0]!, tr.coords[tr.coords.length - 1]!) : 0;
      // Trajet urbain : la caméra suit le point bleu au ras des bâtiments.
      // Long trajet (interurbain) : vue d'ensemble du segment, sinon le survol serait illisible.
      const suivre = long > 0 && long < 12;
      if (suivre) {
        m.easeTo({ center: tr.coords[0]!, zoom: 16.4, pitch: 60, bearing: -20, duration: 1200 });
      } else {
        const b = new L.LngLatBounds();
        tr.coords.forEach((c) => b.extend(c));
        m.fitBounds(b, { padding: 110, pitch: 55, bearing: -10, duration: 1600, maxZoom: 16 });
      }
      const debut = performance.now() + (suivre ? 1300 : 900);
      const D = suivre ? Math.min(9000, Math.max(3500, long * 1800)) : 2600;
      const pas = (now: number) => {
        const t = Math.min(1, Math.max(0, (now - debut) / D));
        dessinerTraces(t, tr.id);
        if (suivre && t > 0) {
          const p = portion(tr.coords, cumul, t);
          // Légère rotation continue de la caméra : le relief des blocs se lit mieux.
          m.jumpTo({ center: p[p.length - 1]!, bearing: -20 + t * 40 });
        }
        if (t < 1) anim.current = requestAnimationFrame(pas);
        else window.setTimeout(ensuite, 500);
      };
      anim.current = requestAnimationFrame(pas);
    };
    dessinerTraces(0, traces[0]?.id);
    const suite = () => {
      if (i >= etapes.length) {
        dessinerTraces(null);
        vueGenerale();
        return;
      }
      const p = etapes[i]!;
      survoler(p, () => {
        const tr = traces[i];
        i += 1;
        if (i < etapes.length) tracer(tr, suite);
        else suite();
      });
    };
    suite();
  };

  useImperativeHandle(ref, () => ({
    rejouer,
    vueGenerale: () => vueGenerale(),
    allerA: (id: string) => {
      const p = etat.current.points.find((x) => x.id === id);
      if (p) carte.current?.flyTo({ center: [p.lng, p.lat], zoom: 16.5, pitch: 60, bearing: -25, duration: reduit() ? 0 : 2200 });
    },
  }));

  // Création de la carte (côté navigateur uniquement).
  useEffect(() => {
    let detruit = false;
    let minuteur = 0;
    void import("maplibre-gl").then((L) => {
      if (detruit || !boite.current) return;
      lib.current = L;
      const m = new L.Map({
        container: boite.current,
        style: STYLE_MAQUETTE,
        center: [9.45, 0.39],
        zoom: 10,
        pitch: 45,
        attributionControl: { compact: true },
      });
      carte.current = m;
      m.addControl(new L.NavigationControl({ visualizePitch: true }), "top-right");
      const preparer = () => {
        if (!m.getSource("traces")) {
          m.addSource("traces", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          const maquette = fondRef.current === "maquette";
          const epaisseur = ["interpolate", ["exponential", 1.5], ["zoom"], 10, 4, 14, 7, 17, 13];
          m.addLayer({ id: "traces-halo", type: "line", source: "traces", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffffff", "line-width": maquette ? ["interpolate", ["exponential", 1.5], ["zoom"], 10, 7, 14, 11, 17, 18] : 9, "line-opacity": maquette ? 0.7 : 0.85 } } as never);
          // Maquette blanche : un seul bleu électrique, épais, comme un itinéraire de navigation.
          m.addLayer({ id: "traces", type: "line", source: "traces", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": maquette ? BLEU_TRACE : ["get", "couleur"], "line-width": maquette ? epaisseur : 5 } } as never);
          m.addSource("tete", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          m.addLayer({ id: "tete-halo", type: "circle", source: "tete", paint: { "circle-radius": 20, "circle-color": BLEU_TRACE, "circle-opacity": 0.18, "circle-pitch-alignment": "map" } });
          m.addLayer({ id: "tete", type: "circle", source: "tete", paint: { "circle-radius": 8, "circle-color": BLEU_TRACE, "circle-stroke-color": "#ffffff", "circle-stroke-width": 3.5, "circle-pitch-alignment": "map" } });
        }
        dessinerTraces(null);
        appliquerAmbiance();
        setPret(true);
      };
      m.on("style.load", preparer);
      // Fond de carte injoignable (hors ligne, réseau filtré) : on garde les tracés sur un fond uni.
      // Le style est intégré au code : c'est l'arrivée des données (description des tuiles ou
      // première tuile) qui prouve que le serveur répond. Ne pas se fier à isStyleLoaded(),
      // qui reste faux tant qu'une tuile se charge, donc pendant tout survol animé.
      m.on("data", (e: { dataType?: string; sourceId?: string; sourceDataType?: string; tile?: unknown }) => {
        if (fondCharge.current || secoursActif.current) return;
        if (e.dataType === "source" && e.sourceId === "osm" && (e.sourceDataType === "metadata" || e.tile)) {
          fondCharge.current = true;
          window.clearTimeout(minuteur);
        }
      });
      const basculerSecours = () => {
        if (fondCharge.current || secoursActif.current) return;
        secoursActif.current = true;
        setSecours(true);
        m.setStyle(STYLE_SECOURS);
      };
      minuteur = window.setTimeout(basculerSecours, 15000);
      m.on("error", (e: { error?: { status?: number; message?: string } }) => {
        // Le serveur de tuiles ne répond pas du tout : inutile d'attendre.
        if (!fondCharge.current && /planet|Failed to fetch|NetworkError|Load failed/i.test(e.error?.message ?? "")) basculerSecours();
      });
      m.on("click", (e) => etat.current.onCarteClic?.({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
    });
    return () => {
      detruit = true;
      window.clearTimeout(minuteur);
      cancelAnimationFrame(anim.current);
      carte.current?.remove();
      carte.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marqueurs et tracés suivent les données.
  useEffect(() => {
    const m = carte.current, L = lib.current;
    if (!m || !L || !pret) return;
    marqueurs.current.forEach((x) => x.remove());
    marqueurs.current = points.map((p) => {
      const mk = new L.Marker({ element: marqueur(p, () => etat.current.onPointClic?.(p.id)), anchor: "bottom" }).setLngLat([p.lng, p.lat]).addTo(m);
      // MapLibre remplace le libellé accessible : on remet le nom du lieu.
      mk.getElement().setAttribute("aria-label", `${p.nom}${p.detail ? `, ${p.detail}` : ""}`);
      return mk;
    });
    dessinerTraces(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, traces, pret]);

  // Changement de fond (plan ↔ satellite). Les marqueurs DOM restent ; les tracés sont
  // recréés par « style.load ».
  const premierFond = useRef(true);
  useEffect(() => {
    const m = carte.current;
    if (premierFond.current) { premierFond.current = false; return; }
    if (!m || secoursActif.current) return;
    m.setStyle(STYLE_DE[fond]);
  }, [fond]);

  // Météo réelle du lieu (Open-Meteo). Sans réseau : la carte reste en maquette blanche.
  useEffect(() => {
    if (!meteo) return;
    const ctrl = new AbortController();
    setStatutMeteo("chargement");
    meteoActuelle(meteo.lat, meteo.lng, ctrl.signal)
      .then((r) => { setReleve(r); setStatutMeteo("ok"); })
      .catch(() => { if (!ctrl.signal.aborted) setStatutMeteo("indispo"); });
    return () => ctrl.abort();
  }, [meteo?.lat, meteo?.lng]);

  useEffect(() => {
    if (pret) appliquerAmbiance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tempete, pret]);

  // Premier affichage : vue d'ensemble, puis récit animé dès que les itinéraires sont prêts
  // (ils arrivent souvent après le chargement de la carte : on attend le récit au lieu d'y renoncer).
  const lance = useRef(false);
  const vueInitiale = useRef(false);
  useEffect(() => {
    if (!pret || lance.current || !points.length) return;
    if (recit?.length) {
      lance.current = true;
      rejouer();
    } else if (!vueInitiale.current) {
      vueInitiale.current = true;
      vueGenerale(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pret, points.length, recit?.length, traces.length]);

  return (
    <div className={className ?? "relative h-[520px] overflow-hidden rounded-xl border"}>
      {/* MapLibre impose position: relative au conteneur : on le dimensionne en hauteur pleine. */}
      <div ref={boite} className="h-full w-full" />
      {!pret && (
        <div className="absolute inset-0 grid place-items-center bg-muted text-sm text-muted-foreground">Chargement de la carte…</div>
      )}
      {pret && !secours && (
        <div role="radiogroup" aria-label="Fond de carte" className="absolute left-3 top-3 flex overflow-hidden rounded-md border bg-card/95 text-xs font-semibold shadow-card">
          {(["maquette", "plan", "satellite"] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={fond === f}
              onClick={() => setFond(f)}
              className={fond === f ? "bg-primary px-3 py-1.5 text-primary-foreground" : "px-3 py-1.5 text-foreground hover:bg-muted"}
            >
              {LIBELLE_FOND[f]}
            </button>
          ))}
        </div>
      )}
      {tempete && fond === "maquette" && !secours && (
        <div aria-hidden className={`carte-pluie pointer-events-none absolute inset-0 ${ciel === "orage" ? "carte-orage" : ""}`} />
      )}
      {meteo && pret && <BadgeMeteo lieu={meteo.lieu} releve={releve} statut={statutMeteo} simule={simule} onSimule={setSimule} maquette={fond === "maquette" && !secours} />}
      {secours && (
        <div className="pointer-events-none absolute left-3 top-3 max-w-xs rounded-md bg-card/95 px-3 py-2 text-xs shadow-card">
          Fond de carte indisponible sur ce réseau : les lieux et les trajets restent affichés.
        </div>
      )}
    </div>
  );
});

/** Encart météo de la carte du trajet : relevé réel et bouton de simulation pour la démonstration. */
function BadgeMeteo({
  lieu,
  releve,
  statut,
  simule,
  onSimule,
  maquette,
}: {
  lieu: string;
  releve: Meteo | null;
  statut: "chargement" | "ok" | "indispo";
  simule: boolean;
  onSimule: (v: boolean) => void;
  maquette: boolean;
}) {
  const d = simule ? { ciel: "orage" as Ciel, libelle: "Orage (simulation)", mauvais: true } : releve ? decrireMeteo(releve.code) : null;
  const Icone = d ? ICONE_CIEL[d.ciel] : Cloud;
  const sombre = !!d?.mauvais;
  return (
    <div
      className={`absolute bottom-3 left-3 w-60 rounded-xl p-3 text-white shadow-xl backdrop-blur-md transition-colors duration-700 ${
        sombre ? "bg-gradient-to-br from-[#2c3e50]/95 to-[#1f4f7a]/95" : "bg-gradient-to-br from-[#1673ff]/95 to-[#38b6ff]/95"
      }`}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider text-white/80">Météo · {lieu}</div>
      {statut === "chargement" && !simule ? (
        <div className="mt-1 text-sm text-white/85">Lecture de la météo…</div>
      ) : statut === "indispo" && !simule ? (
        <div className="mt-1 text-sm text-white/85">Météo en direct indisponible sur ce réseau.</div>
      ) : (
        <div className="mt-1 flex items-center gap-3">
          <Icone className="size-8 shrink-0" aria-hidden />
          <div className="min-w-0">
            {releve && <div className="font-display text-2xl font-bold leading-none">{releve.temperature} °C</div>}
            <div className="mt-1 truncate text-xs text-white/90">
              {d?.libelle}
              {releve && (
                <span className="ml-1 inline-flex items-center gap-0.5"><Wind className="size-3" aria-hidden /> {releve.vent} km/h</span>
              )}
            </div>
          </div>
        </div>
      )}
      {maquette && (
        <label className="mt-2 flex cursor-pointer items-center gap-2 border-t border-white/20 pt-2 text-[11px] text-white/85">
          <input type="checkbox" checked={simule} onChange={(e) => onSimule(e.target.checked)} className="size-3.5 accent-white" />
          Simuler un orage
        </label>
      )}
    </div>
  );
}
