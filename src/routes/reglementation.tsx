import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Info,
  MapPin,
  Phone,
  Radio,
  Scale,
  Search,
  Siren,
} from "lucide-react";
import { PublicShell } from "@/components/dgmm/PublicShell";
import { CarteSkeleton } from "@/components/dgmm/Skeletons";
import { EmptyState, Panel } from "@/components/dgmm/Page";
import { AVURNAV, STATIONS, TEXTES, type AvisNavigateurs } from "@/lib/dgmm/maritime";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reglementation")({
  ssr: false,
  pendingComponent: CarteSkeleton,
  head: () => ({
    meta: [
      { title: "Réglementation maritime — DGMM" },
      {
        name: "description",
        content:
          "Médiathèque officielle : Code CEMAC de la marine marchande, conventions OMI (STCW, MLC), avis urgents aux navigateurs et stations maritimes du Gabon.",
      },
    ],
  }),
  component: Reglementation,
});

const NIVEAU: Record<AvisNavigateurs["niveau"], { cls: string; icon: typeof Info; dot: string }> = {
  Urgent: {
    cls: "border-destructive/40 bg-destructive/8 text-destructive",
    icon: Siren,
    dot: "dot-ping",
  },
  Avertissement: {
    cls: "border-warning/40 bg-warning/10 text-warning",
    icon: AlertTriangle,
    dot: "pill-breathe",
  },
  Information: { cls: "border-primary/20 bg-primary-soft text-primary", icon: Info, dot: "" },
};

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Médiathèque officielle : textes CEMAC / OMI, avis AVURNAV et annuaire des stations. Accessible à tous. */
function Reglementation() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const categories = [...new Set(TEXTES.map((t) => t.categorie))];
  const textes = useMemo(() => {
    const nq = norm(q.trim());
    return TEXTES.filter(
      (t) =>
        (!cat || t.categorie === cat) &&
        (!nq || norm(`${t.titre} ${t.reference} ${t.resume} ${t.id}`).includes(nq)),
    );
  }, [q, cat]);
  const avis = [...AVURNAV].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <PublicShell titre="Réglementation">
      <div className="mb-6">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
          Médiathèque officielle
        </div>
        <h1 className="font-display text-2xl font-bold text-primary sm:text-[28px]">
          Réglementation maritime
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Textes CEMAC et conventions OMI applicables aux gens de mer, avis urgents aux navigateurs
          et stations de la DGMM.
        </p>
      </div>

      <section aria-labelledby="avurnav" className="mb-8">
        <h2
          id="avurnav"
          className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-primary"
        >
          <Radio className="sway size-4" /> Avis urgents aux navigateurs (AVURNAV)
        </h2>
        <ul className="stagger grid gap-3 md:grid-cols-2">
          {avis.map((a) => {
            const n = NIVEAU[a.niveau];
            const Icon = n.icon;
            return (
              <li key={a.id} className={cn("rounded-xl border p-4", n.cls)}>
                <div className="flex items-start gap-3">
                  <Icon className={cn("mt-0.5 size-5 shrink-0", n.dot)} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 text-[11px] font-semibold uppercase tracking-wider">
                      <span>{a.niveau}</span>
                      <span className="opacity-60">·</span>
                      <span>{a.station}</span>
                      <span className="opacity-60">·</span>
                      <time dateTime={a.date}>
                        {new Date(a.date).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                    <h3 className="mt-1 font-display font-semibold text-foreground">{a.titre}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{a.message}</p>
                    <div className="mt-2 font-mono text-[11px] text-muted-foreground">{a.id}</div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <Panel
        title={
          <span className="flex items-center gap-2">
            <Scale className="size-4" /> Textes réglementaires
          </span>
        }
        description="Législation régionale CEMAC et conventions internationales"
        bodyClassName="space-y-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="field-dgmm flex h-10 flex-1 items-center gap-2 rounded-md bg-card px-3">
            <Search className="size-4 text-muted-foreground" />
            <span className="sr-only">Rechercher un texte</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="STCW, CEMAC, rapatriement, aptitude…"
              className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Catégories">
            {[null, ...categories].map((c) => (
              <button
                key={c ?? "tous"}
                type="button"
                aria-pressed={cat === c}
                onClick={() => setCat(c)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                  cat === c
                    ? "border-gold bg-gold/20 text-primary"
                    : "text-muted-foreground hover:border-gold",
                )}
              >
                {c ?? "Toutes"}
              </button>
            ))}
          </div>
        </div>
        {textes.length === 0 ? (
          <EmptyState icon={BookOpen} title="Aucun texte trouvé" />
        ) : (
          <ul className="stagger grid gap-3 md:grid-cols-3">
            {textes.map((t) => (
              <li
                key={t.id}
                className="flex flex-col rounded-xl border bg-card p-4 transition-shadow hover:shadow-card"
              >
                <span className="self-start rounded-full bg-secondary/12 px-2 py-0.5 text-[11px] font-semibold text-secondary">
                  {t.categorie}
                </span>
                <h3 className="mt-2 font-display font-semibold text-primary">{t.titre}</h3>
                <div className="mt-0.5 text-xs text-muted-foreground">{t.reference}</div>
                <p className="mt-2 flex-1 text-sm text-foreground/85">{t.resume}</p>
                <div className="mt-3 font-mono text-[11px] text-muted-foreground">{t.id}</div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title={
          <span className="flex items-center gap-2">
            <MapPin className="size-4" /> Stations maritimes et fluviales
          </span>
        }
        actions={
          <Link to="/carte" className="text-xs font-semibold text-primary hover:underline">
            Voir sur la carte 3D
          </Link>
        }
        className="mt-6"
        bodyClassName="p-0"
      >
        <ul className="stagger grid divide-y sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3">
          {STATIONS.map((s) => (
            <li key={s.code} className="border-b p-4 sm:border-r">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display font-semibold text-primary">{s.nom}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{s.code}</span>
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {s.type} · {s.province}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span className="inline-flex items-center gap-1">
                  <Radio className="size-3.5 text-secondary" /> VHF {s.vhf}
                </span>
                {s.contact && (
                  <a
                    href={`tel:${s.contact.replace(/\s/g, "")}`}
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    <Phone className="size-3.5" /> {s.contact}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </PublicShell>
  );
}
