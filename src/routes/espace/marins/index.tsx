import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { ChevronRight, Search, UserPlus, Users } from "lucide-react";
import { RequirePerm } from "@/components/dgmm/Guard";
import { EmptyState, PageHeader, Panel, inputClass, selectClass } from "@/components/dgmm/Page";
import { StatusPill } from "@/components/dgmm/Brand";
import { Button } from "@/components/ui/button";
import { can, type CertStatus } from "@/lib/dgmm/rules";
import {
  formatDate,
  fullName,
  marinCertStatus,
  useMarins,
  useVisites,
  type Etat,
} from "@/lib/dgmm/store";

type Statut = "tous" | Etat;
type Cert = "tous" | CertStatus;

interface Search {
  q?: string | undefined;
  statut?: Statut | undefined;
  cert?: Cert | undefined;
}

const STATUTS: Statut[] = ["tous", "en_attente", "validee", "rejetee"];
const CERTS: Cert[] = ["tous", "valide", "expire_bientot", "expire", "aucun"];

export const Route = createFileRoute("/espace/marins/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s["q"] === "string" && s["q"] ? s["q"] : undefined,
    statut:
      STATUTS.includes(s["statut"] as Statut) && s["statut"] !== "tous"
        ? (s["statut"] as Statut)
        : undefined,
    cert:
      CERTS.includes(s["cert"] as Cert) && s["cert"] !== "tous" ? (s["cert"] as Cert) : undefined,
  }),
  head: () => ({ meta: [{ title: "Gens de mer — GDM | DGMM" }] }),
  component: () => (
    <RequirePerm perm="marins">
      {(session) => <MarinsList canCreate={can(session.role, "marins.creer")} />}
    </RequirePerm>
  ),
});

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function MarinsList({ canCreate }: { canCreate: boolean }) {
  const { q = "", statut = "tous", cert = "tous" } = Route.useSearch();
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
            `${m.nom} ${m.prenom} ${m.nip} ${m.livret} ${m.profession} ${m.entreprise}`,
          ).includes(nq)
        )
          return false;
        if (statut !== "tous" && m.validationAdmin !== statut && m.validationMedicale !== statut)
          return false;
        if (cert !== "tous" && st !== cert) return false;
        return true;
      });
  }, [marins, visites, q, statut, cert]);

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
        <div className="grid gap-3 border-b p-4 sm:grid-cols-[1fr_200px_200px]">
          <label className="field-dgmm flex h-10 items-center gap-2 rounded-md bg-card px-3">
            <Search className="size-4 text-muted-foreground" />
            <span className="sr-only">Rechercher</span>
            <input
              value={q}
              onChange={(e) => set({ q: e.target.value || undefined })}
              placeholder="Nom, NIP, n° de livret, fonction…"
              className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
          <label>
            <span className="sr-only">Statut de validation</span>
            <select
              className={selectClass}
              value={statut}
              onChange={(e) =>
                set({ statut: e.target.value === "tous" ? undefined : (e.target.value as Statut) })
              }
            >
              <option value="tous">Toutes validations</option>
              <option value="en_attente">En attente</option>
              <option value="validee">Validées</option>
              <option value="rejetee">Rejetées</option>
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
                <tbody className="divide-y">
                  {rows.map(({ m, st }) => (
                    <tr
                      key={m.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() =>
                        navigate({ to: "/espace/marins/$id", params: { id: String(m.id) } })
                      }
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                            {m.nom[0]}
                            {m.prenom[0]}
                          </span>
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
            <ul className="divide-y md:hidden">
              {rows.map(({ m, st }) => (
                <li key={m.id}>
                  <Link
                    to="/espace/marins/$id"
                    params={{ id: String(m.id) }}
                    className="block px-4 py-3 hover:bg-muted/40"
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
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="border-t px-4 py-2.5 text-xs text-muted-foreground">
          {rows.length} résultat{rows.length > 1 ? "s" : ""} sur {marins.length}
        </div>
      </Panel>
    </>
  );
}
