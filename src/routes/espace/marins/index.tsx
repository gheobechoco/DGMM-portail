import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronRight, Search, UserPlus, Users } from "lucide-react";
import { RequirePerm } from "@/components/dgmm/Guard";
import { EmptyState, PageHeader, Panel, inputClass, selectClass } from "@/components/dgmm/Page";
import { StatusPill } from "@/components/dgmm/Brand";
import { MarinPhoto } from "@/components/dgmm/MarinBits";
import { MarinApercu } from "@/components/dgmm/MarinApercu";
import { ConformityGauge } from "@/components/dgmm/ConformityGauge";
import { CountUp } from "@/components/dgmm/Anim";
import { cn } from "@/lib/utils";
import { STATIONS, station as stationRef } from "@/lib/dgmm/maritime";
import type { Account } from "@/lib/dgmm/auth";
import { Button } from "@/components/ui/button";
import { can, type CertStatus } from "@/lib/dgmm/rules";
import {
  formatDate,
  fullName,
  marinCertStatus,
  niveauConformite,
  useMarins,
  useVisites,
  ENTREPRISES,
  type Etat,
} from "@/lib/dgmm/store";

type Statut = "tous" | Etat;
type Cert = "tous" | CertStatus;

interface Search {
  q?: string | undefined;
  admin?: Etat | undefined;
  medical?: Etat | undefined;
  cert?: Cert | undefined;
  armateur?: string | undefined;
  station?: string | undefined;
}

const STATUTS: Statut[] = ["tous", "en_attente", "validee", "rejetee"];
const CERTS: Cert[] = ["tous", "valide", "expire_bientot", "expire", "aucun"];

