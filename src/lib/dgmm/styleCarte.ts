import type { StyleSpecification } from "maplibre-gl";

/**
 * Fonds de carte du portail, construits sur les tuiles vectorielles OpenStreetMap
 * (OpenFreeMap, schéma OpenMapTiles) — libres d'usage, sans clé.
 *
 * - PLAN : rendu proche de Google Maps (mer bleu clair, routes blanches, grands axes
 *   jaunes, parcs verts, bâtiments gris en relief au zoom rapproché, noms lisibles).
 * - SATELLITE : imagerie aérienne avec les routes, les bâtiments et les noms par-dessus.
 */

const OFM = "https://tiles.openfreemap.org";
const POLICE = ["Noto Sans Regular"];
const POLICE_GRAS = ["Noto Sans Bold"];
const POLICE_ITALIQUE = ["Noto Sans Italic"];
const NOM = ["coalesce", ["get", "name:fr"], ["get", "name:latin"], ["get", "name"]];

/** Couleurs inspirées de Google Maps. */
const C = {
  terre: "#f5f3ef",
  eau: "#aadaff",
  eauTexte: "#3f7cb8",
  parc: "#c9e8c4",
  foret: "#bfe0b7",
  sable: "#f4ecd2",
  zoneHabitee: "#efede8",
  industrie: "#ebe8f2",
  sante: "#fbe1e0",
  ecole: "#f6efd9",
  aeroport: "#e9ebf0",
  autoroute: "#fbd36b",
  autorouteBord: "#e1b54a",
  route: "#ffffff",
  routeBord: "#d9d6cf",
  petiteRoute: "#ffffff",
  chemin: "#d6d2c8",
  rail: "#b7b4ad",
  batiment: "#e6e3de",
  batimentBord: "#d6d2cb",
  texte: "#3c4043",
  texteRoute: "#5f6368",
  halo: "#ffffff",
};

const largeur = (z: number[]) => ["interpolate", ["exponential", 1.5], ["zoom"], ...z];
const filtreClasse = (...cl: string[]) => ["match", ["get", "class"], cl, true, false];

