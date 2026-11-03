import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Car, Footprints, Home, MapPinned, Navigation, Play, Anchor, Building2, Crosshair } from "lucide-react";
import { PublicShell } from "@/components/dgmm/PublicShell";
import { Panel } from "@/components/dgmm/Page";
import { Button } from "@/components/ui/button";
import { Carte3D, COULEUR_POINT, type Carte3DRef, type PointCarte, type TraceCarte } from "@/components/dgmm/Carte3D";
import { marinSession } from "@/lib/dgmm/auth";
import { STATIONS } from "@/lib/dgmm/maritime";
import { POSITION_QUARTIER, POSITION_STATION, distanceKm, duree, itineraire, lieuEntreprise, lienGoogleMaps, type Trajet } from "@/lib/dgmm/geo";
import { fullName, updateMarin, useMarins } from "@/lib/dgmm/store";

export const Route = createFileRoute("/mon-espace/trajet")({
  head: () => ({ meta: [{ title: "Mon trajet — Espace Marin | DGMM" }] }),
  component: MonTrajet,
});

interface Etape { id: "domicile" | "travail" | "station"; nom: string; detail: string; lat: number; lng: number }
interface Troncon { de: Etape; vers: Etape; voiture?: Trajet | undefined; pied?: Trajet | undefined }

/** Au-delà de 50 km à vol d'oiseau, le trajet est interurbain (route nationale, bateau ou avion). */
const LONGUE_DISTANCE = 50;
const longue = (t: Troncon) => distanceKm(t.de, t.vers) > LONGUE_DISTANCE;

const ICONE = { domicile: Home, travail: Building2, station: Anchor };
const COULEUR_TRONCON = ["#1F8A4C", "#D4A11E"];