export const Route = createFileRoute("/espace/marins/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s["q"] === "string" && s["q"] ? s["q"] : undefined,
    admin:
      STATUTS.includes(s["admin"] as Statut) && s["admin"] !== "tous"
        ? (s["admin"] as Etat)
        : undefined,
    medical:
      STATUTS.includes(s["medical"] as Statut) && s["medical"] !== "tous"
        ? (s["medical"] as Etat)
        : undefined,
    armateur: typeof s["armateur"] === "string" && s["armateur"] ? s["armateur"] : undefined,
    station: typeof s["station"] === "string" && s["station"] ? s["station"] : undefined,
    cert:
      CERTS.includes(s["cert"] as Cert) && s["cert"] !== "tous" ? (s["cert"] as Cert) : undefined,
  }),
  head: () => ({ meta: [{ title: "Gens de mer — GDM | DGMM" }] }),
  component: () => (
    <RequirePerm perm="marins">
      {(session) => <MarinsList canCreate={can(session.role, "marins.creer")} session={session} />}
    </RequirePerm>
  ),
});

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function MarinsList({ canCreate, session }: { canCreate: boolean; session: Account }) {
  const [apercu, setApercu] = useState<number | null>(null);
  const { q = "", admin, medical, cert = "tous", armateur, station } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const marins = useMarins();
  const visites = useVisites();

  const rows = useMemo(() => {
    const nq = norm(q.trim());
    return marins
      .map((m) => ({ m, st: marinCertStatus(visites, m.id) }))
      .filter(({ m, st }) => {
        if (
          nq &&
          !norm(
            `${m.nom} ${m.prenom} ${m.nip} ${m.livret} ${m.profession} ${m.entreprise} ${stationRef(m.station)?.nom ?? ""}`,
          ).includes(nq)
        )
          return false;
        if (admin && m.validationAdmin !== admin) return false;
        if (medical && m.validationMedicale !== medical) return false;
        if (armateur && m.entreprise !== armateur) return false;
        if (station && m.station !== station) return false;
        if (cert !== "tous" && st !== cert) return false;
        return true;
      });
  }, [marins, visites, q, admin, medical, cert, armateur, station]);
  const filtered = !!(q || admin || medical || armateur || station || cert !== "tous");

  const set = (patch: Partial<Search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

  return (
    <>
      <PageHeader
        eyebrow="Gestion des gens de mer"
        title="Gens de mer"
        subtitle={`${marins.length} marins enregistrés · enrôlement, validations et aptitude médicale.`}
        actions={
          canCreate && (
            <Button asChild variant="gold">
              <Link to="/espace/marins/nouveau">
                <UserPlus /> Nouveau marin
              </Link>
            </Button>
          )
        }
      />

      <Panel bodyClassName="p-0">
        <div className="border-b px-4 py-3">
          <ConformityGauge
            compact
            sujet="de la sélection"
            niveaux={rows.map(({ m }) => niveauConformite(m, visites))}
          />
        </div>
        <div className="grid gap-3 border-b p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(200px,1fr)_repeat(5,150px)]">
          <label className="field-dgmm flex h-10 items-center gap-2 rounded-md bg-card px-3">
            <Search className="size-4 text-muted-foreground" />
            <span className="sr-only">Rechercher</span>
            <input
              value={q}
              onChange={(e) => set({ q: e.target.value || undefined })}
              placeholder="NIP, nom, prénom, métier, armateur…"
              className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
          <label>
            <span className="sr-only">Validation administrative</span>
            <select
              className={selectClass}
              value={admin ?? "tous"}
              onChange={(e) =>
                set({ admin: e.target.value === "tous" ? undefined : (e.target.value as Etat) })
              }
            >
              <option value="tous">Administratif : tous</option>
              <option value="en_attente">Admin. en attente</option>
              <option value="validee">Admin. validé</option>
              <option value="rejetee">Admin. rejeté</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Statut médical</span>
            <select
              className={selectClass}
              value={medical ?? "tous"}
              onChange={(e) =>
                set({ medical: e.target.value === "tous" ? undefined : (e.target.value as Etat) })
              }
            >
              <option value="tous">Médical : tous</option>
              <option value="en_attente">Visite en attente</option>
              <option value="validee">Apte</option>
              <option value="rejetee">Inapte</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Certificat médical</span>
            <select
              className={selectClass}
              value={cert}
              onChange={(e) =>
                set({ cert: e.target.value === "tous" ? undefined : (e.target.value as Cert) })
              }
            >
              <option value="tous">Tous certificats</option>
              <option value="valide">Certificat valide</option>
              <option value="expire_bientot">À renouveler</option>
              <option value="expire">Expiré</option>
              <option value="aucun">Sans certificat</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Armateur</span>
            <select
              className={selectClass}
              value={armateur ?? ""}
              onChange={(e) => set({ armateur: e.target.value || undefined })}
            >
              <option value="">Tous armateurs</option>
              {ENTREPRISES.map((e) => (
                <option key={e}>{e}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Station maritime</span>
            <select
              className={selectClass}
              value={station ?? ""}
              onChange={(e) => set({ station: e.target.value || undefined })}
            >
              <option value="">Toutes stations</option>
              {STATIONS.map((st) => (
                <option key={st.code} value={st.code}>
                  {st.ville}
                </option>
              ))}
            </select>
          </label>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={Users} title="Aucun marin trouvé">
            Modifiez la recherche ou les filtres.
          </EmptyState>
        ) : (
          <>
            {/* Tableau (écrans larges) */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Marin</th>
                    <th className="px-3 py-2.5 font-semibold">NIP</th>
                    <th className="px-3 py-2.5 font-semibold">Fonction</th>
                    <th className="px-3 py-2.5 font-semibold">Admin.</th>
                    <th className="px-3 py-2.5 font-semibold">Médical</th>
                    <th className="px-3 py-2.5 font-semibold">Certificat</th>
                    <th className="px-3 py-2.5 font-semibold">Livret</th>
                    <th className="px-3 py-2.5 font-semibold">Inscrit le</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="stagger divide-y">
                  {rows.map(({ m, st }) => (
                    <tr
                      key={m.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/40",
                        (st === "expire" || m.validationMedicale === "rejetee") && "glow-alert",
                      )}
                      onClick={() => setApercu(m.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setApercu(m.id);
                        }
                      }}
                      tabIndex={0}
                      aria-label={`Aperçu de ${fullName(m)}`}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <MarinPhoto m={m} className="size-8 shrink-0 rounded-full text-xs" />
                          <div className="min-w-0">
                            <Link
                              to="/espace/marins/$id"
                              params={{ id: String(m.id) }}
                              className="block truncate font-semibold text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {fullName(m)}
                            </Link>
                            <div className="truncate text-xs text-muted-foreground">
                              {m.entreprise}
                              {m.station && ` · ${stationRef(m.station)?.ville ?? m.station}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">{m.nip}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{m.profession}</td>
                      <td className="px-3 py-2.5">
                        <StatusPill status={m.validationAdmin} />
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusPill status={m.validationMedicale} />
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusPill status={st} />
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">
                        {m.livret || <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground">
                        {formatDate(m.creeLe)}
                      </td>
                      <td className="pr-3">
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cartes (mobile) */}
            <ul className="stagger divide-y md:hidden">
              {rows.map(({ m, st }) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setApercu(m.id)}
                    className="block w-full px-4 py-3 text-left hover:bg-muted/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold text-primary">{fullName(m)}</span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {m.profession} · <span className="font-mono">{m.nip}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <StatusPill
                        status={m.validationAdmin}
                        label={`Admin. : ${m.validationAdmin === "validee" ? "validé" : m.validationAdmin === "rejetee" ? "rejeté" : "en attente"}`}
                      />
                      <StatusPill
                        status={m.validationMedicale}
                        label={`Médical : ${m.validationMedicale === "validee" ? "apte" : m.validationMedicale === "rejetee" ? "inapte" : "en attente"}`}
                      />
                      <StatusPill status={st} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="flex items-center justify-between border-t px-4 py-2.5 text-xs text-muted-foreground">
          <span>
            <CountUp value={rows.length} /> résultat{rows.length > 1 ? "s" : ""} sur {marins.length}
          </span>
          {filtered && (
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={() => navigate({ search: {}, replace: true })}
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      </Panel>
      <MarinApercu id={apercu} onClose={() => setApercu(null)} session={session} />
    </>
  );
}
