import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Map as CarteML, Marker, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

/**
 * Carte 3D (MapLibre, fond OpenStreetMap / OpenFreeMap avec bâtiments en relief).
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

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const OFM = "https://tiles.openfreemap.org";

/**
 * Vue satellite : imagerie aérienne (maisons, toits, mer, mangroves réellement visibles),
 * avec par-dessus les bâtiments OpenStreetMap en relief, les grands axes et les noms de lieux.
 */
const STYLE_SATELLITE: StyleSpecification = {
  version: 8,
  glyphs: `${OFM}/fonts/{fontstack}/{range}.pbf`,
  sources: {
    imagerie: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "Imagerie © Esri, Maxar, Earthstar Geographics",
    },
    osm: { type: "vector", url: `${OFM}/planet` },
  },
  layers: [
    { id: "fond", type: "background", paint: { "background-color": "#0b2a45" } },
    { id: "imagerie", type: "raster", source: "imagerie" },
    {
      id: "routes", type: "line", source: "osm", "source-layer": "transportation", minzoom: 11,
      filter: ["match", ["get", "class"], ["motorway", "trunk", "primary", "secondary", "tertiary"], true, false],
      paint: { "line-color": "#ffffff", "line-opacity": 0.45, "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.6, 17, 3] },
    },
    {
      id: "batiments-3d", type: "fill-extrusion", source: "osm", "source-layer": "building", minzoom: 14,
      paint: {
        "fill-extrusion-color": "#f3ead8",
        "fill-extrusion-opacity": 0.6,
        "fill-extrusion-height": ["coalesce", ["get", "render_height"], 6],
        "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
      },
    },
    {
      id: "noms", type: "symbol", source: "osm", "source-layer": "place",
      layout: { "text-field": ["coalesce", ["get", "name:fr"], ["get", "name"]], "text-font": ["Noto Sans Regular"], "text-size": ["interpolate", ["linear"], ["zoom"], 8, 11, 15, 15] },
      paint: { "text-color": "#ffffff", "text-halo-color": "rgba(0,0,0,0.75)", "text-halo-width": 1.4 },
    },
  ],
};

export type FondCarte = "plan" | "satellite";
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
  }
>(function Carte3D({ points, traces = [], recit, onCarteClic, onPointClic, className }, ref) {
  const boite = useRef<HTMLDivElement>(null);
  const carte = useRef<CarteML | null>(null);
  const marqueurs = useRef<Marker[]>([]);
  const lib = useRef<typeof import("maplibre-gl") | null>(null);
  const secoursActif = useRef(false);
  const anim = useRef(0);
  const [pret, setPret] = useState(false);
  const [secours, setSecours] = useState(false);
  const [fond, setFond] = useState<FondCarte>("plan");
  /** Vrai dès qu'un fond réel a fini de charger son style (les tuiles peuvent encore arriver). */
  const fondCharge = useRef(false);
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
      const b = new L.LngLatBounds();
      tr.coords.forEach((c) => b.extend(c));
      m.fitBounds(b, { padding: 110, pitch: 55, bearing: -10, duration: 1600, maxZoom: 16 });
      const debut = performance.now() + 900;
      const D = 2600;
      const pas = (now: number) => {
        const t = Math.min(1, Math.max(0, (now - debut) / D));
        dessinerTraces(t, tr.id);
        if (t < 1) anim.current = requestAnimationFrame(pas);
        else window.setTimeout(ensuite, 400);
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
        style: STYLE_URL,
        center: [9.45, 0.39],
        zoom: 10,
        pitch: 45,
        attributionControl: { compact: true },
      });
      carte.current = m;
      m.addControl(new L.NavigationControl({ visualizePitch: true }), "top-right");
      const preparer = () => {
        if (!secoursActif.current) {
          fondCharge.current = true;
          window.clearTimeout(minuteur);
        }
        if (!m.getSource("traces")) {
          m.addSource("traces", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          m.addLayer({ id: "traces-halo", type: "line", source: "traces", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffffff", "line-width": 9, "line-opacity": 0.85 } });
          m.addLayer({ id: "traces", type: "line", source: "traces", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ["get", "couleur"], "line-width": 5 } });
        }
        dessinerTraces(null);
        setPret(true);
      };
      m.on("style.load", preparer);
      // Fond de carte injoignable (hors ligne, réseau filtré) : on garde les tracés sur un fond uni.
      // Attention : isStyleLoaded() reste faux tant qu'une tuile se charge (donc pendant tout
      // survol animé) ; on se fie uniquement à l'événement « style.load » du fond réel.
      const basculerSecours = () => {
        if (fondCharge.current || secoursActif.current) return;
        secoursActif.current = true;
        setSecours(true);
        m.setStyle(STYLE_SECOURS);
      };
      minuteur = window.setTimeout(basculerSecours, 15000);
      m.on("error", (e: { error?: { status?: number; message?: string } }) => {
        // Le fichier de style lui-même est inaccessible : inutile d'attendre.
        if (!fondCharge.current && /styles\/liberty|Failed to fetch|NetworkError/i.test(e.error?.message ?? "")) basculerSecours();
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
    m.setStyle(fond === "satellite" ? STYLE_SATELLITE : STYLE_URL);
  }, [fond]);

  // Premier affichage : récit animé, ou vue d'ensemble.
  const lance = useRef(false);
  useEffect(() => {
    if (!pret || lance.current || !points.length) return;
    lance.current = true;
    if (recit?.length) rejouer();
    else vueGenerale(0);
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
          {(["plan", "satellite"] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={fond === f}
              onClick={() => setFond(f)}
              className={fond === f ? "bg-primary px-3 py-1.5 text-primary-foreground" : "px-3 py-1.5 text-foreground hover:bg-muted"}
            >
              {f === "plan" ? "Plan 3D" : "Satellite"}
            </button>
          ))}
        </div>
      )}
      {secours && (
        <div className="pointer-events-none absolute left-3 top-3 max-w-xs rounded-md bg-card/95 px-3 py-2 text-xs shadow-card">
          Fond de carte indisponible sur ce réseau : les lieux et les trajets restent affichés.
        </div>
      )}
    </div>
  );
});