export const STYLE_PLAN = {
  version: 8,
  glyphs: `${OFM}/fonts/{fontstack}/{range}.pbf`,
  sources: { osm: { type: "vector", url: `${OFM}/planet` } },
  layers: [
    { id: "terre", type: "background", paint: { "background-color": C.terre } },
    { id: "zones-habitees", type: "fill", source: "osm", "source-layer": "landuse", filter: filtreClasse("residential", "suburb", "neighbourhood", "commercial", "retail"), paint: { "fill-color": C.zoneHabitee } },
    { id: "zones-industrielles", type: "fill", source: "osm", "source-layer": "landuse", filter: filtreClasse("industrial", "railway", "quarry"), paint: { "fill-color": C.industrie } },
    { id: "sante", type: "fill", source: "osm", "source-layer": "landuse", filter: filtreClasse("hospital"), paint: { "fill-color": C.sante } },
    { id: "ecoles", type: "fill", source: "osm", "source-layer": "landuse", filter: filtreClasse("school", "university", "college", "kindergarten"), paint: { "fill-color": C.ecole } },
    { id: "forets", type: "fill", source: "osm", "source-layer": "landcover", filter: filtreClasse("wood", "forest"), paint: { "fill-color": C.foret } },
    { id: "verdure", type: "fill", source: "osm", "source-layer": "landcover", filter: filtreClasse("grass", "wetland", "farmland"), paint: { "fill-color": C.parc, "fill-opacity": 0.7 } },
    { id: "sable", type: "fill", source: "osm", "source-layer": "landcover", filter: filtreClasse("sand", "beach"), paint: { "fill-color": C.sable } },
    { id: "parcs", type: "fill", source: "osm", "source-layer": "park", paint: { "fill-color": C.parc, "fill-opacity": 0.8 } },
    { id: "aeroports", type: "fill", source: "osm", "source-layer": "aeroway", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": C.aeroport } },
    { id: "eau", type: "fill", source: "osm", "source-layer": "water", paint: { "fill-color": C.eau } },
    { id: "cours-eau", type: "line", source: "osm", "source-layer": "waterway", paint: { "line-color": C.eau, "line-width": largeur([8, 0.5, 18, 6]) } },

    // Routes : bordure puis remplissage, des plus petites aux plus grandes.
    { id: "chemins", type: "line", source: "osm", "source-layer": "transportation", minzoom: 14, filter: filtreClasse("path", "track"), layout: { "line-cap": "round" }, paint: { "line-color": C.chemin, "line-width": largeur([14, 0.6, 18, 2]), "line-dasharray": [2, 1.5] } },
    { id: "rails", type: "line", source: "osm", "source-layer": "transportation", minzoom: 11, filter: filtreClasse("rail", "transit"), paint: { "line-color": C.rail, "line-width": largeur([11, 0.6, 18, 2.4]) } },
    { id: "petites-routes-bord", type: "line", source: "osm", "source-layer": "transportation", minzoom: 12, filter: filtreClasse("minor", "service"), layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": C.routeBord, "line-width": largeur([12, 1, 18, 16]) } },
    { id: "petites-routes", type: "line", source: "osm", "source-layer": "transportation", minzoom: 12, filter: filtreClasse("minor", "service"), layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": C.petiteRoute, "line-width": largeur([12, 0.5, 18, 13]) } },
    { id: "routes-bord", type: "line", source: "osm", "source-layer": "transportation", minzoom: 8, filter: filtreClasse("primary", "secondary", "tertiary"), layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": C.routeBord, "line-width": largeur([8, 1, 18, 22]) } },
    { id: "routes", type: "line", source: "osm", "source-layer": "transportation", minzoom: 8, filter: filtreClasse("primary", "secondary", "tertiary"), layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": C.route, "line-width": largeur([8, 0.6, 18, 18]) } },
    { id: "axes-bord", type: "line", source: "osm", "source-layer": "transportation", minzoom: 5, filter: filtreClasse("motorway", "trunk"), layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": C.autorouteBord, "line-width": largeur([5, 1, 18, 26]) } },
    { id: "axes", type: "line", source: "osm", "source-layer": "transportation", minzoom: 5, filter: filtreClasse("motorway", "trunk"), layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": C.autoroute, "line-width": largeur([5, 0.6, 18, 22]) } },
    { id: "bacs", type: "line", source: "osm", "source-layer": "transportation", filter: filtreClasse("ferry"), paint: { "line-color": "#6aa0d8", "line-width": 1.2, "line-dasharray": [3, 2] } },

    // Bâtiments : à plat puis en relief au zoom rapproché.
    { id: "batiments", type: "fill", source: "osm", "source-layer": "building", minzoom: 14, maxzoom: 15.5, paint: { "fill-color": C.batiment, "fill-outline-color": C.batimentBord } },
    { id: "batiments-3d", type: "fill-extrusion", source: "osm", "source-layer": "building", minzoom: 15, paint: { "fill-extrusion-color": C.batiment, "fill-extrusion-opacity": 0.9, "fill-extrusion-height": ["coalesce", ["get", "render_height"], 5], "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0] } },

    // Textes.
    { id: "noms-eaux", type: "symbol", source: "osm", "source-layer": "water_name", layout: { "text-field": NOM, "text-font": POLICE_ITALIQUE, "text-size": ["interpolate", ["linear"], ["zoom"], 5, 11, 12, 15], "text-letter-spacing": 0.1 }, paint: { "text-color": C.eauTexte, "text-halo-color": "rgba(255,255,255,0.6)", "text-halo-width": 1 } },
    { id: "noms-rues", type: "symbol", source: "osm", "source-layer": "transportation_name", minzoom: 13, layout: { "symbol-placement": "line", "text-field": NOM, "text-font": POLICE, "text-size": ["interpolate", ["linear"], ["zoom"], 13, 10, 18, 14] }, paint: { "text-color": C.texteRoute, "text-halo-color": C.halo, "text-halo-width": 1.5 } },
    { id: "lieux-utiles", type: "symbol", source: "osm", "source-layer": "poi", minzoom: 15, filter: ["<=", ["coalesce", ["get", "rank"], 99], 20], layout: { "text-field": NOM, "text-font": POLICE, "text-size": 11, "text-max-width": 8, "text-anchor": "top", "text-offset": [0, 0.4] }, paint: { "text-color": "#6b6b6b", "text-halo-color": C.halo, "text-halo-width": 1.2 } },
    { id: "quartiers", type: "symbol", source: "osm", "source-layer": "place", minzoom: 11, filter: filtreClasse("suburb", "neighbourhood", "quarter", "hamlet"), layout: { "text-field": NOM, "text-font": POLICE, "text-size": ["interpolate", ["linear"], ["zoom"], 11, 10, 16, 13], "text-transform": "uppercase", "text-letter-spacing": 0.08, "text-max-width": 8 }, paint: { "text-color": "#80868b", "text-halo-color": C.halo, "text-halo-width": 1.5 } },
    { id: "villes", type: "symbol", source: "osm", "source-layer": "place", filter: filtreClasse("city", "town", "village"), layout: { "text-field": NOM, "text-font": POLICE_GRAS, "text-size": ["interpolate", ["linear"], ["zoom"], 5, 11, 12, 17] }, paint: { "text-color": C.texte, "text-halo-color": C.halo, "text-halo-width": 1.8 } },
  ],
} as unknown as StyleSpecification;

export const STYLE_SATELLITE = {
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
    { id: "routes", type: "line", source: "osm", "source-layer": "transportation", minzoom: 11, filter: filtreClasse("motorway", "trunk", "primary", "secondary", "tertiary"), paint: { "line-color": "#ffffff", "line-opacity": 0.45, "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.6, 17, 3] } },
    { id: "batiments-3d", type: "fill-extrusion", source: "osm", "source-layer": "building", minzoom: 14, paint: { "fill-extrusion-color": "#f3ead8", "fill-extrusion-opacity": 0.6, "fill-extrusion-height": ["coalesce", ["get", "render_height"], 6], "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0] } },
    { id: "noms-rues", type: "symbol", source: "osm", "source-layer": "transportation_name", minzoom: 14, layout: { "symbol-placement": "line", "text-field": NOM, "text-font": POLICE, "text-size": 11 }, paint: { "text-color": "#ffffff", "text-halo-color": "rgba(0,0,0,0.7)", "text-halo-width": 1.2 } },
    { id: "noms", type: "symbol", source: "osm", "source-layer": "place", layout: { "text-field": NOM, "text-font": POLICE, "text-size": ["interpolate", ["linear"], ["zoom"], 8, 11, 15, 15] }, paint: { "text-color": "#ffffff", "text-halo-color": "rgba(0,0,0,0.75)", "text-halo-width": 1.4 } },
  ],
} as unknown as StyleSpecification;