function MonTrajet() {
  const id = marinSession.use();
  const m = useMarins().find((x) => String(x.id) === id);
  const carte = useRef<Carte3DRef>(null);
  const [placer, setPlacer] = useState(false);
  const [troncons, setTroncons] = useState<Troncon[]>([]);

  const etapes = useMemo<Etape[]>(() => {
    if (!m) return [];
    const out: Etape[] = [];
    const q = POSITION_QUARTIER[m.quartier];
    const dom = m.domicile ?? q;
    if (dom) out.push({ id: "domicile", nom: "Mon domicile", detail: m.domicile ? "Position placée sur la carte" : `Quartier ${m.quartier} (centre du quartier)`, lat: dom.lat, lng: dom.lng });
    const t = lieuEntreprise(m.entreprise);
    if (t) out.push({ id: "travail", nom: m.entreprise, detail: t.adresse, lat: t.lat, lng: t.lng });
    const st = STATIONS.find((s) => s.code === m.station);
    const ps = m.station ? POSITION_STATION[m.station] : undefined;
    if (st && ps) out.push({ id: "station", nom: st.nom, detail: ps.adresse, lat: ps.lat, lng: ps.lng });
    return out;
  }, [m]);

  // Itinéraires voiture et à pied pour chaque tronçon.
  useEffect(() => {
    let annule = false;
    const base: Troncon[] = etapes.slice(1).map((vers, i) => ({ de: etapes[i]!, vers }));
    setTroncons(base);
    void Promise.all(
      base.map(async (t) => ({ ...t, voiture: await itineraire(t.de, t.vers, "voiture"), pied: await itineraire(t.de, t.vers, "pied") })),
    ).then((r) => !annule && setTroncons(r));
    return () => { annule = true; };
  }, [etapes]);

  const points: PointCarte[] = useMemo(
    () => etapes.map((e) => ({ id: e.id, nom: e.nom, detail: e.detail, lat: e.lat, lng: e.lng, type: e.id })),
    [etapes],
  );
  const traces: TraceCarte[] = useMemo(
    () => troncons.filter((t) => t.voiture).map((t, i) => ({ id: `${t.de.id}-${t.vers.id}`, coords: t.voiture!.trace, couleur: COULEUR_TRONCON[i % 2]! })),
    [troncons],
  );

  if (!m) {
    return (
      <PublicShell titre="Espace Marin">
        <Panel>
          <p className="text-sm">Connectez-vous à l'Espace Marin pour voir votre trajet. <Link to="/mon-espace" className="font-semibold text-primary hover:underline">Se connecter</Link></p>
        </Panel>
      </PublicShell>
    );
  }

  const locaux = troncons.filter((t) => !longue(t));
  const total = (mode: "voiture" | "pied") => locaux.reduce((s, t) => s + (t[mode]?.minutes ?? 0), 0);
  const pret = troncons.length > 0 && troncons.every((t) => t.voiture && t.pied);

  return (
    <PublicShell
      titre="Espace Marin"
      utilisateur={<><div className="font-semibold">{fullName(m)}</div><div className="font-mono text-primary-foreground/70">{m.nip}</div></>}
      onLogout={() => marinSession.write(null)}
    >
      <Link to="/mon-espace" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="size-4" /> Mon espace</Link>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Mon trajet</div>
          <h1 className="font-display text-2xl font-bold text-primary sm:text-3xl">De chez moi à ma station maritime</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">La carte survole votre domicile, votre lieu de travail puis la station maritime où vous êtes enregistré, avec les temps de trajet.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => carte.current?.rejouer()}><Play /> Rejouer le trajet</Button>
          <Button variant={placer ? "gold" : "outline"} aria-pressed={placer} onClick={() => setPlacer((v) => !v)}>
            <Crosshair /> {placer ? "Touchez la carte à votre domicile…" : "Placer mon domicile"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Carte3D
          ref={carte}
          points={points}
          traces={traces}
          recit={pret ? etapes.map((e) => e.id) : undefined}
          className={`relative h-[560px] overflow-hidden rounded-xl border ${placer ? "cursor-crosshair ring-2 ring-gold" : ""}`}
          onPointClic={(pid) => carte.current?.allerA(pid)}
          onCarteClic={(p) => {
            if (!placer) return;
            updateMarin(m.id, { domicile: p });
            setPlacer(false);
            toast.success("Domicile enregistré", { description: "Les trajets sont recalculés depuis ce point." });
          }}
        />

        <div className="space-y-4">
          {!etapes.find((e) => e.id === "domicile") && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">Votre quartier n'est pas repéré : utilisez « Placer mon domicile » et touchez la carte.</div>
          )}
          <Panel title="Mes étapes" bodyClassName="p-0">
            <ol className="relative">
              {etapes.map((e, i) => {
                const Icon = ICONE[e.id];
                const t = troncons[i];
                return (
                  <li key={e.id} className="relative px-5 py-4">
                    <button type="button" onClick={() => carte.current?.allerA(e.id)} className="flex w-full items-start gap-3 text-left">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full text-white" style={{ background: COULEUR_POINT[e.id] }}><Icon className="size-4" /></span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-primary">{e.nom}</span>
                        <span className="block text-xs text-muted-foreground">{e.detail}</span>
                      </span>
                    </button>
                    {t && (
                      <div className="ml-4 mt-3 border-l-2 border-dashed pl-7" style={{ borderColor: COULEUR_TRONCON[i % 2] }}>
                        {longue(t) ? (
                          <div className="space-y-1.5 text-sm">
                            <div className="font-medium">Trajet interurbain : {Math.round(distanceKm(t.de, t.vers))} km à vol d'oiseau</div>
                            <div className="text-xs text-muted-foreground">Pas de trajet à pied possible ; selon les villes, la liaison se fait par la route nationale, par bateau ou par avion.</div>
                            <a href={lienGoogleMaps(t.vers, t.de, "voiture")} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline">Voir les itinéraires possibles</a>
                          </div>
                        ) : t.voiture && t.pied ? (
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5"><Car className="size-4 text-muted-foreground" /> {duree(t.voiture.minutes)} <span className="text-xs text-muted-foreground">· {t.voiture.km.toFixed(1)} km</span></span>
                              <a href={lienGoogleMaps(t.vers, t.de, "voiture")} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline">Itinéraire</a>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5"><Footprints className="size-4 text-muted-foreground" /> {duree(t.pied.minutes)} <span className="text-xs text-muted-foreground">· {t.pied.km.toFixed(1)} km</span></span>
                              <a href={lienGoogleMaps(t.vers, t.de, "pied")} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline">Itinéraire</a>
                            </div>
                            {t.voiture.source === "estimation" && <div className="text-[11px] text-muted-foreground">Estimation à vol d'oiseau (+30 %) : service d'itinéraire injoignable.</div>}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">Calcul du trajet…</div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </Panel>
          {pret && locaux.length > 0 && (
            <Panel title={locaux.length < troncons.length ? "Trajets en ville" : "Trajet complet"}>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-muted-foreground">En voiture</dt><dd className="font-display text-2xl font-bold text-primary">{duree(total("voiture"))}</dd></div>
                <div><dt className="text-xs text-muted-foreground">À pied</dt><dd className="font-display text-2xl font-bold text-primary">{duree(total("pied"))}</dd></div>
              </dl>
              {etapes.length > 1 && (
                <a href={lienGoogleMaps(etapes[etapes.length - 1]!, null, "voiture")} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                  <Navigation className="size-4" /> Me guider jusqu'à la station depuis ma position
                </a>
              )}
            </Panel>
          )}
          <p className="flex items-start gap-2 text-xs text-muted-foreground"><MapPinned className="mt-0.5 size-4 shrink-0" /> Positions approximatives ; les liens « Itinéraire » ouvrent Google Maps pour un guidage pas à pas.</p>
        </div>
      </div>
    </PublicShell>
  );
}
