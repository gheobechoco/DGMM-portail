import { Pagination, usePagination } from "@/components/dgmm/Listes";
import { Aide } from "@/components/dgmm/Aide";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { ChevronRight, FilePlus2, Search, Stethoscope } from "lucide-react";
import { RequirePerm } from "@/components/dgmm/Guard";
import { EmptyState, PageHeader, Panel, StatCard, selectClass } from "@/components/dgmm/Page";
import { StatusPill } from "@/components/dgmm/Brand";
import { Button } from "@/components/ui/button";
import { can, certificateStatus } from "@/lib/dgmm/rules";
import { EtatCertificatPill } from "@/components/dgmm/MarinBits";
import {
  VERDICT_LABELS,
  etatCertificat,
  formatDate,
  fullName,
  useMarins,
  useVisites,
} from "@/lib/dgmm/store";
import { CalendarClock, FileClock, ShieldCheck } from "lucide-react";
import { SectionStatistiques, TableauClinique, LienStatistiques } from "@/components/dgmm/Statistiques";

type Etat = "tous" | "brouillon" | "signee";
interface Search {
  q?: string | undefined;
  etat?: Etat | undefined;
}

export const Route = createFileRoute("/espace/visites/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s["q"] === "string" && s["q"] ? s["q"] : undefined,
    etat: s["etat"] === "brouillon" || s["etat"] === "signee" ? s["etat"] : undefined,
  }),
  head: () => ({ meta: [{ title: "Visites médicales — GDM | DGMM" }] }),
  component: () => (
    <RequirePerm perm="visites">
      {(s) => <VisitesList canSaisir={can(s.role, "visites.saisir")} />}
    </RequirePerm>
  ),
});

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function VisitesList({ canSaisir }: { canSaisir: boolean }) {
  const { q = "", etat = "tous" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const visites = useVisites();
  const marins = useMarins();
  const byId = useMemo(() => new Map(marins.map((m) => [m.id, m])), [marins]);

  const rows = useMemo(() => {
    const nq = norm(q.trim());
    return [...visites]
      .sort((a, b) => b.creeLe.localeCompare(a.creeLe))
      .filter((v) => {
        if (etat === "brouillon" && v.signee) return false;
        if (etat === "signee" && !v.signee) return false;
        if (nq) {
          const m = byId.get(v.marinId);
          if (!norm(`${v.numero} ${fullName(m)} ${m?.nip ?? ""} ${v.praticien}`).includes(nq))
            return false;
        }
        return true;
      });
  }, [visites, byId, q, etat]);
  const pg = usePagination(rows, 10);

  const brouillons = visites.filter((v) => !v.signee).length;
  const aRenouveler = visites.filter(
    (v) => v.signee && !v.revoquee && certificateStatus(v.stcw.validJusquau) === "expire_bientot",
  ).length;
  const enAttente = marins.filter(
    (m) => m.validationAdmin !== "rejetee" && m.validationMedicale === "en_attente",
  ).length;
  const set = (p: Partial<Search>) =>
    navigate({ search: (prev) => ({ ...prev, ...p }), replace: true });

  return (
    <>
      <PageHeader
        eyebrow="Médecine des gens de mer"
        title="Visites médicales"
        aides={["stcw", "aptitude", "agrement"]}
        stats={<LienStatistiques theme="medical" texte="Visites, échéances, synthèse clinique et répartition des verdicts" />}
        actions={
          canSaisir && (
            <Button asChild variant="gold">
              <Link to="/espace/visites/nouvelle">
                <FilePlus2 /> Nouvelle visite
              </Link>
            </Button>
          )
        }
      />


      <Panel bodyClassName="p-0">
        <div className="grid gap-3 border-b p-4 sm:grid-cols-[1fr_220px]">
          <label className="field-dgmm flex h-10 items-center gap-2 rounded-md bg-card px-3">
            <Search className="size-4 text-muted-foreground" />
            <span className="sr-only">Rechercher</span>
            <input
              value={q}
              onChange={(e) => set({ q: e.target.value || undefined })}
              placeholder="N° de visite, marin, NIP, praticien…"
              className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
          <label>
            <span className="sr-only">État</span>
            <select
              className={selectClass}
              value={etat}
              onChange={(e) =>
                set({ etat: e.target.value === "tous" ? undefined : (e.target.value as Etat) })
              }
            >
              <option value="tous">Toutes les visites</option>
              <option value="brouillon">Brouillons</option>
              <option value="signee">Certificats signés</option>
            </select>
          </label>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Aucune visite trouvée" />
        ) : (
          <ul className="stagger divide-y">
            {pg.visibles.map((v) => {
              const m = byId.get(v.marinId);
              return (
                <li key={v.id}>
                  <Link
                    to="/espace/visites/$id"
                    params={{ id: String(v.id) }}
                    className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-muted/40 md:grid-cols-[150px_1fr_160px_150px_130px_16px]"
                  >
                    <span className="font-mono text-xs font-semibold text-primary">{v.numero}</span>
                    <span className="min-w-0 md:order-none">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {fullName(m)}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {v.praticien} · {formatDate(v.creeLe)}
                      </span>
                    </span>
                    <span className="text-sm">
                      {v.stcw.verdict ? VERDICT_LABELS[v.stcw.verdict] : "—"}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {v.stcw.validJusquau ? `→ ${formatDate(v.stcw.validJusquau)}` : ""}
                    </span>
                    <span>
                      <EtatCertificatPill etat={etatCertificat(v)} />
                    </span>
                    <ChevronRight className="hidden size-4 text-muted-foreground md:block" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <Pagination {...pg} />
        <div className="border-t px-4 py-2.5 text-xs text-muted-foreground">
          {rows.length} visite{rows.length > 1 ? "s" : ""}
        </div>
      </Panel>
    </>
  );
}
