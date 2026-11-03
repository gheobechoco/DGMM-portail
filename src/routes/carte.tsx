import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Anchor, Building2, MapPin, Navigation, Phone, Search } from "lucide-react";
import { PublicShell } from "@/components/dgmm/PublicShell";
import { Carte3D, COULEUR_POINT, type Carte3DRef, type PointCarte } from "@/components/dgmm/Carte3D";
import { cn } from "@/lib/utils";
import { STATIONS } from "@/lib/dgmm/maritime";
import { ENTREPRISES_MARITIMES, POSITION_STATION, lienGoogleMaps } from "@/lib/dgmm/geo";

export const Route = createFileRoute("/carte")({
  head: () => ({ meta: [{ title: "Carte des entreprises et stations maritimes — DGMM" }] }),
  component: CarteMaritime,
});

type Filtre = "tous" | "Libreville / Owendo" | "Port-Gentil" | "stations";

function CarteMaritime() {
  const carte = useRef<Carte3DRef>(null);
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [q, setQ] = useState("");
  const [actif, setActif] = useState<string | null>(null);

  const stations = STATIONS.filter((s) => POSITION_STATION[s.code]).map((s) => ({ ...s, ...POSITION_STATION[s.code]! }));
  const points: PointCarte[] = useMemo(
    () => [
      ...ENTREPRISES_MARITIMES.map((e) => ({ id: e.nom, nom: e.nom, detail: e.adresse, lat: e.lat, lng: e.lng, type: "entreprise" as const })),
      ...stations.map((s) => ({ id: s.code, nom: s.nom, detail: s.adresse, lat: s.lat, lng: s.lng, type: "station" as const })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const nq = norm(q.trim());
  const entreprises = ENTREPRISES_MARITIMES.filter((e) => (filtre === "tous" || filtre === e.hub) && (!nq || norm(`${e.nom} ${e.role} ${e.adresse}`).includes(nq)));
  const stationsVisibles = stations.filter((s) => (filtre === "tous" || filtre === "stations") && (!nq || norm(`${s.nom} ${s.ville}`).includes(nq)));
  const voir = (id: string) => { setActif(id); carte.current?.allerA(id); };

  return (
    <PublicShell titre="Carte maritime">
      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Se repérer</div>
        <h1 className="font-display text-2xl font-bold text-primary sm:text-3xl">Entreprises maritimes et stations du Gabon</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Armateurs et représentants d'armateurs, avec leur adresse, leur téléphone, des repères pour s'y rendre et les stations maritimes de rattachement où ils accomplissent les formalités d'escale, de douane et de sécurité.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <Carte3D ref={carte} points={points} onPointClic={voir} className="relative h-[620px] overflow-hidden rounded-xl border lg:sticky lg:top-4" />
        <div className="space-y-3">
          <label className="field-dgmm flex h-10 items-center gap-2 rounded-md bg-card px-3">
            <Search className="size-4 text-muted-foreground" />
            <span className="sr-only">Rechercher</span>
            <input id="recherche-carte" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Entreprise, activité, adresse…" className="h-full flex-1 bg-transparent text-sm outline-none" />
          </label>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Filtrer">
            {(["tous", "Libreville / Owendo", "Port-Gentil", "stations"] as const).map((f) => (
              <button key={f} type="button" role="radio" aria-checked={filtre === f} onClick={() => setFiltre(f)} className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", filtre === f ? "border-gold bg-gold text-gold-foreground" : "bg-card hover:border-gold")}>
                {f === "tous" ? "Tout" : f === "stations" ? "Stations" : f}
              </button>
            ))}
          </div>
          <ul className="space-y-3">
            {entreprises.map((e) => (
              <li key={e.nom} className={cn("carte-survol rounded-xl border bg-card p-4 shadow-card", actif === e.nom && "border-gold")}>
                <button type="button" onClick={() => voir(e.nom)} className="flex w-full items-start gap-3 text-left">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg text-white" style={{ background: COULEUR_POINT.entreprise }}><Building2 className="size-4" /></span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-primary">{e.nom}</span>
                    <span className="block text-xs text-muted-foreground">{e.role}</span>
                  </span>
                </button>
                <div className="mt-3 space-y-1.5 text-sm">
                  <div className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />{e.adresse}</div>
                  {e.reperes && <div className="pl-6 text-xs text-muted-foreground">Repère : {e.reperes}</div>}
                  {e.tel && <div className="flex items-center gap-2"><Phone className="size-4 shrink-0 text-muted-foreground" /><a href={`tel:${e.tel.replace(/\s/g, "")}`} className="select-all font-medium tabular-nums text-primary hover:underline">{e.tel}</a></div>}
                  <div className="flex flex-wrap gap-1.5 pl-6 pt-1">
                    {e.stations.map((c) => {
                      const s = STATIONS.find((x) => x.code === c);
                      return <button key={c} type="button" onClick={() => voir(c)} className="inline-flex items-center gap-1 rounded-full bg-primary/8 px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-gold/20"><Anchor className="size-3" />{s?.ville ?? c}</button>;
                    })}
                  </div>
                </div>
                <a href={lienGoogleMaps(e)} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"><Navigation className="size-4" /> M'y rendre depuis ma position</a>
              </li>
            ))}
            {stationsVisibles.map((s) => (
              <li key={s.code} className={cn("carte-survol rounded-xl border bg-card p-4 shadow-card", actif === s.code && "border-gold")}>
                <button type="button" onClick={() => voir(s.code)} className="flex w-full items-start gap-3 text-left">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg text-white" style={{ background: COULEUR_POINT.station }}><Anchor className="size-4" /></span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-primary">{s.nom}</span>
                    <span className="block text-xs text-muted-foreground">{s.type} · {s.province} · VHF {s.vhf}</span>
                  </span>
                </button>
                <div className="mt-2 flex gap-2 text-sm"><MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />{s.adresse}</div>
                {s.contact && <div className="mt-1 flex items-center gap-2 text-sm"><Phone className="size-4 text-muted-foreground" /><span className="select-all tabular-nums">{s.contact}</span></div>}
                <div className="mt-2 pl-6 text-xs text-muted-foreground">
                  {ENTREPRISES_MARITIMES.filter((e) => e.stations.includes(s.code)).map((e) => e.nom).join(" · ") || "Cabotage national et navigation intérieure"}
                </div>
                <a href={lienGoogleMaps(s)} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"><Navigation className="size-4" /> M'y rendre depuis ma position</a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">Positions approximatives, à confirmer sur place ; le guidage pas à pas s'ouvre dans Google Maps.</p>
        </div>
      </div>
    </PublicShell>
  );
}
